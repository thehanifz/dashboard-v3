"""
records.py
Phase 2 + Phase 4:
- Filter data per role
- PTL editable columns whitelist + sync_log
- Mitra editable whitelist (Phase 7)
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert

from app.core.deps import get_current_user, require_role
from app.core.config import (
    PTL_COLUMN_NAME, MITRA_COLUMN_NAME,
    PTL_EDITABLE_COLUMNS, MITRA_EDITABLE_WHITELIST,
)
from app.db.models import User, SyncLog
from app.db.database import get_db
from app.services.sheet_reader import read_sheet
from app.services.sheet_writer import update_cells
from app.services.status_reader import read_status_master

router = APIRouter(tags=["records"])


class StatusUpdatePayload(BaseModel):
    status: str
    detail: str | None = None


class GeneralUpdatePayload(BaseModel):
    updates: dict[str, str]


def _filter_records(sheet_data: dict, user: User) -> dict:
    role = user.role.value
    if role == "engineer":
        return sheet_data
    records = sheet_data.get("records", [])
    nama = user.nama_lengkap.strip().lower()
    if role == "ptl":
        filtered = [r for r in records if r["data"].get(PTL_COLUMN_NAME, "").strip().lower() == nama]
    elif role == "mitra":
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


# ── GET /records ──────────────────────────────────────────────────────────────
@router.get("")
def get_records(current_user: User = Depends(require_role("engineer", "ptl", "mitra"))):
    sheet_data = read_sheet()
    return _filter_records(sheet_data, current_user)


# ── POST /records/by-id/{record_id}/status ────────────────────────────────────
@router.post("/by-id/{record_id}/status")
def update_record_status_by_id(
    record_id: str,
    payload: StatusUpdatePayload,
    current_user: User = Depends(require_role("engineer", "ptl", "mitra")),
):
    sheet_data = read_sheet()
    filtered   = _filter_records(sheet_data, current_user)
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

    update_cells(row_id=row_id, updates=updates)
    return {"ok": True, "record_id": record_id, "row_id": row_id, "status": status, "detail": detail or "-"}


# ── POST /records/{row_id}/status ─────────────────────────────────────────────
@router.post("/{row_id}/status")
def update_record_status(
    row_id: int,
    payload: StatusUpdatePayload,
    current_user: User = Depends(require_role("engineer", "ptl", "mitra")),
):
    if row_id < 2:
        raise HTTPException(status_code=400, detail="row_id harus >= 2")

    role = current_user.role.value
    if role in ("ptl", "mitra"):
        sheet_data = read_sheet()
        record = next((r for r in sheet_data["records"] if r["row_id"] == row_id), None)
        if record:
            col = PTL_COLUMN_NAME if role == "ptl" else MITRA_COLUMN_NAME
            owner = record["data"].get(col, "").strip().lower()
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

    update_cells(row_id=row_id, updates=updates)
    return {"ok": True, "row_id": row_id, "status": status, "detail": detail or "-"}


# ── POST /records/{row_id}/cells ──────────────────────────────────────────────
@router.post("/{row_id}/cells")
async def update_record_cells(
    row_id: int,
    payload: GeneralUpdatePayload,
    current_user: User = Depends(require_role("engineer", "ptl", "mitra")),
    db: AsyncSession = Depends(get_db),
):
    if row_id < 2:
        raise HTTPException(status_code=400, detail="row_id harus >= 2")

    role = current_user.role.value

    # ── Validasi whitelist kolom per role ─────────────────────────────────────
    if role == "ptl":
        invalid_cols = [c for c in payload.updates if c not in PTL_EDITABLE_COLUMNS]
        if invalid_cols:
            raise HTTPException(
                status_code=403,
                detail=f"PTL tidak diizinkan edit kolom: {invalid_cols}. "
                       f"Kolom yang boleh: {list(PTL_EDITABLE_COLUMNS)}",
            )
    elif role == "mitra":
        invalid_cols = [c for c in payload.updates if c not in MITRA_EDITABLE_WHITELIST]
        if invalid_cols:
            raise HTTPException(
                status_code=403,
                detail=f"Mitra tidak diizinkan edit kolom: {invalid_cols}.",
            )

    # ── Validasi ownership baris ──────────────────────────────────────────────
    sheet_data = read_sheet()
    record = next((r for r in sheet_data["records"] if r["row_id"] == row_id), None)

    if role in ("ptl", "mitra") and record:
        col   = PTL_COLUMN_NAME if role == "ptl" else MITRA_COLUMN_NAME
        owner = record["data"].get(col, "").strip().lower()
        if owner != current_user.nama_lengkap.strip().lower():
            raise HTTPException(status_code=403, detail="Akses ditolak — bukan data milikmu")

    # ── Validasi kolom exist di sheet ─────────────────────────────────────────
    if sheet_data["columns"]:
        invalid = [col for col in payload.updates if col not in sheet_data["columns"]]
        if invalid:
            raise HTTPException(
                status_code=400,
                detail=f"Kolom tidak valid: {invalid}",
            )

    # ── Tulis ke GSheet ───────────────────────────────────────────────────────
    update_cells(row_id=row_id, updates=payload.updates)

    # ── Catat sync_log untuk PTL ──────────────────────────────────────────────
    if role == "ptl" and record:
        id_pa = record["data"].get("ID PA", str(row_id))
        for field, new_val in payload.updates.items():
            old_val = record["data"].get(field)
            await _write_sync_log(
                db,
                ptl_user_id=current_user.id,
                id_pa=id_pa,
                field_changed=field,
                old_value=old_val,
                new_value=new_val,
                sync_type="dashboard",
                synced_by=current_user.username,
            )

    return {"ok": True, "row_id": row_id, "updated": list(payload.updates.keys())}
