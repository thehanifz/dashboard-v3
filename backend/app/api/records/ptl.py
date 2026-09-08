"""
records/ptl.py
Endpoint PTL:
  GET  /records/ptl-sheet              → baca GSheet milik PTL sendiri
  POST /records/ptl-sheet/{row_id}/cells → update cell ke GSheet PTL
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.models import User
from app.db.database import get_db
from app.services.sync_engine import read_ptl_sheet

from ._shared import _sanitize, _extract_spreadsheet_id, _enrich_updates_with_opsi, _write_sync_log

from app.services.sheet_writer import update_cells_external, read_external_row_context

logger = logging.getLogger(__name__)
router = APIRouter()


class GeneralUpdatePayload(BaseModel):
    updates: dict[str, str]


@router.get("/ptl-sheet")
async def get_ptl_own_sheet(
    current_user: User = Depends(require_role("ptl")),
):
    """
    PTL fetch data dari GSheet milik mereka sendiri.
    Kalau belum set gsheet_url → return flag no_gsheet=True.
    """
    if not current_user.gsheet_url:
        return {"no_gsheet": True, "columns": [], "records": []}

    try:
        data = read_ptl_sheet(
            current_user.gsheet_url,
            current_user.gsheet_sheet_name,
        )
        return {**data, "no_gsheet": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal baca GSheet PTL: {str(e)}")


@router.post("/ptl-sheet/{row_id}/cells")
async def update_ptl_own_sheet(
    row_id: int,
    payload: GeneralUpdatePayload,
    current_user: User = Depends(require_role("ptl")),
    db: AsyncSession = Depends(get_db),
):
    """
    PTL update cell → tulis ke GSheet PTL milik mereka.
    Sync engine yang akan push ke GSheet Engineer.
    """
    if row_id < 2:
        raise HTTPException(status_code=400, detail="row_id harus >= 2")

    if not current_user.gsheet_url:
        raise HTTPException(status_code=400, detail="GSheet PTL belum dikonfigurasi")

    spreadsheet_id = _extract_spreadsheet_id(current_user.gsheet_url)
    if not spreadsheet_id:
        raise HTTPException(status_code=400, detail="URL GSheet PTL tidak valid")

    # Baca hanya header + target row. Jangan membaca seluruh GSheet saat save.
    try:
        headers, row_data = read_external_row_context(
            spreadsheet_id,
            current_user.gsheet_sheet_name or "Sheet1",
            row_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal baca row GSheet PTL: {e}")

    sheet_name = current_user.gsheet_sheet_name or "Sheet1"

    # Sanitasi nilai
    sanitized = {k: _sanitize(str(v)) for k, v in payload.updates.items()}

    # Auto-enrich Status PA + Kategori PA
    if "Status Pekerjaan" in sanitized:
        sanitized = _enrich_updates_with_opsi(sanitized, sanitized["Status Pekerjaan"])

    # Aging dikelola oleh formula di GSheet, bukan dihitung di frontend.
    # Jika cell Aging kosong, pasang formula untuk row ini. Jika sudah berisi
    # formula atau nilai lain, jangan ditimpa.
    aging_col = next((h for h in headers if h.strip().lower() == "aging"), None)
    if aging_col:
        aging_value = str(row_data.get(aging_col, "") or "")
        if not aging_value.strip():
            sanitized[aging_col] = (
                f'=IF(AR{row_id}="Done BAI";AU{row_id}-K{row_id};NOW()-K{row_id})'
            )

    # Skip kolom yang tidak ada di header GSheet PTL
    if headers:
        sanitized = {k: v for k, v in sanitized.items() if k in headers}
        if not sanitized:
            return {"ok": True, "row_id": row_id, "updated": []}

    # Tulis ke GSheet PTL
    try:
        update_cells_external(
            spreadsheet_id=spreadsheet_id,
            sheet_name=sheet_name,
            row_id=row_id,
            updates=sanitized,
            headers=headers,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal update GSheet PTL: {e}")

    # Catat sync_log. Semua log dalam request memakai satu DB commit.
    id_pa = row_data.get("ID PA", str(row_id)) or str(row_id)
    for field, new_val in sanitized.items():
        await _write_sync_log(
            db,
            ptl_user_id=current_user.id,
            id_pa=id_pa,
            field_changed=field,
            old_value=row_data.get(field),
            new_value=new_val,
            sync_type="ptl_own_sheet",
            synced_by=current_user.username,
            commit=False,
        )
    await db.commit()

    return {"ok": True, "row_id": row_id, "updated": list(sanitized.keys())}
