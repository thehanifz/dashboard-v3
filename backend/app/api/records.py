"""
records.py
Phase 2 + Phase 4 + Phase 7 (bugfix) + PTL GSheet own data:
- Engineer: semua data
- PTL: baca dari GSheet sendiri (/ptl-sheet), update tulis ke GSheet PTL
- Mitra: filter by MITRA_COLUMN_NAME, update dengan validasi role_table_config DB
- Auto update Status PA + Kategori PA saat Status Pekerjaan diupdate
"""
import json
import re
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_role
from app.core.config import (
    PTL_COL_TERMINATING, PTL_COL_ORIGINATING,
    MITRA_COLUMN_NAME,
    PTL_EDITABLE_COLUMNS, MITRA_EDITABLE_WHITELIST,
)
from app.db.models import User, SyncLog
from app.db.database import get_db
from app.services.sheet_reader import read_sheet
from app.services.sheet_writer import update_cells, update_cells_external
from app.services.status_reader import read_status_master
from app.services.role_config_service import get_config
from app.services.sync_engine import read_ptl_sheet
from app.services.opsi_reader import get_opsi_mapping

logger = logging.getLogger(__name__)

router = APIRouter(tags=["records"])

FORMULA_PREFIXES = ("=", "+", "-", "@")


def _sanitize(value: str) -> str:
    """Sanitasi formula injection."""
    if value and value[0] in FORMULA_PREFIXES:
        return "'" + value
    return value


def _extract_spreadsheet_id(url: str):
    match = re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", url)
    return match.group(1) if match else None


def _enrich_updates_with_opsi(updates: dict, status: str) -> dict:
    """
    Lookup sheet Opsi berdasarkan Status Pekerjaan,
    tambahkan Status PA dan Kategori PA ke updates jika ditemukan.
    Jika gagal baca Opsi, log warning dan lanjut tanpa error
    agar update Status Pekerjaan tetap berhasil.
    """
    try:
        mapping = get_opsi_mapping()
        if status in mapping:
            opsi = mapping[status]
            if opsi.get("Status PA"):
                updates["Status PA"] = opsi["Status PA"]
            if opsi.get("Kategori PA"):
                updates["Kategori PA"] = opsi["Kategori PA"]
            logger.info(
                f"[opsi] '{status}' → Status PA='{opsi.get('Status PA')}', "
                f"Kategori PA='{opsi.get('Kategori PA')}'"
            )
        else:
            logger.warning(f"[opsi] Status Pekerjaan '{status}' tidak ditemukan di sheet Opsi")
    except Exception as e:
        logger.warning(f"[opsi] Gagal baca sheet Opsi: {e} — Status PA & Kategori PA tidak diupdate")
    return updates


class StatusUpdatePayload(BaseModel):
    status: str
    detail: str | None = None


class GeneralUpdatePayload(BaseModel):
    updates: dict[str, str]


def _filter_records_engineer(sheet_data: dict, user: User) -> dict:
    """Filter data Engineer untuk role Mitra (PTL sudah pakai GSheet sendiri)."""
    role = user.role.value
    if role == "engineer":
        return sheet_data
    records = sheet_data.get("records", [])
    nama = user.nama_lengkap.strip().lower()
    if role == "mitra":
        filtered = [r for r in records if r["data"].get(MITRA_COLUMN_NAME, "").strip().lower() == nama]
    else:
        filtered = records
    return {**sheet_data, "records": filtered}


async def _write_sync_log(
    db: AsyncSession,
    *,
    ptl_user_id,
    id_pa: str,
    field_changed: str,
    old_value: str | None,
    new_value: str | None,
    sync_type: str,
    synced_by: str | None = None,
):
    log = SyncLog(
        ptl_user_id=ptl_user_id,
        id_pa=id_pa,
        field_changed=field_changed,
        old_value=old_value,
        new_value=new_value,
        sync_type=sync_type,
        synced_by=synced_by,
    )
    db.add(log)
    await db.commit()


# ── GET /records/ptl-sheet — PTL baca GSheet milik sendiri ───────────────────
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
        raise HTTPException(
            status_code=500,
            detail=f"Gagal baca GSheet PTL: {str(e)}",
        )


# ── POST /records/ptl-sheet/{row_id}/cells — PTL update ke GSheet sendiri ────
@router.post("/ptl-sheet/{row_id}/cells")
async def update_ptl_own_sheet(
    row_id: int,
    payload: GeneralUpdatePayload,
    current_user: User = Depends(require_role("ptl")),
    db: AsyncSession = Depends(get_db),
):
    """
    PTL update cell → tulis ke GSheet PTL milik mereka.
    Sync engine nanti yang push ke GSheet Engineer.
    """
    if row_id < 2:
        raise HTTPException(status_code=400, detail="row_id harus >= 2")

    if not current_user.gsheet_url:
        raise HTTPException(status_code=400, detail="GSheet PTL belum dikonfigurasi")

    spreadsheet_id = _extract_spreadsheet_id(current_user.gsheet_url)
    if not spreadsheet_id:
        raise HTTPException(status_code=400, detail="URL GSheet PTL tidak valid")

    # Validasi whitelist kolom
    invalid_cols = [c for c in payload.updates if c not in PTL_EDITABLE_COLUMNS]
    if invalid_cols:
        raise HTTPException(
            status_code=403,
            detail=f"PTL tidak diizinkan edit kolom: {invalid_cols}. "
                   f"Kolom yang boleh: {list(PTL_EDITABLE_COLUMNS)}",
        )

    # Baca sheet PTL untuk dapat headers + data existing
    try:
        ptl_data = read_ptl_sheet(
            current_user.gsheet_url,
            current_user.gsheet_sheet_name,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal baca GSheet PTL: {e}")

    headers    = ptl_data.get("columns", [])
    sheet_name = current_user.gsheet_sheet_name or (
        ptl_data.get("sheet_name", "Sheet1")
    )

    # Validasi kolom exist di sheet
    if headers:
        invalid = [c for c in payload.updates if c not in headers]
        if invalid:
            raise HTTPException(status_code=400, detail=f"Kolom tidak ada di GSheet PTL: {invalid}")

    # Sanitasi nilai
    sanitized = {k: _sanitize(str(v)) for k, v in payload.updates.items()}

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

    # Catat sync_log
    record = next((r for r in ptl_data["records"] if r["row_id"] == row_id), None)
    id_pa  = record["data"].get("ID PA", str(row_id)) if record else str(row_id)

    for field, new_val in sanitized.items():
        old_val = record["data"].get(field) if record else None
        await _write_sync_log(
            db,
            ptl_user_id=current_user.id,
            id_pa=id_pa,
            field_changed=field,
            old_value=old_val,
            new_value=new_val,
            sync_type="ptl_own_sheet",
            synced_by=current_user.username,
        )

    return {"ok": True, "row_id": row_id, "updated": list(sanitized.keys())}


# ── GET /records — Engineer + Mitra (PTL sudah pakai /ptl-sheet) ──────────────
@router.get("")
def get_records(current_user: User = Depends(require_role("engineer", "mitra"))):
    sheet_data = read_sheet()
    return _filter_records_engineer(sheet_data, current_user)


# ── POST /records/by-id/{record_id}/status ────────────────────────────────────
@router.post("/by-id/{record_id}/status")
def update_record_status_by_id(
    record_id: str,
    payload: StatusUpdatePayload,
    current_user: User = Depends(require_role("engineer", "mitra")),
):
    sheet_data = read_sheet()
    filtered   = _filter_records_engineer(sheet_data, current_user)
    record     = next((r for r in filtered["records"] if r["id"] == record_id), None)

    if not record:
        raise HTTPException(status_code=404, detail=f"Record '{record_id}' tidak ditemukan")

    row_id = record["row_id"]
    master = read_status_master()
    status = payload.status.strip()
    detail = (payload.detail or "").strip()

    if status not in master["mapping"]:
        raise HTTPException(status_code=400, detail=f"Status '{status}' tidak valid")
    if detail and detail not in master["mapping"][status]:
        raise HTTPException(status_code=400, detail=f"Detail '{detail}' tidak valid")

    updates = {master["status_column"]: status}
    if detail:
        updates[master["detail_column"]] = detail

    # Auto-update Status PA + Kategori PA dari sheet Opsi
    updates = _enrich_updates_with_opsi(updates, status)

    update_cells(row_id=row_id, updates=updates)
    return {"ok": True, "record_id": record_id, "row_id": row_id, "status": status, "detail": detail or "-"}


# ── POST /records/{row_id}/status ─────────────────────────────────────────────
@router.post("/{row_id}/status")
def update_record_status(
    row_id: int,
    payload: StatusUpdatePayload,
    current_user: User = Depends(require_role("engineer", "mitra")),
):
    if row_id < 2:
        raise HTTPException(status_code=400, detail="row_id harus >= 2")

    role = current_user.role.value
    if role == "mitra":
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

    # Auto-update Status PA + Kategori PA dari sheet Opsi
    updates = _enrich_updates_with_opsi(updates, status)

    update_cells(row_id=row_id, updates=updates)
    return {"ok": True, "row_id": row_id, "status": status, "detail": detail or "-"}


# ── POST /records/{row_id}/cells — Engineer + Mitra ──────────────────────────
@router.post("/{row_id}/cells")
async def update_record_cells(
    row_id: int,
    payload: GeneralUpdatePayload,
    current_user: User = Depends(require_role("engineer", "mitra")),
    db: AsyncSession = Depends(get_db),
):
    if row_id < 2:
        raise HTTPException(status_code=400, detail="row_id harus >= 2")

    role = current_user.role.value

    if role == "mitra":
        # Double-check: whitelist dev DAN editable_columns dari DB
        mitra_config     = await get_config(db, "mitra")
        db_editable      = set(mitra_config.editable_columns) if mitra_config else set()
        allowed_mitra_cols = MITRA_EDITABLE_WHITELIST & db_editable
        invalid_cols = [c for c in payload.updates if c not in allowed_mitra_cols]
        if invalid_cols:
            raise HTTPException(
                status_code=403,
                detail=f"Mitra tidak diizinkan edit kolom: {invalid_cols}.",
            )

    # Validasi ownership Mitra
    sheet_data = read_sheet()
    record = next((r for r in sheet_data["records"] if r["row_id"] == row_id), None)

    if role == "mitra" and record:
        owner = record["data"].get(MITRA_COLUMN_NAME, "").strip().lower()
        if owner != current_user.nama_lengkap.strip().lower():
            raise HTTPException(status_code=403, detail="Akses ditolak — bukan data milikmu")

    if sheet_data["columns"]:
        invalid = [col for col in payload.updates if col not in sheet_data["columns"]]
        if invalid:
            raise HTTPException(status_code=400, detail=f"Kolom tidak valid: {invalid}")

    update_cells(row_id=row_id, updates=payload.updates)

    # Catat sync_log Mitra
    if role == "mitra" and record:
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