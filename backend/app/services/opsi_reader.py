"""
services/opsi_reader.py
Auto-fill Status PA & Kategori PA berdasarkan pilihan Status Pekerjaan user.
Menggunakan opsi_service sebagai sumber tunggal (dengan cache TTL 5 menit).

Dipanggil setiap kali user update Status Pekerjaan di dashboard.
"""
from app.services.opsi_service import get_status_mapping


def get_opsi_mapping() -> dict[str, dict[str, str]]:
    """
    Return dict mapping Status Pekerjaan -> {Status PA, Kategori PA}:
    {
        "Need Cancel":        {"Status PA": "On Progress", "Kategori PA": "Need Cancel"},
        "Survey":             {"Status PA": "On Progress", "Kategori PA": "On Progress"},
        "Test Commissioning": {"Status PA": "On Progress", "Kategori PA": "On Progress"},
        ...
    }
    Return dict kosong jika GSheet gagal — caller (records.py / teskom.py) harus handle.
    """
    return get_status_mapping()
