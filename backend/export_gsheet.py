"""
export_gsheet.py
────────────────
Script untuk export data GSheet Engineer ke CSV dan JSON.
Hanya ambil kolom yang diperlukan dan filter baris sesuai jenis pekerjaan.

Cara pakai (dari folder backend):
    python export_gsheet.py

Output:
    export_raw.csv   → buka di Excel untuk review nama kolom
    export_raw.json  → untuk import ke PostgreSQL nanti

Kolom yang diambil (huruf GSheet):
    B,C,E,F,G,I,J,K,L,M,X,Z,AG,AJ,AR,AS,AT,AY,
    BK,BL,BM,BN,BO,BU,BV,BX,CI,CJ,CK,CL,CM,CN

Filter baris (kolom AJ):
    AKTIVASI | RETENDER | UPGRADE | DOWNGRADE | RELOKASI
"""

import os
import csv
import json
import re
from pathlib import Path
from dotenv import load_dotenv
from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials

# ── Load .env ─────────────────────────────────────────────────────────────────
load_dotenv()

CREDENTIALS_FILE = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
SPREADSHEET_ID   = os.getenv("SPREADSHEET_ID")
SHEET_NAME       = os.getenv("SHEET_NAME", "RAW")

if not SPREADSHEET_ID:
    raise SystemExit("❌ SPREADSHEET_ID tidak ditemukan di .env")

if not Path(CREDENTIALS_FILE).exists():
    raise SystemExit(f"❌ File credentials tidak ditemukan: {CREDENTIALS_FILE}")

# ── Kolom yang diambil ────────────────────────────────────────────────────────
# Format: huruf kolom GSheet
SELECTED_COLS_LETTERS = [
    "B","C","E","F","G","I","J","K","L","M",
    "X","Z","AG","AJ","AR","AS","AT","AY",
    "BK","BL","BM","BN","BO","BU","BV","BX",
    "CI","CJ","CK","CL","CM","CN",
]

# Filter baris: nilai kolom AJ harus salah satu dari ini
FILTER_COL_LETTER = "AJ"
FILTER_VALUES = {"AKTIVASI", "RETENDER", "UPGRADE", "DOWNGRADE", "RELOKASI"}

# ── Helper: konversi huruf kolom ke index (0-based) ──────────────────────────
def col_letter_to_index(letter: str) -> int:
    """A=0, B=1, ..., Z=25, AA=26, AB=27, ..."""
    letter = letter.upper()
    result = 0
    for ch in letter:
        result = result * 26 + (ord(ch) - ord("A") + 1)
    return result - 1

SELECTED_INDEXES = [col_letter_to_index(c) for c in SELECTED_COLS_LETTERS]
FILTER_COL_INDEX = col_letter_to_index(FILTER_COL_LETTER)

# Cari posisi filter col di dalam selected cols (untuk display)
FILTER_IN_SELECTED = FILTER_COL_LETTER in SELECTED_COLS_LETTERS

def main():
    print(f"📡 Menghubungkan ke Google Sheets...")
    print(f"   Spreadsheet : {SPREADSHEET_ID}")
    print(f"   Sheet       : {SHEET_NAME}")
    print(f"   Kolom       : {len(SELECTED_COLS_LETTERS)} kolom dipilih")
    print(f"   Filter      : kolom {FILTER_COL_LETTER} = {FILTER_VALUES}")
    print()

    # ── Autentikasi ───────────────────────────────────────────────────────────
    creds   = Credentials.from_service_account_file(
        CREDENTIALS_FILE,
        scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"],
    )
    service = build("sheets", "v4", credentials=creds)
    sheet   = service.spreadsheets()

    # ── Ambil semua data (header + data rows) ─────────────────────────────────
    # Ambil seluruh sheet dulu (lebih reliable dari multiple ranges)
    print("⏳ Mengambil data dari GSheet (mungkin butuh beberapa detik)...")
    result = sheet.values().get(
        spreadsheetId=SPREADSHEET_ID,
        range=f"{SHEET_NAME}",
        valueRenderOption="FORMATTED_VALUE",
        majorDimension="ROWS",
    ).execute()

    all_rows = result.get("values", [])
    if not all_rows:
        raise SystemExit("❌ Tidak ada data di sheet")

    total_rows = len(all_rows)
    print(f"✅ Total baris ditemukan: {total_rows:,} (termasuk header)")

    # ── Ambil header dari baris pertama ───────────────────────────────────────
    header_row = all_rows[0]
    max_col    = max(SELECTED_INDEXES + [FILTER_COL_INDEX]) + 1

    # Pad header jika kurang panjang
    while len(header_row) < max_col:
        header_row.append("")

    # Ambil nama header untuk kolom yang dipilih
    selected_headers = []
    for idx in SELECTED_INDEXES:
        name = header_row[idx].strip() if idx < len(header_row) else f"COL_{SELECTED_COLS_LETTERS[SELECTED_INDEXES.index(idx)]}"
        if not name:
            name = f"COL_{SELECTED_COLS_LETTERS[SELECTED_INDEXES.index(idx)]}"
        selected_headers.append(name)

    print(f"\n📋 Header kolom yang diambil:")
    for i, (letter, name) in enumerate(zip(SELECTED_COLS_LETTERS, selected_headers)):
        marker = "🔍" if letter == FILTER_COL_LETTER else "  "
        print(f"   {marker} [{letter:>3}] → {name}")

    # ── Filter dan extract baris data ─────────────────────────────────────────
    print(f"\n⏳ Memfilter baris berdasarkan kolom {FILTER_COL_LETTER}...")

    data_rows   = all_rows[1:]  # skip header
    filtered    = []
    skipped     = 0

    for raw_row in data_rows:
        # Pad baris jika kurang panjang
        while len(raw_row) < max_col:
            raw_row.append("")

        # Cek nilai kolom filter (AJ)
        filter_val = raw_row[FILTER_COL_INDEX].strip().upper()
        if filter_val not in FILTER_VALUES:
            skipped += 1
            continue

        # Ambil hanya kolom yang dipilih
        record = {}
        for letter, idx, header in zip(SELECTED_COLS_LETTERS, SELECTED_INDEXES, selected_headers):
            val = raw_row[idx].strip() if idx < len(raw_row) else ""
            record[header] = val

        # Tambah metadata
        record["__gsheet_row__"] = data_rows.index(raw_row) + 2  # +2: 1 untuk header, 1 untuk 1-based

        filtered.append(record)

    print(f"✅ Baris lolos filter : {len(filtered):,}")
    print(f"   Baris dilewati     : {skipped:,}")

    if not filtered:
        raise SystemExit("❌ Tidak ada baris yang lolos filter. Cek nama sheet dan kolom AJ.")

    # ── Export CSV ────────────────────────────────────────────────────────────
    csv_file = "export_raw.csv"
    csv_headers = selected_headers + ["__gsheet_row__"]

    with open(csv_file, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=csv_headers)
        writer.writeheader()
        writer.writerows(filtered)

    print(f"\n💾 CSV  → {csv_file} ({len(filtered):,} baris, {len(csv_headers)} kolom)")

    # ── Export JSON ───────────────────────────────────────────────────────────
    json_file = "export_raw.json"
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump({
            "meta": {
                "spreadsheet_id": SPREADSHEET_ID,
                "sheet_name": SHEET_NAME,
                "total_rows_in_sheet": total_rows - 1,
                "filtered_rows": len(filtered),
                "filter_col": FILTER_COL_LETTER,
                "filter_values": sorted(FILTER_VALUES),
                "selected_cols": SELECTED_COLS_LETTERS,
                "headers": selected_headers,
            },
            "records": filtered,
        }, f, ensure_ascii=False, indent=2)

    print(f"💾 JSON → {json_file}")

    # ── Ringkasan nilai filter ────────────────────────────────────────────────
    print(f"\n📊 Distribusi nilai kolom {FILTER_COL_LETTER}:")
    filter_header = selected_headers[SELECTED_COLS_LETTERS.index(FILTER_COL_LETTER)] if FILTER_IN_SELECTED else None
    counter: dict = {}
    for rec in filtered:
        val = rec.get(filter_header, "") if filter_header else ""
        counter[val] = counter.get(val, 0) + 1
    for val, count in sorted(counter.items(), key=lambda x: -x[1]):
        print(f"   {val:<20} : {count:,} baris")

    print(f"\n✅ Selesai! Buka export_raw.csv di Excel untuk review nama kolom.")
    print(f"   Setelah mapping selesai, jalankan script import ke PostgreSQL.")

if __name__ == "__main__":
    main()