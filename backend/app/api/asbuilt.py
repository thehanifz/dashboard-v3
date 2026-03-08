"""
asbuilt.py
API endpoint untuk manajemen SVG template As-Built.
- List template
- Upload template baru
- Ambil detail field template
- Generate SVG dari template + data isian
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from pathlib import Path

from app.core.config import SVG_TEMPLATE_DIR
from app.utils.svg_parser import scan_variables, inject_data
from app.utils.upload_validator import validate_svg_upload

router = APIRouter(tags=["asbuilt"])


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
