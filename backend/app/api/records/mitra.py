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


