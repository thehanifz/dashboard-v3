"""
sheet_reader.py
Baca data dari Google Sheets (RAW sheet).
Aging dihitung otomatis dari TGL TERBIT PA, kolom DURASI diabaikan.
"""
from typing import Dict, List
from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials

from app.core.config import (
    GOOGLE_APPLICATION_CREDENTIALS,
    SPREADSHEET_ID,
    SHEET_NAME,
)
from app.services.aging import calculate_aging, calculate_aging_days

# Kolom DURASI dari GSheet diabaikan — diganti aging kalkulasi
IGNORED_COLUMNS = {"DURASI"}

# Kolom yang perlu di-parse untuk hapus nomor HP (format: "Nama - 08xx" atau "Nama/08xx")
PTL_COLUMNS = {"PTL TERMINATING", "PTL ORIGINATING"}


def parse_ptl_name(value: str) -> str:
    """
    Parse nama dari kolom PTL — hapus nomor HP, biarkan nama saja.
    Format input: 
      - "Nama - 08123456789"
      - "Nama/08123456789"
      - "Nama (08123456789)"
      - "Nama | +628123456789" atau "Nama|08123456789"
    Output: "Nama" saja
    """
    if not value:
        return value
    
    import re
    # Pattern: hapus everything setelah separator yang diikuti nomor HP
    patterns = [
        r'\s*\|\s*[\+]?[\d\s]+',  # " | +628123456789" atau "|08123456789"
        r'\s*[-/]\s*\d+',         # " - 08123456789" atau "/08123456789"
        r'\s*\(\d+\)',            # " (08123456789)"
        r'\s*08\d{8,}',           # "08123456789" di akhir
        r'\s*\+62\d{8,}',         # "+628123456789" di akhir
    ]
    
    result = value.strip()
    for pattern in patterns:
        result = re.sub(pattern, '', result).strip()
    
    return result


def get_sheet_service():
    creds = Credentials.from_service_account_file(
        GOOGLE_APPLICATION_CREDENTIALS,
        scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"],
    )
    return build("sheets", "v4", credentials=creds)


def read_sheet(
    spreadsheet_id: str = SPREADSHEET_ID,
    sheet_name: str = SHEET_NAME,
) -> Dict[str, List]:
    service = get_sheet_service()

    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=spreadsheet_id, range=sheet_name)
        .execute()
    )

    values = result.get("values", [])
    if not values:
        return {"columns": [], "records": []}

    raw_headers = values[0]

    # Filter kolom DURASI — tidak masuk ke output
    filtered_headers = [h for h in raw_headers if h not in IGNORED_COLUMNS]

    # Tambah kolom AGING (kalkulasi baru)
    output_columns = filtered_headers + ["AGING", "AGING_HARI"]

    records = []
    for idx, row in enumerate(values[1:], start=2):
        row_data = dict(zip(raw_headers, row))

        # Buang kolom yang diabaikan
        clean_data = {k: v for k, v in row_data.items() if k not in IGNORED_COLUMNS}

        # Parse kolom PTL — hapus nomor HP, biarkan nama saja
        for col in PTL_COLUMNS:
            if col in clean_data:
                clean_data[col] = parse_ptl_name(clean_data[col])

        # Hitung aging dari TGL TERBIT PA
        tgl_terbit = row_data.get("TGL TERBIT PA", "")
        clean_data["AGING"]      = calculate_aging(tgl_terbit)
        clean_data["AGING_HARI"] = str(calculate_aging_days(tgl_terbit))

        records.append({
            "id":     f"rec_{idx}",
            "row_id": idx,
            "data":   clean_data,
        })

    return {
        "columns": output_columns,
        "records": records,
    }


def find_record_by_id_pa(id_pa: str) -> Dict | None:
    """
    Cari satu record berdasarkan ID PA.
    Digunakan oleh Teskom untuk auto-fill form.
    """
    if not id_pa:
        return None

    sheet_data = read_sheet()
    target = id_pa.strip().lower()

    for record in sheet_data["records"]:
        record_id_pa = record["data"].get("ID PA", "").strip().lower()
        if record_id_pa == target:
            return record

    return None
