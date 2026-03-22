"""
bai.py
API endpoint untuk generate dokumen BAI (Berita Acara Instalasi).
Data diambil otomatis dari GSheet berdasarkan row_id.
Khusus tipe Terminating (T), tanpa upload foto.
"""
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from starlette.background import BackgroundTask

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.database import get_db
from app.db.models import User
from app.services.sheet_reader import read_sheet
from app.services.bai_renderer import render_bai
from app.services.sync_engine import read_ptl_sheet
from app.utils.file_helper import create_tmp_dir, cleanup_tmp_dir

import re

def _extract_spreadsheet_id(url: str):
    match = re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", url)
    return match.group(1) if match else None

router = APIRouter(tags=["bai"])
log    = logging.getLogger("bai")

BULAN = ["Januari","Februari","Maret","April","Mei","Juni",
         "Juli","Agustus","September","Oktober","November","Desember"]


def format_date_id(date_str: str) -> str:
    """Format YYYY-MM-DD → '26 Februari 2026'"""
    try:
        dt = datetime.strptime(date_str.strip(), "%Y-%m-%d")
        return f"{dt.day} {BULAN[dt.month - 1]} {dt.year}"
    except Exception:
        return date_str


class BaiGeneratePayload(BaseModel):
    tanggal_bai: str | None = None  # YYYY-MM-DD, default = hari ini


def _build_bai_context(data: dict, tanggal_bai_str: str) -> dict:
    """Shared mapping field → context BAI."""
    import re as _re
    keterangan = data.get("KETERANGAN", "")
    bandwidth  = ""
    m = _re.search(r"BANDWIDTH:\s*(\d+(?:\.\d+)?)\s*(MBPS|GBPS|KBPS)?", keterangan, _re.IGNORECASE)
    if m:
        bandwidth = f"{m.group(1)} {(m.group(2) or 'MBPS').upper()}"
    return {
        "tanggal_bai":       tanggal_bai_str,
        "no_pa":             data.get("ID PA", ""),
        "sid":               data.get("SERVICE ID", ""),
        "user":              data.get("NAMA PERUSAHAAN", ""),
        "nama_layanan":      data.get("LAYANAN", ""),
        "bandwidth":         bandwidth,
        "no_surat":          data.get("No Surat Permohonan", ""),
        "vendor_instalasi":  data.get("MITRA TERMINATING", ""),
        "project_team":      data.get("PTL TERMINATING", ""),
        "nama_t":            data.get("ALAMAT TERMINATING", ""),
        "nama_o":            data.get("ALAMAT ORIGINATING", ""),
        "sbu_terminating":   data.get("SBU TERMINATING", ""),
        "kp_terminating":    data.get("KP TERMINATING", ""),
        "pop_terminating":   data.get("POP TERMINATING", ""),
        "sbu_originating":   data.get("SBU ORIGINATING", ""),
        "kp_originating":    data.get("KP ORIGINATING", ""),
        "pop_originating":   data.get("POP ORIGINATING", ""),
        "regional":          data.get("REGIONAL", ""),
        "kantor_perwakilan": data.get("KANTOR PERWAKILAN", ""),
        "nomor_io":          data.get("NOMOR IO", ""),
        "jenis_mutasi":      data.get("JENIS MUTASI", ""),
    }


@router.post("/generate/{row_id}")
async def generate_bai(row_id: int, payload: BaiGeneratePayload):
    """
    Generate dokumen BAI dari data GSheet berdasarkan row_id.
    Tanggal BAI opsional — default hari ini jika tidak diisi.
    """
    if row_id < 2:
        raise HTTPException(status_code=400, detail="row_id harus >= 2")

    # Ambil data dari GSheet
    sheet_data = read_sheet()
    record = next((r for r in sheet_data["records"] if r["row_id"] == row_id), None)

    if not record:
        raise HTTPException(status_code=404, detail=f"Data baris {row_id} tidak ditemukan")

    data = record["data"]

    tgl_raw = (payload.tanggal_bai or "").strip()
    if not tgl_raw:
        tgl_raw = datetime.now().strftime("%Y-%m-%d")
    tanggal_bai_str = format_date_id(tgl_raw)
    context = _build_bai_context(data, tanggal_bai_str)

    log.info("[bai] generate row_id=%d no_pa=%s", row_id, context["no_pa"])

    tmp_dir = create_tmp_dir()
    try:
        output_path = render_bai(context=context, tmp_dir=tmp_dir)

        pa_clean   = context["no_pa"].replace("/", "-").replace(" ", "_") or f"row{row_id}"
        filename   = f"BAI_{pa_clean}.docx"

        return FileResponse(
            path=output_path,
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            background=BackgroundTask(cleanup_tmp_dir, tmp_dir),
        )

    except FileNotFoundError as e:
        cleanup_tmp_dir(tmp_dir)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        cleanup_tmp_dir(tmp_dir)
        log.exception("[bai] generate error row_id=%d", row_id)
        raise HTTPException(status_code=500, detail=f"Gagal generate BAI: {str(e)}")


# ── POST /bai/generate-ptl/{row_id} — BAI dari GSheet PTL ────────────────────
@router.post("/generate-ptl/{row_id}")
async def generate_bai_ptl(
    row_id: int,
    payload: BaiGeneratePayload,
    current_user: User = Depends(require_role("ptl")),
):
    """
    Generate BAI dari GSheet milik PTL yang sedang login.
    row_id merujuk ke baris di GSheet PTL.
    """
    if row_id < 2:
        raise HTTPException(status_code=400, detail="row_id harus >= 2")

    if not current_user.gsheet_url:
        raise HTTPException(status_code=400, detail="GSheet PTL belum dikonfigurasi")

    try:
        ptl_data = read_ptl_sheet(
            current_user.gsheet_url,
            current_user.gsheet_sheet_name,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal baca GSheet PTL: {e}")

    record = next((r for r in ptl_data["records"] if r["row_id"] == row_id), None)
    if not record:
        raise HTTPException(status_code=404, detail=f"Data baris {row_id} tidak ditemukan di GSheet PTL")

    tgl_raw = (payload.tanggal_bai or "").strip()
    if not tgl_raw:
        tgl_raw = datetime.now().strftime("%Y-%m-%d")
    tanggal_bai_str = format_date_id(tgl_raw)
    context = _build_bai_context(record["data"], tanggal_bai_str)

    log.info("[bai-ptl] generate row_id=%d user=%s no_pa=%s", row_id, current_user.username, context["no_pa"])

    tmp_dir = create_tmp_dir()
    try:
        output_path = render_bai(context=context, tmp_dir=tmp_dir)
        pa_clean    = context["no_pa"].replace("/", "-").replace(" ", "_") or f"row{row_id}"
        filename    = f"BAI_{pa_clean}.docx"
        return FileResponse(
            path=output_path,
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            background=BackgroundTask(cleanup_tmp_dir, tmp_dir),
        )
    except FileNotFoundError as e:
        cleanup_tmp_dir(tmp_dir)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        cleanup_tmp_dir(tmp_dir)
        log.exception("[bai-ptl] generate error row_id=%d", row_id)
        raise HTTPException(status_code=500, detail=f"Gagal generate BAI PTL: {str(e)}")