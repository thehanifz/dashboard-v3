"""
asbuilt.py
API endpoint untuk manajemen SVG template As-Built.
- List template
- Upload template baru
- Ambil detail field template
- Generate SVG dari template + data isian
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, Response, FileResponse
from pydantic import BaseModel
from pathlib import Path
import re

from app.core.config import SVG_TEMPLATE_DIR, FREE_DRAWING_ICON_DIR
from app.utils.svg_parser import scan_variables, inject_data
from app.utils.upload_validator import validate_svg_upload

router = APIRouter(tags=["asbuilt"])


ICON_EXTENSIONS = {".png", ".svg"}
ICON_CONTENT_TYPES = {"image/png", "image/svg+xml"}
MAX_ICON_BYTES = 5 * 1024 * 1024

def _safe_icon_name(filename: str) -> str:
    name = Path(filename or "").name
    if not name or name != filename or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._ -]{0,119}", name):
        raise HTTPException(status_code=400, detail="Nama icon tidak valid")
    if Path(name).suffix.lower() not in ICON_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Icon hanya boleh PNG atau SVG")
    return name


class GenerateRequest(BaseModel):
    filename: str
    data: dict


@router.get("/templates", response_model=list[str])
def list_templates():
    """List semua template SVG yang tersedia."""
    try:
        files = sorted(f.name for f in SVG_TEMPLATE_DIR.iterdir() if f.suffix == ".svg")
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal baca folder template: {e}")


@router.post("/templates/upload")
async def upload_template(svgFile: UploadFile = File(...)):
    """Upload template SVG baru. Wajib memiliki minimal 1 variabel {field_...}."""
    validate_svg_upload(svgFile)

    save_path: Path = SVG_TEMPLATE_DIR / svgFile.filename
    content = await svgFile.read()
    save_path.write_bytes(content)

    variables = scan_variables(save_path)
    if not variables:
        save_path.unlink()
        raise HTTPException(
            status_code=400,
            detail="File SVG tidak memiliki variabel {field_...}! Tambahkan placeholder terlebih dahulu."
        )

    return JSONResponse(content={
        "message": "Upload berhasil",
        "filename": svgFile.filename,
        "fields": variables,
    })


@router.get("/templates/{filename}")
def get_template_detail(filename: str) -> JSONResponse:
    """Ambil daftar field/variabel dari template SVG tertentu."""
    file_path: Path = SVG_TEMPLATE_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Template '{filename}' tidak ditemukan")

    return JSONResponse(content={
        "filename": filename,
        "fields": scan_variables(file_path),
    })


@router.post("/generate")
def generate_svg(body: GenerateRequest) -> Response:
    """Generate SVG final dengan menginjeksi data ke dalam template."""
    file_path: Path = SVG_TEMPLATE_DIR / body.filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Template '{body.filename}' tidak ditemukan")

    svg_content = inject_data(file_path, body.data)
    if svg_content is None:
        raise HTTPException(status_code=500, detail="Gagal generate SVG")

    return Response(content=svg_content, media_type="image/svg+xml")


@router.delete("/templates/{filename}")
def delete_template(filename: str):
    """Hapus template SVG."""
    file_path: Path = SVG_TEMPLATE_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Template '{filename}' tidak ditemukan")

    file_path.unlink()
    return {"ok": True, "message": f"Template '{filename}' berhasil dihapus"}


@router.get("/icons")
def list_icons():
    """List semua icon Free Drawing yang tersedia. Icon bersifat append-only dari UI."""
    try:
        return sorted(
            {f.name for f in FREE_DRAWING_ICON_DIR.iterdir() if f.is_file() and f.suffix.lower() in ICON_EXTENSIONS},
            key=str.lower,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal baca icon library: {e}")


@router.get("/icons/{filename}")
def get_icon(filename: str):
    """Serve icon Free Drawing."""
    name = _safe_icon_name(filename)
    file_path = FREE_DRAWING_ICON_DIR / name
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail=f"Icon '{name}' tidak ditemukan")
    return FileResponse(file_path)


@router.post("/icons/upload")
async def upload_icon(iconFile: UploadFile = File(...)):
    """Tambahkan icon baru ke library. Tidak ada endpoint delete/replace."""
    name = _safe_icon_name(iconFile.filename or "")
    if iconFile.content_type not in ICON_CONTENT_TYPES and Path(name).suffix.lower() not in ICON_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Icon hanya boleh PNG atau SVG")

    save_path = FREE_DRAWING_ICON_DIR / name
    if save_path.exists():
        raise HTTPException(status_code=409, detail=f"Icon '{name}' sudah ada")

    content = await iconFile.read()
    if not content:
        raise HTTPException(status_code=400, detail="File icon kosong")
    if len(content) > MAX_ICON_BYTES:
        raise HTTPException(status_code=400, detail="Ukuran icon maksimal 5 MB")

    save_path.write_bytes(content)
    return {"ok": True, "filename": name}
