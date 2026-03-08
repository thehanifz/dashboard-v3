"""
sheet_writer.py
Tulis / update cell di Google Sheets (RAW sheet).
"""
from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials

from app.core.config import (
    GOOGLE_APPLICATION_CREDENTIALS,
    SPREADSHEET_ID,
    SHEET_NAME,
)
from app.services.sheet_reader import read_sheet


def col_index_to_letter(idx: int) -> str:
    """0 → A, 1 → B, 26 → AA"""
    letters = ""
    while idx >= 0:
        letters = chr(idx % 26 + 65) + letters
        idx = idx // 26 - 1
    return letters


def find_col_index(headers: list[str], target: str) -> int | None:
    t = target.strip().lower()
    for i, h in enumerate(headers):
        if h.strip().lower() == t:
            return i
    return None


def update_cells(row_id: int, updates: dict):
    """
    Update satu atau lebih cell pada baris tertentu di RAW sheet.

    Args:
        row_id  : nomor baris di sheet (baris 1 = header, data mulai baris 2)
        updates : dict {nama_kolom: nilai_baru}
    """
    sheet   = read_sheet()
    headers = sheet["columns"]

    # Hapus kolom virtual (AGING, AGING_HARI) — tidak ada di GSheet
    virtual_cols = {"AGING", "AGING_HARI"}
    filtered_updates = {k: v for k, v in updates.items() if k not in virtual_cols}

    if not filtered_updates:
        return

    creds = Credentials.from_service_account_file(
        GOOGLE_APPLICATION_CREDENTIALS,
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    service = build("sheets", "v4", credentials=creds)

    data = []
    for col_name, value in filtered_updates.items():
        col_idx = find_col_index(headers, col_name)
        if col_idx is None:
            raise RuntimeError(
                f"Kolom '{col_name}' tidak ditemukan di RAW sheet. "
                f"Kolom tersedia: {headers}"
            )

        col_letter = col_index_to_letter(col_idx)
        cell_range = f"{SHEET_NAME}!{col_letter}{row_id}"
        data.append({"range": cell_range, "values": [[value]]})

    body = {"valueInputOption": "USER_ENTERED", "data": data}
    service.spreadsheets().values().batchUpdate(
        spreadsheetId=SPREADSHEET_ID,
        body=body,
    ).execute()
