"""
_pa_record.py
Helper & konstanta untuk modul records:
  - PA_RECORD_COL_DISPLAY  : list kolom tampilan (urutan kolom tabel)
  - DISPLAY_TO_DB_COL      : mapping nama-display → nama atribut PARecord
  - DATE_COLS / FLOAT_COLS : set kolom bertipe date / float
  - _pa_record_to_dict()   : konversi PARecord ORM → dict API response
  - get_engineer_records_from_pg() : query semua record dari PG untuk engineer

Aging dihitung LIVE dari tgl_terbit_pa menggunakan status_pa (bukan kategori_status).
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import PARecord
from app.services.aging import calculate_aging, calculate_aging_days


# ─── Kolom tampilan (urutan kolom di tabel frontend) ─────────────────────────
PA_RECORD_COL_DISPLAY: list[str] = [
    "ID PA",
    "NODE",
    "ID PERMOHONAN",
    "SERVICE ID",
    "NAMA PRODUK",
    "JENIS LAYANAN",
    "KATEGORI LAYANAN",
    "SEGMENTASI",
    "KATEGORI CUSTOMER",
    "KATEGORI OWNER",
    "BANDWIDTH",
    "ALAMAT",
    "KP NODE",
    "LATITUDE",
    "LONGITUDE",
    "NAMA CUSTOMER",
    "TGL TERBIT PA",
    "TGL BAI",
    "TGL UPLOAD BAI",
    "JENIS PEKERJAAN",
    "NOMOR IO",
    "Status PA",
    "Kategori PA",
    "Status Pekerjaan",
    "Detail Progres",
    "KETERANGAN UPDATE DETAIL",
    "Nama PTL",
    "Nama Sales",
    "PTL Update",
    "Aging PA",
    "Aging PA (hari)",
]

# ─── Mapping nama-display → atribut PARecord ─────────────────────────────────
DISPLAY_TO_DB_COL: dict[str, str] = {
    "ID PA":                      "id_pa",
    "NODE":                       "node",
    "ID PERMOHONAN":              "id_permohonan",
    "SERVICE ID":                 "service_id",
    "NAMA PRODUK":                "nama_produk",
    "JENIS LAYANAN":              "jenis_layanan",
    "KATEGORI LAYANAN":           "kategori_layanan",
    "SEGMENTASI":                 "segmentasi",
    "KATEGORI CUSTOMER":          "kategori_customer",
    "KATEGORI OWNER":             "kategori_owner",
    "BANDWIDTH":                  "bandwidth",
    "ALAMAT":                     "alamat",
    "KP NODE":                    "kp_node",
    "LATITUDE":                   "latitude",
    "LONGITUDE":                  "longitude",
    "NAMA CUSTOMER":              "nama_customer",
    "TGL TERBIT PA":              "tgl_terbit_pa",
    "TGL BAI":                    "tgl_bai",
    "TGL UPLOAD BAI":             "tgl_upload_bai",
    "JENIS PEKERJAAN":            "jenis_pekerjaan",
    "NOMOR IO":                   "nomor_io",
    "Status PA":                  "status_pa",
    "Kategori PA":                "kategori_status",
    "Status Pekerjaan":           "kategori_progres",
    "Detail Progres":             "detail_progres",
    "KETERANGAN UPDATE DETAIL":   "progress_update",
    "Nama PTL":                   "nama_ptl",
    "Nama Sales":                 "nama_sales",
    "PTL Update":                 "ptl_update",
    "Aging PA":                   "aging_pa",
}

# ─── Tipe kolom khusus ────────────────────────────────────────────────────────
DATE_COLS:  set[str] = {"tgl_terbit_pa", "tgl_bai", "tgl_upload_bai"}
FLOAT_COLS: set[str] = {"latitude", "longitude"}


# ─── Helper ───────────────────────────────────────────────────────────────────
def _fmt_date(dt: Optional[datetime]) -> str:
    """Format datetime ke string 'YYYY-MM-DD HH:MM'. Kosong jika None."""
    if dt is None:
        return ""
    return dt.strftime("%Y-%m-%d %H:%M")


def _pa_record_to_dict(rec: PARecord) -> dict:
    """
    Konversi satu PARecord ke dict untuk response API.
    Aging dihitung LIVE menggunakan status_pa (kolom "Status PA"),
    bukan kategori_status (kolom "Kategori PA").
    PARecord tidak punya created_at — gunakan synced_at & updated_at.
    """
    tgl_str = _fmt_date(rec.tgl_terbit_pa)

    # FIX: gunakan rec.status_pa bukan rec.kategori_status
    aging_label = calculate_aging(
        tgl_terbit_str=tgl_str,
        tgl_upload_bai=rec.tgl_upload_bai,
        status_pa=rec.status_pa,
    )
    aging_days = calculate_aging_days(
        tgl_terbit_str=tgl_str,
        tgl_upload_bai=rec.tgl_upload_bai,
        status_pa=rec.status_pa,
    )

    return {
        "id":         rec.id,
        "gsheet_row": rec.gsheet_row,
        "data": {
            # ── Identitas ──
            "ID PA":                    rec.id_pa             or "",
            "NODE":                     rec.node              or "",
            "ID PERMOHONAN":            rec.id_permohonan     or "",
            "SERVICE ID":               rec.service_id        or "",
            "NAMA PRODUK":              rec.nama_produk       or "",
            "JENIS LAYANAN":            rec.jenis_layanan     or "",
            "KATEGORI LAYANAN":         rec.kategori_layanan  or "",
            "SEGMENTASI":               rec.segmentasi        or "",
            "KATEGORI CUSTOMER":        rec.kategori_customer or "",
            "KATEGORI OWNER":           rec.kategori_owner    or "",
            "BANDWIDTH":                rec.bandwidth         or "",
            "ALAMAT":                   rec.alamat            or "",
            "KP NODE":                  rec.kp_node           or "",
            "LATITUDE":  str(rec.latitude)  if rec.latitude  is not None else "",
            "LONGITUDE": str(rec.longitude) if rec.longitude is not None else "",
            "NAMA CUSTOMER":            rec.nama_customer     or "",
            # ── Tanggal ──
            "TGL TERBIT PA":            tgl_str,
            "TGL BAI":                  _fmt_date(rec.tgl_bai),
            "TGL UPLOAD BAI":           _fmt_date(rec.tgl_upload_bai),
            # ── Pekerjaan ──
            "JENIS PEKERJAAN":          rec.jenis_pekerjaan  or "",
            "NOMOR IO":                 rec.nomor_io         or "",
            "Status PA":                rec.status_pa        or "",
            "Kategori PA":              rec.kategori_status  or "",
            "Status Pekerjaan":         rec.kategori_progres or "",
            "Detail Progres":           rec.detail_progres   or "",
            "KETERANGAN UPDATE DETAIL": rec.progress_update  or "",
            "Nama PTL":                 rec.nama_ptl         or "",
            "Nama Sales":               rec.nama_sales       or "",
            "PTL Update":               rec.ptl_update       or "",
            # ── Aging (live) ──
            "Aging PA":                 aging_label,
            "Aging PA (hari)":          aging_days,
        },
        "synced_at":  rec.synced_at.isoformat()  if rec.synced_at  else None,
        "updated_at": rec.updated_at.isoformat() if rec.updated_at else None,
    }


async def get_engineer_records_from_pg(db: AsyncSession) -> dict:
    """Ambil semua PARecord dari PostgreSQL, konversi ke format API response."""
    result  = await db.execute(select(PARecord).order_by(PARecord.gsheet_row))
    records = result.scalars().all()
    return {
        "records":  [_pa_record_to_dict(r) for r in records],
        "total":    len(records),
        "columns":  PA_RECORD_COL_DISPLAY,
    }
