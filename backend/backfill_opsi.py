"""
backfill_opsi.py
==============================================================
Script one-time untuk mengisi kolom Status PA dan Kategori PA
di GSheet RAW berdasarkan mapping dari sheet Opsi.

Jalankan dari folder backend/:
    python backfill_opsi.py

Opsi tambahan:
    python backfill_opsi.py --dry-run     # Preview tanpa menulis ke GSheet
    python backfill_opsi.py --overwrite   # Update semua baris, termasuk yang sudah terisi

Default:
    - Hanya mengisi baris yang Status PA atau Kategori PA masih kosong
    - Baris yang sudah terisi keduanya akan dilewati (skip)
==============================================================
"""
import sys
import os
import argparse
from dotenv import load_dotenv

load_dotenv()

# ── Setup path agar bisa import dari app ──────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials

# Config langsung dari env agar tidak perlu import FastAPI app
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
SPREADSHEET_ID                 = os.getenv("SPREADSHEET_ID")
SHEET_NAME                     = os.getenv("SHEET_NAME", "PLN")
STATUS_SHEET_NAME              = os.getenv("STATUS_SHEET_NAME", "Opsi")


def get_service():
    creds = Credentials.from_service_account_file(
        GOOGLE_APPLICATION_CREDENTIALS,
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    return build("sheets", "v4", credentials=creds)


def col_index_to_letter(idx: int) -> str:
    """0 → A, 1 → B, 26 → AA"""
    letters = ""
    while idx >= 0:
        letters = chr(idx % 26 + 65) + letters
        idx = idx // 26 - 1
    return letters


def read_opsi_mapping(service) -> dict:
    """Baca sheet Opsi dan return mapping Status Pekerjaan → {Status PA, Kategori PA}."""
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=SPREADSHEET_ID, range=STATUS_SHEET_NAME)
        .execute()
    )
    values = result.get("values", [])
    if not values or len(values) < 2:
        print(f"[ERROR] Sheet '{STATUS_SHEET_NAME}' kosong atau tidak ditemukan.")
        sys.exit(1)

    headers = [h.strip() for h in values[0]]

    def col_idx(name):
        for i, h in enumerate(headers):
            if h.lower() == name.lower():
                return i
        return None

    idx_status_pa   = col_idx("Status PA")   or 0
    idx_Kategori_pa = col_idx("Kategori PA") or 1
    idx_status_pek  = col_idx("Status Pekerjaan") or 2

    mapping = {}
    for row in values[1:]:
        def safe(idx):
            return row[idx].strip() if idx < len(row) else ""

        key = safe(idx_status_pek)
        if not key or key in mapping:
            continue
        mapping[key] = {
            "Status PA":   safe(idx_status_pa),
            "Kategori PA": safe(idx_Kategori_pa),
        }

    print(f"[INFO] Loaded {len(mapping)} mapping dari sheet '{STATUS_SHEET_NAME}':")
    for k, v in mapping.items():
        print(f"       '{k}' → Status PA='{v['Status PA']}', Kategori PA='{v['Kategori PA']}'")
    return mapping


def read_raw_sheet(service) -> tuple[list, list]:
    """Baca sheet RAW, return (headers, rows)."""
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=SPREADSHEET_ID, range=SHEET_NAME)
        .execute()
    )
    values = result.get("values", [])
    if not values:
        print(f"[ERROR] Sheet '{SHEET_NAME}' kosong.")
        sys.exit(1)
    headers = [h.strip() for h in values[0]]
    rows    = values[1:]
    return headers, rows


def backfill(dry_run: bool = False, overwrite: bool = False):
    print(f"\n{'='*60}")
    print(f"  Backfill Status PA & Kategori PA")
    print(f"  Sheet RAW : {SHEET_NAME}")
    print(f"  Sheet Opsi: {STATUS_SHEET_NAME}")
    print(f"  Mode      : {'DRY RUN (tidak menulis)' if dry_run else 'LIVE'}")
    print(f"  Overwrite : {'Ya (update semua baris)' if overwrite else 'Tidak (skip baris yang sudah terisi)'}")
    print(f"{'='*60}\n")

    service = get_service()
    mapping = read_opsi_mapping(service)
    headers, rows = read_raw_sheet(service)

    # Cari index kolom yang dibutuhkan di sheet RAW
    def col_idx(name):
        for i, h in enumerate(headers):
            if h.lower() == name.lower():
                return i
        return None

    idx_status_pek  = col_idx("Status Pekerjaan")
    idx_status_pa   = col_idx("Status PA")
    idx_Kategori_pa = col_idx("Kategori PA")

    # Validasi kolom wajib ada
    missing = []
    if idx_status_pek is None:
        missing.append("Status Pekerjaan")
    if idx_status_pa is None:
        missing.append("Status PA")
    if idx_Kategori_pa is None:
        missing.append("Kategori PA")

    if missing:
        print(f"[ERROR] Kolom berikut tidak ditemukan di sheet '{SHEET_NAME}': {missing}")
        print(f"        Header yang tersedia: {headers}")
        sys.exit(1)

    print(f"[INFO] Kolom ditemukan:")
    print(f"       Status Pekerjaan → kolom {col_index_to_letter(idx_status_pek)} (index {idx_status_pek})")
    print(f"       Status PA        → kolom {col_index_to_letter(idx_status_pa)} (index {idx_status_pa})")
    print(f"       Kategori PA      → kolom {col_index_to_letter(idx_Kategori_pa)} (index {idx_Kategori_pa})")
    print()

    # Kumpulkan semua update dalam satu batch
    batch_data = []
    stats = {"updated": 0, "skipped": 0, "no_mapping": 0, "total": len(rows)}

    for i, row in enumerate(rows):
        row_num = i + 2  # row 1 = header, data mulai row 2

        def safe(idx):
            return row[idx].strip() if idx < len(row) else ""

        status_pekerjaan = safe(idx_status_pek)
        current_status_pa   = safe(idx_status_pa)
        current_Kategori_pa = safe(idx_Kategori_pa)

        # Skip baris tanpa Status Pekerjaan
        if not status_pekerjaan:
            stats["skipped"] += 1
            continue

        # Skip jika sudah terisi dan tidak overwrite
        if not overwrite and current_status_pa and current_Kategori_pa:
            stats["skipped"] += 1
            continue

        # Cari mapping
        if status_pekerjaan not in mapping:
            print(f"  [WARN] Row {row_num}: '{status_pekerjaan}' tidak ada di mapping Opsi — skip")
            stats["no_mapping"] += 1
            continue

        opsi        = mapping[status_pekerjaan]
        new_status  = opsi["Status PA"]
        new_Kategori = opsi["Kategori PA"]

        # Skip jika nilai sama (tidak perlu update)
        if not overwrite and current_status_pa == new_status and current_Kategori_pa == new_Kategori:
            stats["skipped"] += 1
            continue

        print(f"  Row {row_num:4d} | '{status_pekerjaan}' → Status PA='{new_status}', Kategori PA='{new_Kategori}'"
              + (f"  [DRY RUN]" if dry_run else ""))

        if not dry_run:
            col_letter_status   = col_index_to_letter(idx_status_pa)
            col_letter_Kategori = col_index_to_letter(idx_Kategori_pa)

            batch_data.append({
                "range":  f"{SHEET_NAME}!{col_letter_status}{row_num}",
                "values": [[new_status]],
            })
            batch_data.append({
                "range":  f"{SHEET_NAME}!{col_letter_Kategori}{row_num}",
                "values": [[new_Kategori]],
            })

        stats["updated"] += 1

    # Tulis ke GSheet dalam satu batch request
    if not dry_run and batch_data:
        print(f"\n[INFO] Menulis {len(batch_data)} cell update ke GSheet...")
        body = {"valueInputOption": "USER_ENTERED", "data": batch_data}
        service.spreadsheets().values().batchUpdate(
            spreadsheetId=SPREADSHEET_ID,
            body=body,
        ).execute()
        print(f"[OK]  Selesai menulis ke GSheet.")

    print(f"\n{'='*60}")
    print(f"  HASIL BACKFILL")
    print(f"  Total baris data : {stats['total']}")
    print(f"  Diupdate         : {stats['updated']}")
    print(f"  Dilewati (skip)  : {stats['skipped']}")
    print(f"  Tidak ada mapping: {stats['no_mapping']}")
    if dry_run:
        print(f"\n  ** DRY RUN — tidak ada yang ditulis ke GSheet **")
        print(f"     Jalankan tanpa --dry-run untuk eksekusi sungguhan.")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Backfill Status PA & Kategori PA berdasarkan mapping sheet Opsi"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview perubahan tanpa menulis ke GSheet",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Update semua baris termasuk yang sudah terisi",
    )
    args = parser.parse_args()
    backfill(dry_run=args.dry_run, overwrite=args.overwrite)