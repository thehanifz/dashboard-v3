"""
records/mitra.py
Endpoint Mitra:
  GET  /records/                → baca GSheet (filter by nama mitra)
  POST /records/{row_id}/status → update status (validasi ownership)
  POST /records/{row_id}/cells  → update cell (validasi whitelist + ownership)
"""
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.core.config import MITRA_COLUMN_NAME, MITRA_EDITABLE_WHITELIST
from app.db.models import User
from app.db.database import get_db
from app.services.sheet_reader import read_sheet
from app.services.sheet_writer import update_cells
from app.services.status_reader import read_status_master
from app.services.role_config_service import get_config

from ._shared import _enrich_updates_with_opsi, _write_sync_log

logger = logging.getLogger(__name__)
router = APIRouter()


class StatusUpdatePayload(BaseModel):
    status: str
    detail: str | None = None


class GeneralUpdatePayload(BaseModel):
    updates: dict[str, str]


def _filter_mitra(sheet_data: dict, user: User) -> dict:
    """Filter records GSheet hanya milik mitra yang sedang login."""
    records = sheet_data.get("records", [])
    nama    = user.nama_lengkap.strip().lower()
    filtered = [r for r in records if r["data"].get(MITRA_COLUMN_NAME, "").strip().lower() == nama]
    return {**sheet_data, "records": filtered}


@router.get("/")
async def get_records_mitra(
    current_user: User = Depends(require_role("mitra")),
):
    """Mitra: baca data dari GSheet, filter by nama mitra."""
    sheet_data = read_sheet()
    return _filter_mitra(sheet_data, current_user)


@router.post("/{row_id}/status")
async def update_status_mitra(
    row_id: int,
    payload: StatusUpdatePayload,
    current_user: User = Depends(require_role("mitra")),
    db: AsyncSession = Depends(get_db),
):
    """Update status by row_id (Mitra) — validasi ownership."""
    if row_id < 2:
        raise HTTPException(status_code=400, detail="row_id harus >= 2")

    sheet_data = read_sheet()
    record = next((r for r in sheet_data["records"] if r["row_id"] == row_id), None)
    if record:
        owner = record["data"].get(MITRA_COLUMN_NAME, "").strip().lower()
        if owner != current_user.nama_lengkap.strip().lower():
            raise HTTPException(status_code=403, detail="Akses ditolak — bukan data milikmu")

    if payload.detail and payload.detail.startswith("{"):
        try:
            updates = json.loads(payload.detail)
            if isinstance(updates, dict):
                update_cells(row_id=row_id, updates=updates)
                return {"ok": True, "row_id": row_id, "updates": updates}
        except json.JSONDecodeError:
            pass

    master = read_status_master()
    status = payload.status.strip()
    detail = (payload.detail or "").strip()

    if status not in master["mapping"]:
        raise HTTPException(status_code=400, detail=f"Status '{status}' tidak valid")
    if detail and detail not in master["mapping"][status]:
        raise HTTPException(status_code=400, detail=f"Detail '{detail}' tidak valid untuk status '{status}'")

    updates = {master["status_column"]: status}
    if detail:
        updates[master["detail_column"]] = detail
    updates = _enrich_updates_with_opsi(updates, status)
    update_cells(row_id=row_id, updates=updates)

    return {"ok": True, "row_id": row_id, "status": status, "detail": detail or "-"}


@router.post("/{row_id}/cells")
async def update_cells_mitra(
    row_id: int,
    payload: GeneralUpdatePayload,
    current_user: User = Depends(require_role("mitra")),
    db: AsyncSession = Depends(get_db),
):
    """Update cell(s) Mitra — validasi whitelist kolom + ownership."""
    if row_id < 2:
        raise HTTPException(status_code=400, detail="row_id harus >= 2")

    mitra_config       = await get_config(db, "mitra")
    db_editable        = set(mitra_config.editable_columns) if mitra_config else set()
    allowed_mitra_cols = MITRA_EDITABLE_WHITELIST & db_editable
    invalid_cols = [c for c in payload.updates if c not in allowed_mitra_cols]
    if invalid_cols:
        raise HTTPException(
            status_code=403,
            detail=f"Mitra tidak diizinkan edit kolom: {invalid_cols}.",
        )

    sheet_data = read_sheet()
    record = next((r for r in sheet_data["records"] if r["row_id"] == row_id), None)
    if record:
        owner = record["data"].get(MITRA_COLUMN_NAME, "").strip().lower()
        if owner != current_user.nama_lengkap.strip().lower():
            raise HTTPException(status_code=403, detail="Akses ditolak — bukan data milikmu")

    if sheet_data["columns"]:
        invalid = [col for col in payload.updates if col not in sheet_data["columns"]]
        if invalid:
            raise HTTPException(status_code=400, detail=f"Kolom tidak valid: {invalid}")

    update_cells(row_id=row_id, updates=payload.updates)

    if record:
        id_pa = record["data"].get("ID PA", str(row_id))
        for field, new_val in payload.updates.items():
            old_val = record["data"].get(field)
            await _write_sync_log(
                db,
                ptl_user_id=None,
                id_pa=id_pa,
                field_changed=field,
                old_value=old_val,
                new_value=new_val,
                sync_type="mitra_update",
                synced_by=current_user.username,
            )

    return {"ok": True, "row_id": row_id, "updated": list(payload.updates.keys())}
