"""
records.py
API endpoint untuk baca dan update data record dari GSheet (RAW sheet).
"""
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.sheet_reader import read_sheet
from app.services.sheet_writer import update_cells
from app.services.status_reader import read_status_master

router = APIRouter(tags=["records"])


class StatusUpdatePayload(BaseModel):
    status: str
    detail: str | None = None


class GeneralUpdatePayload(BaseModel):
    updates: dict[str, str]


@router.post("/by-id/{record_id}/status")
def update_record_status_by_id(record_id: str, payload: StatusUpdatePayload):
    """Update status berdasarkan record ID (rec_N)."""
    records = read_sheet()["records"]
    record  = next((r for r in records if r["id"] == record_id), None)

    if not record:
        raise HTTPException(status_code=404, detail=f"Record '{record_id}' tidak ditemukan")

    row_id  = record["row_id"]
    master  = read_status_master()
    status  = payload.status.strip()
    detail  = (payload.detail or "").strip()

    if status not in master["mapping"]:
        raise HTTPException(status_code=400, detail=f"Status '{status}' tidak valid")

    if detail and detail not in master["mapping"][status]:
        raise HTTPException(status_code=400, detail=f"Detail '{detail}' tidak valid")

    updates = {master["status_column"]: status}
    if detail:
        updates[master["detail_column"]] = detail

    update_cells(row_id=row_id, updates=updates)
    return {"ok": True, "record_id": record_id, "row_id": row_id, "status": status, "detail": detail or "-"}


@router.get("")
def get_records():
    """Ambil semua record dari RAW sheet (dengan aging kalkulasi)."""
    return read_sheet()


@router.post("/{row_id}/status")
def update_record_status(row_id: int, payload: StatusUpdatePayload):
    """Update Status Pekerjaan & Detail Progres pada baris tertentu."""
    if row_id < 2:
        raise HTTPException(status_code=400, detail="row_id harus >= 2 (baris 1 adalah header)")

    # Cek apakah detail berisi JSON (general column update)
    if payload.detail and payload.detail.startswith("{"):
        try:
            updates = json.loads(payload.detail)
            if isinstance(updates, dict):
                update_cells(row_id=row_id, updates=updates)
                return {"ok": True, "row_id": row_id, "updates": updates}
        except json.JSONDecodeError:
            pass

    master  = read_status_master()
    status  = payload.status.strip()
    detail  = (payload.detail or "").strip()

    if status not in master["mapping"]:
        raise HTTPException(status_code=400, detail=f"Status '{status}' tidak valid")

    if detail and detail not in master["mapping"][status]:
        raise HTTPException(status_code=400, detail=f"Detail '{detail}' tidak valid untuk status '{status}'")

    updates = {master["status_column"]: status}
    if detail:
        updates[master["detail_column"]] = detail

    update_cells(row_id=row_id, updates=updates)
    return {"ok": True, "row_id": row_id, "status": status, "detail": detail or "-"}


@router.post("/{row_id}/cells")
def update_record_cells(row_id: int, payload: GeneralUpdatePayload):
    """Update satu atau lebih cell pada baris tertentu."""
    if row_id < 2:
        raise HTTPException(status_code=400, detail="row_id harus >= 2")

    sheet_data = read_sheet()
    if sheet_data["columns"]:
        invalid = [col for col in payload.updates if col not in sheet_data["columns"]]
        if invalid:
            raise HTTPException(
                status_code=400,
                detail=f"Kolom tidak valid: {invalid}. Tersedia: {sheet_data['columns']}"
            )

    update_cells(row_id=row_id, updates=payload.updates)
    return {"ok": True, "row_id": row_id, "updates": payload.updates}
