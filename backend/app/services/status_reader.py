"""
services/status_reader.py
Baca master data status & detail progres untuk dropdown frontend.
Menggunakan opsi_service sebagai sumber tunggal (dengan cache TTL 5 menit).
"""
from app.services.opsi_service import get_dropdown_options


def read_status_master() -> dict:
    """
    Return:
    {
        "error": None | str,          # None = sukses, str = pesan error GSheet
        "primary": [...],
        "mapping": {...},
        "status_column": "Status Pekerjaan",
        "detail_column": "Detail Progres",
    }
    Frontend wajib cek field 'error' sebelum render dropdown.
    """
    return get_dropdown_options()
