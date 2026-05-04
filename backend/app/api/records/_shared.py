"""
records/_shared.py
Helper functions & utilities bersama untuk semua sub-router records.
"""
import re
import logging
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import SyncLog
from app.services.opsi_reader import get_opsi_mapping

logger = logging.getLogger(__name__)

FORMULA_PREFIXES = ("=", "+", "-", "@")


def _sanitize(value: str) -> str:
    """Cegah formula injection di Google Sheets."""
    if value and value[0] in FORMULA_PREFIXES:
        return "'" + value
    return value


def _extract_spreadsheet_id(url: str) -> str | None:
    match = re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", url)
    return match.group(1) if match else None


def _enrich_updates_with_opsi(updates: dict, status: str) -> dict:
    """
    Lookup sheet Opsi berdasarkan Status Pekerjaan,
    tambahkan Status PA dan Kategori PA ke updates jika ditemukan.
    Jika gagal, log warning dan lanjut tanpa error.
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
) -> None:
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
