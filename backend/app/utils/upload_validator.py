"""
upload_validator.py
Validasi file upload SVG untuk AsBuilt dan gambar untuk Teskom.
"""
from fastapi import UploadFile, HTTPException

ALLOWED_SVG_TYPES = {"image/svg+xml"}
ALLOWED_SVG_EXT   = {".svg"}


def validate_svg_upload(file: UploadFile) -> None:
    """
    Validasi bahwa file yang diupload adalah file SVG.
    Raise HTTPException 400 jika tidak valid.
    """
    ext = ("." + file.filename.rsplit(".", 1)[-1].lower()) if "." in file.filename else ""
    is_valid_type = file.content_type in ALLOWED_SVG_TYPES
    is_valid_ext  = ext in ALLOWED_SVG_EXT

    if not (is_valid_type or is_valid_ext):
        raise HTTPException(
            status_code=400,
            detail="Hanya file .svg yang diperbolehkan untuk AsBuilt template!"
        )
