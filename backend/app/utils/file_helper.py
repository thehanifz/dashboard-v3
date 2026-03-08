"""
file_helper.py
Utilitas pengelolaan file temporary untuk proses generate dokumen Teskom.
"""
import os
import uuid
import shutil

from app.core.config import TMP_DIR


def create_tmp_dir() -> str:
    """Buat direktori temporary unik per request."""
    path = os.path.join(TMP_DIR, str(uuid.uuid4()))
    os.makedirs(path, exist_ok=True)
    return path


def cleanup_tmp_dir(path: str):
    """Hapus direktori temporary setelah response dikirim."""
    try:
        if os.path.exists(path):
            shutil.rmtree(path)
    except Exception as e:
        print(f"[file_helper] Gagal cleanup {path}: {e}")


def get_output_path(tmp_dir: str, no_pa: str) -> str:
    """Buat path untuk file DOCX output."""
    safe_pa = (no_pa or "dokumen").replace("/", "-").replace(" ", "_")
    return os.path.join(tmp_dir, f"BAI_BATC_{safe_pa}.docx")


def validate_image_file(filename: str, size_bytes: int, max_bytes: int) -> str | None:
    """
    Validasi file gambar.
    Return pesan error (str) jika invalid, None jika valid.
    """
    ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp"}
    ext = os.path.splitext(filename.lower())[1]

    if ext not in ALLOWED_EXT:
        return f"Format '{ext}' tidak didukung. Gunakan JPG, PNG, atau WEBP."

    if size_bytes > max_bytes:
        mb     = size_bytes / (1024 * 1024)
        max_mb = max_bytes / (1024 * 1024)
        return f"Ukuran file {mb:.1f} MB melebihi batas {max_mb:.0f} MB."

    return None
