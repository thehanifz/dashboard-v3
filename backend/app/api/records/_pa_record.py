"""
records/_pa_record.py
Mapping kolom DB ↔ display, helper konversi PARecord, dan query PostgreSQL.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models import PARecord
from app.services.aging import calculate_aging_days

# ── Mapping: kolom DB PostgreSQL → nama kolom tampilan (frontend / GSheet) ──
PA_RECORD_COL_DISPLAY: dict[str, str] = {
    "id_pa":             "ID PA",
    "node":              "NODE",
    "id_permohonan":     "ID PERMOHONAN",
    "service_id":        "SERVICE ID",
    "nama_produk":       "NAMA PRODUK",
    "jenis_layanan":     "JENIS LAYANAN",
    "kategori_layanan":  "KATEGORI LAYANAN",
    "segmentasi":        "SEGMENTASI",
    "kategori_customer": "KATEGORI CUSTOMER",
    "kategori_owner":    "KATEGORI OWNER",
    "bandwidth":         "BANDWIDTH",
    "alamat":            "ALAMAT",
    "kp_node":           "KP NODE",
    "latitude":          "LATITUDE",
    "longitude":         "LONGITUDE",
    "nama_customer":     "NAMA CUSTOMER",
    "tgl_terbit_pa":     "TGL TERBIT PA",
    "tgl_bai":           "TGL BAI",
    "tgl_upload_bai":    "TGL UPLOAD BAI",
    "jenis_pekerjaan":   "JENIS PEKERJAAN",
    "nomor_io":          "NOMOR IO",
    "status_pa":         "Status PA",
    "kategori_status":   "Kategori PA",
    "kategori_progres":  "Status Pekerjaan",
    "detail_progres":    "Detail Progres",
    "progress_update":   "KETERANGAN UPDATE DETAIL",
    "aging_pa":          "Aging PA",
    "aging_non_sc":      "Aging Non SC",
    "aging_sc":          "Aging SC",
    "nama_ptl":          "Nama PTL",
    "nama_sales":        "Nama Sales",
    "ptl_update":        "PTL Update",
}

DISPLAY_COLUMNS: list[str] = list(PA_RECORD_COL_DISPLAY.values())

# Kebalikan: display name → kolom DB (dipakai saat update cell)
DISPLAY_TO_DB_COL: dict[str, str] = {v: k for k, v in PA_RECORD_COL_DISPLAY.items()}

# Kolom DB yang bertipe tanggal
DATE_COLS = {"tgl_terbit_pa", "tgl_bai", "tgl_upload_bai"}

# Kolom DB yang bertipe float
FLOAT_COLS = {"latitude", "longitude", "aging_non_sc", "aging_sc"}


def _fmt_date(val) -> str:
    """Format datetime object ke string. Return '' jika None."""
    if val is None:
        return ""
    if hasattr(val, "strftime"):
        return (
            val.strftime("%Y-%m-%d %H:%M")
            if (val.hour or val.minute)
            else val.strftime("%Y-%m-%d")
        )
    return str(val)


def _pa_record_to_dict(rec: PARecord) -> dict:
    """Konversi PARecord SQLAlchemy → format {id, row_id, data} (sama dengan format GSheet)."""
    data: dict[str, str] = {}

    for db_col, display_name in PA_RECORD_COL_DISPLAY.items():
        # Aging PA — dihitung live dari tgl_terbit_pa, bukan dari kolom DB
        if db_col == "aging_pa":
            tgl_str = _fmt_date(rec.tgl_terbit_pa)
            aging = calculate_aging_days(
                tgl_terbit_str=tgl_str,
                tgl_upload_bai=rec.tgl_upload_bai,
                kategori_status=rec.kategori_status,
            )
            data[display_name] = str(aging) if aging >= 0 else "-"
            continue

        val = getattr(rec, db_col, None)
        if val is None:
            data[display_name] = ""
        elif hasattr(val, "strftime"):
            data[display_name] = _fmt_date(val)
        else:
            data[display_name] = str(val)

    return {
        "id":     f"rec_{rec.gsheet_row}",
        "row_id": rec.gsheet_row,
        "data":   data,
    }


async def get_engineer_records_from_pg(db: AsyncSession) -> dict:
    """Baca seluruh data Engineer dari PostgreSQL pa_records, diurutkan by gsheet_row."""
    result = await db.execute(select(PARecord).order_by(PARecord.gsheet_row))
    rows   = result.scalars().all()
    return {
        "columns": DISPLAY_COLUMNS,
        "records": [_pa_record_to_dict(r) for r in rows],
        "source":  "postgresql",
        "total":   len(rows),
    }
