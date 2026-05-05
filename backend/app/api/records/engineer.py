"""
records/engineer.py
Endpoint Engineer:
  GET  /records/                 → baca data dari PostgreSQL
  POST /records/{row_id}/status  → update status (Engineer)
  POST /records/{row_id}/cells   → update cell umum (Engineer, tulis ke PG)
  POST /records/by-id/{record_id}/status → update via record_id string
"""
import json
import logging
from datetime import datetime as _dt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.deps import require_role
from app.db.models import User, PARecord
from app.db.database import get_db
from app.services.sheet_writer import update_cells
from app.services.status_reader import read_status_master

from ._shared import _sanitize, _enrich_updates_with_opsi, _write_sync_log
from ._pa_record import (
    PA_RECORD_COL_DISPLAY, DISPLAY_TO_DB_COL, DATE_COLS, FLOAT_COLS,
    get_engineer_records_from_pg,
)

logger = logging.getLogger(__name__)
router = APIRouter()


class StatusUpdatePayload(BaseModel):
    status: str
    detail: str | None = None


class GeneralUpdatePayload(BaseModel):
    updates: dict[str, str]


@router.get("/")
async def get_records(
    current_user: User = Depends(require_role("engineer", "mitra")),
    db: AsyncSession = Depends(get_db),
):
    """Engineer: baca data dari PostgreSQL."""
    return await get_engineer_records_from_pg(db)


@router.post("/by-id/{record_id}/status")
async def update_record_status_by_id(
    record_id: str,
    payload: StatusUpdatePayload,
    current_user: User = Depends(require_role("engineer")),
    db: AsyncSession = Depends(get_db),
):
    """Update status via record_id string (format 'rec_N' atau id_pa langsung)."""
    result = await db.execute(
        select(PARecord).where(PARecord.id_pa == record_id.replace("rec_", ""))
    )
    pa_rec = result.scalar_one_or_none()

    # Fallback: cari by gsheet_row jika record_id = "rec_N"
    if not pa_rec and record_id.startswith("rec_"):
        try:
            grow = int(record_id.replace("rec_", ""))
            r2   = await db.execute(select(PARecord).where(PARecord.gsheet_row == grow))
            pa_rec = r2.scalar_one_or_none()
        except ValueError:
            pass

    if not pa_rec:
        raise HTTPException(status_code=404, detail=f"Record '{record_id}' tidak ditemukan")

    row_id = pa_rec.gsheet_row
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
    updates = _enrich_updates_with_opsi(updates, status)

    update_cells(row_id=row_id, updates=updates)

    if master["status_column"] == "Status Pekerjaan":
        pa_rec.kategori_status = status
    if detail and master["detail_column"] == "Detail Progres":
        pa_rec.detail_progres = detail
    pa_rec.updated_at = _dt.now()
    await db.commit()

    return {"ok": True, "record_id": record_id, "row_id": row_id, "status": status, "detail": detail or "-"}


@router.post("/{row_id}/status")
async def update_record_status(
    row_id: int,
    payload: StatusUpdatePayload,
    current_user: User = Depends(require_role("engineer", "mitra")),
    db: AsyncSession = Depends(get_db),
):
    """Update status by gsheet row_id (Engineer)."""
    if row_id < 2:
        raise HTTPException(status_code=400, detail="row_id harus >= 2")

    # Support JSON payload dalam field detail (legacy fallback)
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

    result = await db.execute(select(PARecord).where(PARecord.gsheet_row == row_id))
    pa_rec = result.scalar_one_or_none()
    if pa_rec:
        pa_rec.kategori_status = status
        if detail:
            pa_rec.detail_progres = detail
        pa_rec.updated_at = _dt.now()
        await db.commit()

    return {"ok": True, "row_id": row_id, "status": status, "detail": detail or "-"}


@router.post("/{row_id}/cells")
async def update_record_cells(
    row_id: int,
    payload: GeneralUpdatePayload,
    current_user: User = Depends(require_role("engineer", "mitra")),
    db: AsyncSession = Depends(get_db),
):
    """Update cell(s) by row_id — Engineer menulis ke PostgreSQL."""
    if row_id < 2:
        raise HTTPException(status_code=400, detail="row_id harus >= 2")

    result = await db.execute(select(PARecord).where(PARecord.gsheet_row == row_id))
    pa_rec = result.scalar_one_or_none()
    if not pa_rec:
        raise HTTPException(status_code=404, detail="Record tidak ditemukan di database")

    for field_display, new_val in payload.updates.items():
        db_col = DISPLAY_TO_DB_COL.get(field_display)
        if not db_col or not hasattr(pa_rec, db_col) or db_col == "gsheet_row":
            continue

        old_val = getattr(pa_rec, db_col, None)

        if db_col in DATE_COLS:
            if new_val:
                for fmt in ["%Y-%m-%d %H:%M", "%Y-%m-%d", "%d/%m/%Y"]:
                    try:
                        new_val = _dt.strptime(new_val, fmt)
                        break
                    except ValueError:
                        continue
            else:
                new_val = None
        elif db_col in FLOAT_COLS:
            new_val = float(new_val.replace(",", ".")) if new_val else None
        elif db_col == "aging_pa":
            new_val = int(float(new_val.replace(",", "."))) if new_val else None

        setattr(pa_rec, db_col, new_val)

        await _write_sync_log(
            db,
            ptl_user_id=None,
            id_pa=pa_rec.id_pa or str(row_id),
            field_changed=field_display,
            old_value=old_val,
            new_value=new_val,
            sync_type="manual",
            synced_by=current_user.username,
        )

    pa_rec.updated_at = _dt.now()
    await db.commit()
    return {"ok": True, "row_id": row_id, "updated": list(payload.updates.keys())}
