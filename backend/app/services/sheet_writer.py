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


def _get_raw_headers() -> list[str]:
    """
    Baca headers LANGSUNG dari GSheet tanpa modifikasi.
    Tidak membuang kolom DURASI, tidak menambah AGING.
    Ini penting agar index kolom sesuai dengan posisi asli di GSheet.
    """
    creds = Credentials.from_service_account_file(
        GOOGLE_APPLICATION_CREDENTIALS,
        scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"],
    )
    service = build("sheets", "v4", credentials=creds)

    # Baca baris 1 (header) dari sheet
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=SPREADSHEET_ID, range=f"{SHEET_NAME}!1:1")
        .execute()
    )

    values = result.get("values", [])
    if not values:
        return []

    headers = values[0]
    print(f"[_get_raw_headers] Headers dari GSheet '{SHEET_NAME}': {headers}")
    return headers


def update_cells(row_id: int, updates: dict):
    """
    Update satu atau lebih cell pada baris tertentu di RAW sheet.

    Args:
        row_id  : nomor baris di sheet (baris 1 = header, data mulai baris 2)
        updates : dict {nama_kolom: nilai_baru}
    """
    # Baca headers LANGSUNG dari GSheet (tanpa modifikasi)
    headers = _get_raw_headers()

    # Debug logging
    print(f"[update_cells] row_id={row_id}, updates={updates}")
    print(f"[update_cells] headers dari GSheet: {headers}")

    # Hapus kolom virtual (AGING, AGING_HARI) — tidak ada di GSheet
    virtual_cols = {"AGING", "AGING_HARI"}
    filtered_updates = {k: v for k, v in updates.items() if k not in virtual_cols}

    if not filtered_updates:
        print(f"[update_cells] Tidak ada update yang difilter")
        return

    creds = Credentials.from_service_account_file(
        GOOGLE_APPLICATION_CREDENTIALS,
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    service = build("sheets", "v4", credentials=creds)

    data = []
    for col_name, value in filtered_updates.items():
        col_idx = find_col_index(headers, col_name)
        print(f"[update_cells] Mencari kolom '{col_name}' -> index={col_idx}")
        if col_idx is None:
            raise RuntimeError(
                f"Kolom '{col_name}' tidak ditemukan di RAW sheet. "
                f"Kolom tersedia: {headers}"
            )

        col_letter = col_index_to_letter(col_idx)
        cell_range = f"{SHEET_NAME}!{col_letter}{row_id}"
        print(f"[update_cells] Kolom '{col_name}' -> {col_letter}{row_id} (index {col_idx})")
        data.append({"range": cell_range, "values": [[value]]})

    body = {"valueInputOption": "USER_ENTERED", "data": data}
    print(f"[update_cells] Request body: {body}")
    service.spreadsheets().values().batchUpdate(
        spreadsheetId=SPREADSHEET_ID,
        body=body,
    ).execute()
    print(f"[update_cells] Update berhasil")


def update_cells_external(
    spreadsheet_id: str,
    sheet_name: str,
    row_id: int,
    updates: dict,
    headers: list[str],
):
    """
    Update cell di GSheet external (GSheet PTL) — bukan GSheet Engineer.

    Args:
        spreadsheet_id : ID spreadsheet target
        sheet_name     : nama sheet aktif
        row_id         : nomor baris (1 = header)
        updates        : dict {nama_kolom: nilai_baru}
        headers        : list nama kolom dari sheet tersebut
    """
    virtual_cols = {"AGING", "AGING_HARI"}
    filtered = {k: v for k, v in updates.items() if k not in virtual_cols}
    if not filtered:
        return

    creds = Credentials.from_service_account_file(
        GOOGLE_APPLICATION_CREDENTIALS,
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    service = build("sheets", "v4", credentials=creds)

    data = []
    for col_name, value in filtered.items():
        col_idx = find_col_index(headers, col_name)
        if col_idx is None:
            raise RuntimeError(
                f"Kolom '{col_name}' tidak ditemukan di sheet '{sheet_name}'. "
                f"Kolom tersedia: {headers}"
            )
        col_letter = col_index_to_letter(col_idx)
        cell_range = f"{sheet_name}!{col_letter}{row_id}"
        data.append({"range": cell_range, "values": [[value]]})

    body = {"valueInputOption": "USER_ENTERED", "data": data}
    service.spreadsheets().values().batchUpdate(
        spreadsheetId=spreadsheet_id,
        body=body,
    ).execute()


def check_write_permission_external(spreadsheet_id: str, sheet_name: str) -> bool:
    """
    Cek apakah service account punya akses WRITE ke spreadsheet external.
    Caranya: coba tulis ke cell Z1 (pojok kanan atas header) lalu kembalikan nilai semula.
    Return True kalau berhasil, False kalau 403/permission error.
    """
    try:
        creds = Credentials.from_service_account_file(
            GOOGLE_APPLICATION_CREDENTIALS,
            scopes=["https://www.googleapis.com/auth/spreadsheets"],
        )
        service = build("sheets", "v4", credentials=creds)

        # Baca nilai Z1 dulu
        test_range = f"{sheet_name}!A1"
        result = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id,
            range=test_range,
        ).execute()
        original = result.get("values", [[""]])[0][0] if result.get("values") else ""

        # Coba tulis nilai yang sama (no-op tapi test permission)
        service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=test_range,
            valueInputOption="RAW",
            body={"values": [[original]]},
        ).execute()

        return True
    except Exception as e:
        err_str = str(e).lower()
        if "403" in err_str or "permission" in err_str or "forbidden" in err_str:
            return False
        # Error lain (network, dll) — anggap permission ok tapi ada masalah lain
        return True


def ensure_columns_exist_external(
    spreadsheet_id: str,
    sheet_name: str,
    required_columns: list[str],
) -> list[str]:
    """
    Pastikan kolom-kolom wajib ada di baris header (baris 1) sheet external.
    Kolom yang belum ada akan di-append di akhir header.

    Returns:
        list kolom yang baru dibuat (kosong kalau semua sudah ada)
    """
    creds = Credentials.from_service_account_file(
        GOOGLE_APPLICATION_CREDENTIALS,
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    service = build("sheets", "v4", credentials=creds)

    # Baca header row saat ini
    result = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id,
        range=f"{sheet_name}!1:1",
    ).execute()

    existing_headers = result.get("values", [[]])[0] if result.get("values") else []
    existing_lower   = {h.strip().lower() for h in existing_headers}

    # Cari kolom yang belum ada
    missing = [c for c in required_columns if c.strip().lower() not in existing_lower]
    if not missing:
        return []

    # Append kolom baru di akhir header
    start_col_idx = len(existing_headers)
    data = []
    for i, col_name in enumerate(missing):
        col_letter = col_index_to_letter(start_col_idx + i)
        cell_range = f"{sheet_name}!{col_letter}1"
        data.append({"range": cell_range, "values": [[col_name]]})

    body = {"valueInputOption": "RAW", "data": data}
    service.spreadsheets().values().batchUpdate(
        spreadsheetId=spreadsheet_id,
        body=body,
    ).execute()

    return missing