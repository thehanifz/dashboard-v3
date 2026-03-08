"""
status.py
API endpoint untuk membaca master data status dari sheet Opsi.
"""
from fastapi import APIRouter
from app.services.status_reader import read_status_master

router = APIRouter(tags=["status"])


@router.get("")
def get_status():
    """Ambil semua master status & detail progres dari sheet Opsi."""
    return read_status_master()
