"""
services/opsi_service.py
Satu-satunya reader untuk sheet Opsi dari GSheet Engineer.

Sheet Opsi memiliki 4 kolom tetap:
    Kolom A = Status PA
    Kolom B = Kategori PA
    Kolom C = Status Pekerjaan   ← field yg dipilih user
    Kolom D = Detail Progres     ← field yg dipilih user

Cache in-memory TTL 5 menit — tidak query GSheet setiap request.
Dua consumer:
    1. status_reader.py  → dropdown options untuk frontend
    2. opsi_reader.py    → auto-fill Status PA & Kategori PA saat update
"""
import time
from typing import Optional

from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials

from app.core.config import (
    GOOGLE_APPLICATION_CREDENTIALS,
    SPREADSHEET_ID,
    STATUS_SHEET_NAME,
    STATUS_COL_PRIMARY,
    STATUS_COL_DETAIL,
)

# ── Cache ─────────────────────────────────────────────────────────────────────
_CACHE_TTL = 300  # 5 menit

_cache_data: Optional[dict] = None
_cache_time: float = 0.0
_cache_error: Optional[str] = None


def _is_expired() -> bool:
    return (time.monotonic() - _cache_time) > _CACHE_TTL


def invalidate() -> None:
    """Paksa reload pada akses berikutnya (misal: dipanggil setelah engineer update sheet)."""
    global _cache_time
    _cache_time = 0.0


# ── Internal loader ───────────────────────────────────────────────────────────

def _load_from_gsheet() -> dict:
    """
    Baca sheet Opsi dan return dict lengkap:
    {
        "error": None | str,
        "status_column": "Status Pekerjaan",
        "detail_column": "Detail Progres",

        # Untuk dropdown (status_reader)
        "primary": ["On Progress", "Done BAI", "PA Cancel", ...],
        "mapping": {
            "On Progress": ["Survey", "Kendala", ...],
            "Done BAI":    ["Selesai", ...],
            ...
        },

        # Untuk auto-fill (opsi_reader)
        "status_map": {
            "On Progress": {"Status PA": "On Progress", "Kategori PA": "On Progress"},
            "Need Cancel":  {"Status PA": "On Progress", "Kategori PA": "Need Cancel"},
            ...
        },
    }
    """
    try:
        creds = Credentials.from_service_account_file(
            GOOGLE_APPLICATION_CREDENTIALS,
            scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"],
        )
        service = build("sheets", "v4", credentials=creds)
        result = (
            service.spreadsheets()
            .values()
            .get(spreadsheetId=SPREADSHEET_ID, range=STATUS_SHEET_NAME)
            .execute()
        )
    except Exception as exc:
        return {
            "error": str(exc),
            "status_column": STATUS_COL_PRIMARY,
            "detail_column": STATUS_COL_DETAIL,
            "primary": [],
            "mapping": {},
            "status_map": {},
        }

    values = result.get("values", [])
    if not values or len(values) < 2:
        return {
            "error": None,
            "status_column": STATUS_COL_PRIMARY,
            "detail_column": STATUS_COL_DETAIL,
            "primary": [],
            "mapping": {},
            "status_map": {},
        }

    # Kolom fix: A=0 Status PA, B=1 Kategori PA, C=2 Status Pekerjaan, D=3 Detail Progres
    IDX_STATUS_PA   = 0
    IDX_KATEGORI_PA = 1
    IDX_STATUS_PEK  = 2
    IDX_DETAIL      = 3

    def safe(row: list, idx: int) -> str:
        return row[idx].strip() if idx < len(row) else ""

    mapping: dict[str, list[str]] = {}     # Status Pekerjaan -> [Detail Progres, ...]
    status_map: dict[str, dict] = {}       # Status Pekerjaan -> {Status PA, Kategori PA}

    for row in values[1:]:  # skip header
        status_pek = safe(row, IDX_STATUS_PEK)
        if not status_pek:
            continue

        detail = safe(row, IDX_DETAIL) or "-"
        mapping.setdefault(status_pek, []).append(detail)

        # status_map: ambil baris pertama saja jika duplikat
        if status_pek not in status_map:
            status_map[status_pek] = {
                "Status PA":   safe(row, IDX_STATUS_PA),
                "Kategori PA": safe(row, IDX_KATEGORI_PA),
            }

    return {
        "error": None,
        "status_column": STATUS_COL_PRIMARY,
        "detail_column": STATUS_COL_DETAIL,
        "primary": list(mapping.keys()),
        "mapping": mapping,
        "status_map": status_map,
    }


# ── Public API ────────────────────────────────────────────────────────────────

def get_opsi() -> dict:
    """
    Kembalikan data Opsi dari cache. Reload otomatis jika TTL expired atau cache kosong.
    Selalu return dict lengkap — field 'error' berisi pesan jika GSheet gagal diakses.
    """
    global _cache_data, _cache_time, _cache_error

    if _cache_data is None or _is_expired():
        _cache_data = _load_from_gsheet()
        _cache_time = time.monotonic()

    return _cache_data


def get_dropdown_options() -> dict:
    """
    Untuk /api/status — dropdown frontend.
    Return:
        {
            "error": None | str,
            "primary": [...],
            "mapping": {...},
            "status_column": "Status Pekerjaan",
            "detail_column": "Detail Progres",
        }
    """
    data = get_opsi()
    return {
        "error":         data["error"],
        "primary":       data["primary"],
        "mapping":       data["mapping"],
        "status_column": data["status_column"],
        "detail_column": data["detail_column"],
    }


def get_status_mapping() -> dict[str, dict[str, str]]:
    """
    Untuk auto-fill saat user update Status Pekerjaan.
    Return: { "On Progress": {"Status PA": ..., "Kategori PA": ...}, ... }
    Return dict kosong jika GSheet gagal (caller harus handle).
    """
    data = get_opsi()
    return data.get("status_map", {})
