"""
_pa_record.py
Helper: konversi PARecord ORM model → dict untuk response API.
Aging dihitung live dari tgl_terbit_pa (bukan dari kolom aging_pa di DB).
"""
from datetime import datetime
from typing import Optional

from app.db.models import PARecord
from app.services.aging import calculate_aging, calculate_aging_days


def _fmt_date(dt: Optional[datetime]) -> str:
    """Format datetime ke string 'YYYY-MM-DD HH:MM'. Kosong jika None."""
    if dt is None:
        return ""
    return dt.strftime("%Y-%m-%d %H:%M")


def _pa_record_to_dict(rec: PARecord) -> dict:
    """
    Konversi satu PARecord ke dict.
    Kolom aging dihitung live menggunakan status_pa (bukan kategori_status).
    """
    tgl_str = _fmt_date(rec.tgl_terbit_pa)

    # Hitung aging live — gunakan status_pa ("Status PA") yang berisi "Done BAI"
    aging_label = calculate_aging(
        tgl_terbit_str=tgl_str,
        tgl_upload_bai=rec.tgl_upload_bai,
        status_pa=rec.status_pa,          # ← FIX: bukan rec.kategori_status
    )
    aging_days = calculate_aging_days(
        tgl_terbit_str=tgl_str,
        tgl_upload_bai=rec.tgl_upload_bai,
        status_pa=rec.status_pa,          # ← FIX: bukan rec.kategori_status
    )

    return {
        "id":              rec.id,
        "gsheet_row":      rec.gsheet_row,
        "data": {
            # ── Identitas ──
            "ID PA":                    rec.id_pa            or "",
            "NODE":                     rec.node             or "",
            "ID PERMOHONAN":            rec.id_permohonan    or "",
            "SERVICE ID":               rec.service_id       or "",
            "NAMA PRODUK":              rec.nama_produk      or "",
            "JENIS LAYANAN":            rec.jenis_layanan    or "",
            "KATEGORI LAYANAN":         rec.kategori_layanan or "",
            "SEGMENTASI":               rec.segmentasi       or "",
            "KATEGORI CUSTOMER":        rec.kategori_customer or "",
            "KATEGORI OWNER":           rec.kategori_owner   or "",
            "BANDWIDTH":                rec.bandwidth        or "",
            "ALAMAT":                   rec.alamat           or "",
            "KP NODE":                  rec.kp_node          or "",
            "LATITUDE":                 str(rec.latitude)    if rec.latitude  is not None else "",
            "LONGITUDE":                str(rec.longitude)   if rec.longitude is not None else "",
            "NAMA CUSTOMER":            rec.nama_customer    or "",
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
        "created_at":  rec.created_at.isoformat()  if rec.created_at  else None,
        "updated_at":  rec.updated_at.isoformat()  if rec.updated_at  else None,
    }
