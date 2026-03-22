"""
opsi_reader.py
Baca sheet "Opsi" dari GSheet Engineer dan return mapping:
  Status Pekerjaan → { "Status PA": ..., "Kategori PA": ... }

Dipanggil setiap kali user update Status Pekerjaan di dashboard.
Tidak ada cache — fresh read setiap dipanggil.
"""
from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials

from app.core.config import (
    GOOGLE_APPLICATION_CREDENTIALS,
    SPREADSHEET_ID,
    STATUS_SHEET_NAME,
)


def get_opsi_mapping() -> dict[str, dict[str, str]]:
    """
    Baca sheet Opsi dan return dict:
    {
        "Need Cancel":        {"Status PA": "On Progress", "Kategori PA": "Need Cancel"},
        "Survey":             {"Status PA": "On Progress", "Kategori PA": "On Progress"},
        "Test Commissioning": {"Status PA": "On Progress", "Kategori PA": "On Progress"},
        ...
    }

    Kolom yang dibaca dari sheet Opsi:
        Kolom A = Status PA
        Kolom B = Kategori PA
        Kolom C = Status Pekerjaan
        Kolom D = Detail Progres (diabaikan)

    Key mapping = nilai kolom C (Status Pekerjaan).
    Jika ada duplikat Status Pekerjaan, ambil baris pertama.
    """
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

    values = result.get("values", [])
    if not values or len(values) < 2:
        return {}

    # Baris pertama = header
    headers = [h.strip() for h in values[0]]

    # Cari index kolom yang dibutuhkan (case-insensitive)
    def col_idx(name: str) -> int:
        name_lower = name.lower()
        for i, h in enumerate(headers):
            if h.lower() == name_lower:
                return i
        return None

    idx_Status_pa   = col_idx("Status PA")
    idx_Kategori_pa = col_idx("Kategori PA")
    idx_Status_pek  = col_idx("Status Pekerjaan")

    # Fallback ke posisi default (A=0, B=1, C=2) jika header tidak ditemukan
    if idx_Status_pa is None:
        idx_Status_pa = 0
    if idx_Kategori_pa is None:
        idx_Kategori_pa = 1
    if idx_Status_pek is None:
        idx_Status_pek = 2

    mapping: dict[str, dict[str, str]] = {}

    for row in values[1:]:
        def safe_get(idx: int) -> str:
            return row[idx].strip() if idx < len(row) else ""

        Status_pekerjaan = safe_get(idx_Status_pek)
        if not Status_pekerjaan:
            continue

        # Jika duplikat, skip — ambil baris pertama saja
        if Status_pekerjaan in mapping:
            continue

        mapping[Status_pekerjaan] = {
            "Status PA":   safe_get(idx_Status_pa),
            "Kategori PA": safe_get(idx_Kategori_pa),
        }

    return mapping