"""
aging.py
Hitung aging (durasi berjalan) dari TGL TERBIT PA sampai hari ini.
Menggantikan kolom DURASI yang tidak update di GSheet.
"""
from datetime import datetime


def calculate_aging(tgl_terbit_str: str) -> str:
    """
    Hitung aging dari tanggal terbit PA hingga sekarang.
    Format input: '2025-11-05 10:52' atau '2025-11-05' atau '05/11/2025'
    Format output: 'X Hari Y Jam Z Menit' atau '-' jika gagal parse
    """
    if not tgl_terbit_str or not tgl_terbit_str.strip():
        return "-"

    tgl_str = tgl_terbit_str.strip()
    tgl = None

    for fmt in ["%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y %H:%M", "%d/%m/%Y"]:
        try:
            tgl = datetime.strptime(tgl_str, fmt)
            break
        except ValueError:
            continue

    if tgl is None:
        return "-"

    now   = datetime.now()
    delta = now - tgl

    if delta.total_seconds() < 0:
        return "-"

    total_seconds = int(delta.total_seconds())
    days          = total_seconds // 86400
    remaining     = total_seconds % 86400
    hours         = remaining // 3600
    minutes       = (remaining % 3600) // 60

    if days > 0:
        return f"{days} Hari {hours} Jam {minutes} Menit"
    elif hours > 0:
        return f"{hours} Jam {minutes} Menit"
    else:
        return f"{minutes} Menit"


def calculate_aging_days(tgl_terbit_str: str) -> int:
    """
    Kembalikan aging dalam hari (integer) untuk sorting/filtering.
    Return -1 jika gagal parse.
    """
    if not tgl_terbit_str or not tgl_terbit_str.strip():
        return -1

    tgl_str = tgl_terbit_str.strip()
    tgl = None

    for fmt in ["%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y %H:%M", "%d/%m/%Y"]:
        try:
            tgl = datetime.strptime(tgl_str, fmt)
            break
        except ValueError:
            continue

    if tgl is None:
        return -1

    delta = datetime.now() - tgl
    return max(0, delta.days)
