"""
aging.py
Hitung aging (durasi berjalan) dari TGL TERBIT PA.

Dua rumus:
  - PA on-progress : tgl_terbit_pa → hari ini (live)
  - PA Done BAI    : tgl_terbit_pa → tgl_upload_bai (beku)

CATATAN KOLOM:
  status_pa        = kolom "Status PA" di GSheet  → berisi "Done BAI", "On Progress", dst.
  kategori_status  = kolom "Kategori PA" di GSheet → berisi "AKTIVASI", "RETENDER", dst.
  Parameter fungsi ini menggunakan status_pa (bukan kategori_status).
"""
from datetime import datetime
from typing import Optional


def _parse_tgl(tgl_str: str) -> Optional[datetime]:
    """Parse string tanggal ke datetime. Return None jika gagal."""
    if not tgl_str or not tgl_str.strip():
        return None
    for fmt in ["%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y %H:%M", "%d/%m/%Y"]:
        try:
            return datetime.strptime(tgl_str.strip(), fmt)
        except ValueError:
            continue
    return None


def _resolve_end_date(
    tgl_upload_bai,
    status_pa: Optional[str],
) -> datetime:
    """
    Tentukan tanggal akhir hitung aging.
    - Done BAI + tgl_upload_bai tersedia → pakai tgl_upload_bai (beku)
    - Selain itu → hari ini (live)

    Args:
        tgl_upload_bai : datetime atau string TGL UPLOAD BAI
        status_pa      : nilai kolom "Status PA" dari DB (cek 'Done BAI')
    """
    is_done = (status_pa or "").strip().lower() == "done bai"
    if is_done and tgl_upload_bai:
        if isinstance(tgl_upload_bai, datetime):
            return tgl_upload_bai
        parsed = _parse_tgl(str(tgl_upload_bai))
        if parsed:
            return parsed
    return datetime.now()


def calculate_aging(
    tgl_terbit_str: str,
    tgl_upload_bai=None,
    status_pa: Optional[str] = None,
) -> str:
    """
    Hitung aging dari tanggal terbit PA.
    Format output: 'X Hari Y Jam Z Menit' atau '-' jika gagal parse.

    Args:
        tgl_terbit_str : string TGL TERBIT PA
        tgl_upload_bai : datetime atau string TGL UPLOAD BAI (opsional)
        status_pa      : nilai kolom "Status PA" dari DB (cek 'Done BAI')
    """
    tgl = _parse_tgl(tgl_terbit_str)
    if tgl is None:
        return "-"

    end = _resolve_end_date(tgl_upload_bai, status_pa)
    delta = end - tgl

    if delta.total_seconds() < 0:
        return "-"

    total_seconds = int(delta.total_seconds())
    days      = total_seconds // 86400
    remaining = total_seconds % 86400
    hours     = remaining // 3600
    minutes   = (remaining % 3600) // 60

    if days > 0:
        return f"{days} Hari {hours} Jam {minutes} Menit"
    elif hours > 0:
        return f"{hours} Jam {minutes} Menit"
    else:
        return f"{minutes} Menit"


def calculate_aging_days(
    tgl_terbit_str: str,
    tgl_upload_bai=None,
    status_pa: Optional[str] = None,
) -> int:
    """
    Kembalikan aging dalam hari (integer) untuk sorting/filtering.
    Return -1 jika gagal parse.

    Args:
        tgl_terbit_str : string TGL TERBIT PA
        tgl_upload_bai : datetime atau string TGL UPLOAD BAI (opsional)
        status_pa      : nilai kolom "Status PA" dari DB (cek 'Done BAI')
    """
    tgl = _parse_tgl(tgl_terbit_str)
    if tgl is None:
        return -1

    end = _resolve_end_date(tgl_upload_bai, status_pa)
    delta = end - tgl
    return max(0, delta.days)
