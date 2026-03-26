"""
import_pa_records.py
────────────────────
Script import data export_raw.csv ke tabel pa_records di PostgreSQL.

Cara pakai (dari folder backend):
    python import_pa_records.py

Pastikan:
    1. Alembic migration sudah dijalankan:
       ./venv/bin/alembic upgrade head
    2. File export_raw.csv ada di folder backend/
    3. .env sudah dikonfigurasi (DB_URL_SYNC)

Fitur:
    - Mapping nama kolom GSheet → nama standar DB
    - Konversi tipe data (tanggal, float, integer)
    - #N/A dan kosong → NULL
    - Upsert by gsheet_row (aman dijalankan ulang)
    - Progress bar + ringkasan hasil
"""

import os
import csv
import re
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values

load_dotenv()

# ── Koneksi DB ────────────────────────────────────────────────────────────────
DB_URL_SYNC = os.getenv(
    "DB_URL_SYNC",
    "postgresql+psycopg2://db_dashboard_pro:1c0nplus_db-thehanifz@localhost:5433/dashboard_pro"
)

# Hapus prefix SQLAlchemy jika ada
PSYCOPG2_DSN = DB_URL_SYNC.replace("postgresql+psycopg2://", "postgresql://")

CSV_FILE = Path("export_raw.csv")

# ── Mapping: nama kolom CSV → nama kolom DB ───────────────────────────────────
COL_MAP = {
    "IDPA":                     "id_pa",
    "Node":                     "node",
    "IDPERMOHONANSALES":        "id_permohonan",
    "SERVICEID":                "service_id",
    "namaProduk":               "nama_produk",
    "alamat":                   "alamat",
    "latitude":                 "latitude",
    "longitude":                "longitude",
    "tanggalUploadBAI":         "tgl_upload_bai",
    "tanggalBAI":               "tgl_bai",
    "CUSTOMERNAME":             "nama_customer",
    "CREATEDON":                "tgl_terbit_pa",
    "KPNODE":                   "kp_node",
    "jenisMutasi":              "jenis_pekerjaan",
    "nomorIo":                  "nomor_io",
    "namaPTL":                  "nama_ptl",
    "namaSales":                "nama_sales",
    "bandwidth":                "bandwidth",
    "Segmentasi":               "segmentasi",
    "Kategori Customer":        "kategori_customer",
    "Kategori Owner":           "kategori_owner",
    "Jenis Layanan":            "jenis_layanan",
    "Kategori Layanan":         "kategori_layanan",
    "Aging PA":                 "aging_pa",
    "Aging Non SC (PA Closed)": "aging_non_sc",
    "Aging SC":                 "aging_sc",
    "PTL Update":               "ptl_update",
    "PA Status":                "status_pa",
    "Kategori Status":          "kategori_status",
    "Kategori Progres":         "kategori_progres",
    "Detail Progres":           "detail_progres",
    "Progress Update":          "progress_update",
    "__gsheet_row__":           "gsheet_row",
}

# Nilai yang dianggap NULL
NULL_VALUES = {"", "#n/a", "n/a", "#value!", "#ref!", "#name?", "-"}

# ── Helper konversi ───────────────────────────────────────────────────────────
def clean(val: str):
    """Return None jika kosong/N/A, else stripped string."""
    v = val.strip() if val else ""
    if v.lower() in NULL_VALUES:
        return None
    return v

def to_float(val: str):
    """Konversi string ke float, handle koma desimal Indonesia."""
    v = clean(val)
    if v is None:
        return None
    try:
        # Ganti koma desimal ke titik
        return float(v.replace(",", "."))
    except (ValueError, AttributeError):
        return None

def to_int(val: str):
    """Konversi ke integer, ambil bagian integer jika ada desimal."""
    v = clean(val)
    if v is None:
        return None
    try:
        # Handle koma desimal — ambil bagian integer
        return int(float(v.replace(",", ".")))
    except (ValueError, AttributeError):
        return None

def to_datetime(val: str):
    """Parse berbagai format tanggal ke datetime."""
    v = clean(val)
    if v is None:
        return None
    formats = [
        "%Y-%m-%d %H:%M",   # 2024-12-13 17:13
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",          # 2024-12-02
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(v.strip(), fmt)
        except ValueError:
            continue
    return None  # format tidak dikenal → NULL

def to_string(val: str, max_len: int = None):
    """Clean string, potong jika terlalu panjang."""
    v = clean(val)
    if v is None:
        return None
    if max_len and len(v) > max_len:
        v = v[:max_len]
    return v

# ── Konversi satu baris CSV ke dict DB ───────────────────────────────────────
def convert_row(csv_row: dict) -> dict:
    r = {}
    for csv_col, db_col in COL_MAP.items():
        val = csv_row.get(csv_col, "")

        if db_col in ("latitude", "longitude", "aging_non_sc", "aging_sc"):
            r[db_col] = to_float(val)

        elif db_col == "aging_pa":
            r[db_col] = to_int(val)

        elif db_col in ("tgl_terbit_pa", "tgl_bai", "tgl_upload_bai"):
            r[db_col] = to_datetime(val)

        elif db_col == "gsheet_row":
            r[db_col] = to_int(val)

        else:
            r[db_col] = to_string(val)

    r["synced_at"] = datetime.now()
    return r

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    if not CSV_FILE.exists():
        raise SystemExit(f"❌ File tidak ditemukan: {CSV_FILE}")

    print(f"📂 Membaca {CSV_FILE}...")
    with open(CSV_FILE, encoding="utf-8-sig") as f:
        raw_rows = list(csv.DictReader(f))

    print(f"✅ {len(raw_rows):,} baris ditemukan")

    # Konversi semua baris
    print("⚙️  Mengkonversi data...")
    db_rows = []
    errors  = []
    seen_gsheet_rows = set()
    for i, row in enumerate(raw_rows):
        try:
            converted = convert_row(row)
            gsheet_row = converted.get("gsheet_row")
            if gsheet_row is None:
                errors.append(f"Baris {i+2}: gsheet_row kosong, skip")
                continue
            if gsheet_row in seen_gsheet_rows:
                errors.append(f"Baris {i+2}: gsheet_row {gsheet_row} duplikat, skip")
                continue
            seen_gsheet_rows.add(gsheet_row)
            db_rows.append(converted)
        except Exception as e:
            errors.append(f"Baris {i+2}: {e}")

    print(f"✅ {len(db_rows):,} baris siap diimport")
    if errors:
        print(f"⚠️  {len(errors)} baris error:")
        for e in errors[:5]:
            print(f"   {e}")

    # Koneksi ke DB
    print(f"\n🔌 Menghubungkan ke PostgreSQL...")
    try:
        conn = psycopg2.connect(PSYCOPG2_DSN)
        conn.autocommit = False
        cur  = conn.cursor()
        print("✅ Koneksi berhasil")
    except Exception as e:
        raise SystemExit(f"❌ Gagal konek DB: {e}")

    # Cek apakah tabel sudah ada
    cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='pa_records')")
    if not cur.fetchone()[0]:
        conn.close()
        raise SystemExit("❌ Tabel pa_records belum ada. Jalankan: ./venv/bin/alembic upgrade head")

    # Cek data existing
    cur.execute("SELECT COUNT(*) FROM pa_records")
    existing = cur.fetchone()[0]
    if existing > 0:
        print(f"⚠️  Tabel sudah ada {existing:,} baris — akan di-upsert (update jika gsheet_row sama)")

    # Upsert batch
    print(f"\n⏳ Mengimport {len(db_rows):,} baris ke pa_records...")

    cols = list(db_rows[0].keys())
    BATCH = 500
    inserted = 0
    updated  = 0

    for start in range(0, len(db_rows), BATCH):
        batch = db_rows[start:start + BATCH]
        values = [tuple(row[c] for c in cols) for row in batch]

        # UPSERT: ON CONFLICT gsheet_row → UPDATE semua kolom
        update_cols = [c for c in cols if c != "gsheet_row"]
        update_set  = ", ".join(f"{c} = EXCLUDED.{c}" for c in update_cols)

        sql = f"""
            INSERT INTO pa_records ({", ".join(cols)})
            VALUES %s
            ON CONFLICT (gsheet_row) DO UPDATE SET {update_set}
        """

        try:
            execute_values(cur, sql, values, page_size=BATCH)
            conn.commit()
            inserted += len(batch)
            pct = inserted / len(db_rows) * 100
            print(f"   [{pct:5.1f}%] {inserted:,} / {len(db_rows):,} baris...", end="\r")
        except Exception as e:
            conn.rollback()
            print(f"\n❌ Error batch {start}-{start+BATCH}: {e}")
            conn.close()
            raise SystemExit("Import gagal.")

    print(f"\n✅ Import selesai!")

    # Verifikasi
    cur.execute("SELECT COUNT(*) FROM pa_records")
    total = cur.fetchone()[0]

    cur.execute("SELECT jenis_pekerjaan, COUNT(*) FROM pa_records GROUP BY jenis_pekerjaan ORDER BY 2 DESC")
    breakdown = cur.fetchall()

    cur.execute("SELECT MIN(synced_at), MAX(synced_at) FROM pa_records")
    sync_time = cur.fetchone()

    conn.close()

    print(f"\n📊 Hasil import:")
    print(f"   Total baris di DB : {total:,}")
    print(f"\n   Distribusi jenis_pekerjaan:")
    for jenis, count in breakdown:
        print(f"   {(jenis or '-'):<20} : {count:,}")
    print(f"\n   Synced at: {sync_time[0]} – {sync_time[1]}")
    print(f"\n✅ Done! Tabel pa_records siap digunakan.")

if __name__ == "__main__":
    main()