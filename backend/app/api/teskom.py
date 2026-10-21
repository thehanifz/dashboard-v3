# backend/app/api/teskom.py
"""
teskom.py — API endpoint Test Commissioning

Sumber data:
  - engineer / mitra → PostgreSQL (tabel pa_records)
  - ptl             → GSheet milik PTL masing-masing

Auth guard:
  - GET  /autofill/{id_pa}      → engineer | mitra
  - GET  /autofill-ptl/{id_pa}  → ptl
  - POST /generate              → engineer | mitra | ptl
"""
import re, logging
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Query
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from starlette.background import BackgroundTask

from pydantic import BaseModel, Field

from app.core.config import MAX_UPLOAD_BYTES
from app.core.deps import require_role, get_current_user
from app.db.database import get_db
from app.db.models import User, PARecord, TeskomWakilUser
from app.services.renderer_registry import is_supported, all_kategori
from app.services.sync_engine import read_ptl_sheet
from app.services.doc_renderer import render_doc
from app.utils.file_helper import create_tmp_dir, cleanup_tmp_dir, validate_image_file

router = APIRouter(tags=["teskom"])
log    = logging.getLogger("teskom")

HARI  = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"]
BULAN = ["Januari","Februari","Maret","April","Mei","Juni",
         "Juli","Agustus","September","Oktober","November","Desember"]

def parse_date_id(date_str: str):
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return (HARI[dt.weekday()], str(dt.day), BULAN[dt.month-1], str(dt.year))
    except Exception:
        return ("","","","")

def format_date_id(date_str: str) -> str:
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return f"{dt.day} {BULAN[dt.month-1]} {dt.year}"
    except Exception:
        return date_str

def opt(v) -> str:
    return (v or "").strip()

def parse_bandwidth(keterangan: str) -> str:
    if not keterangan:
        return ""
    m = re.search(r"BANDWIDTH:\s*(\S+(?:\s+\S+)?)", keterangan, re.IGNORECASE)
    if m:
        m2 = re.match(r"(\d+(?:\.\d+)?)\s*(MBPS|GBPS|KBPS)?", m.group(1), re.IGNORECASE)
        if m2:
            return f"{m2.group(1)} {(m2.group(2) or 'MBPS').upper()}"
    return ""

def check_file_opt(upload: Optional[UploadFile], field_name: str):
    if not upload or not upload.filename:
        return
    err = validate_image_file(upload.filename, upload.size or 0, MAX_UPLOAD_BYTES)
    if err:
        raise HTTPException(status_code=422, detail=f"[{field_name}] {err}")


def _build_autofill_from_pa_record(record: PARecord) -> dict:
    """Mapping PARecord (PostgreSQL) → autofill payload."""
    return {
        "ok": True,
        "id_pa": record.id_pa or "",
        "row_id": record.gsheet_row,
        "autofill": {
            "no_pa":              record.id_pa or "",
            "no_pa_raw":          record.id_pa or "",
            "sid":                record.service_id or "",
            "user":               record.nama_customer or "",
            "nama_layanan":       record.nama_produk or "",
            "bandwidth":          record.bandwidth or "",
            "no_surat":           record.id_permohonan or "",
            "vendor_instalasi":   "",  # tidak ada di PARecord, diisi manual
            "project_team":       record.nama_ptl or "",
            "nama_t":             record.alamat or "",
            "nama_o":             "",  # originating tidak ada di PARecord
            "alamat_kantor_user": record.alamat or "",
            "tgl_terbit_pa":      record.tgl_terbit_pa.strftime("%Y-%m-%d") if record.tgl_terbit_pa else "",
        },
    }


def _build_autofill_from_sheet_record(record: dict) -> dict:
    """Mapping record GSheet PTL → autofill payload (khusus PTL)."""
    data = record["data"]
    return {
        "ok": True,
        "id_pa": data.get("ID PA", ""),
        "row_id": record["row_id"],
        "autofill": {
            "no_pa":              data.get("ID PA", ""),
            "no_pa_raw":          data.get("ID PA", ""),
            "sid":                data.get("SERVICE ID", ""),
            "user":               data.get("NAMA PERUSAHAAN", ""),
            "nama_layanan":       data.get("LAYANAN", ""),
            "bandwidth":          parse_bandwidth(data.get("KETERANGAN", "")),
            "no_surat":           data.get("No Surat Permohonan", ""),
            "vendor_instalasi":   data.get("MITRA TERMINATING", ""),
            "project_team":       data.get("PTL TERMINATING", ""),
            "nama_t":             data.get("ALAMAT TERMINATING", ""),
            "nama_o":             data.get("ALAMAT ORIGINATING", ""),
            "alamat_kantor_user": data.get("ALAMAT TERMINATING", ""),
            "tgl_terbit_pa":      data.get("TGL TERBIT PA", ""),
        },
    }


# ── GET /teskom/autofill/{id_pa} — autofill dari PostgreSQL (engineer | mitra) ──
@router.get("/autofill/{id_pa}")
async def autofill_from_postgres(
    id_pa: str,
    node: str = Query(default="TERMINATING", description="Node: TERMINATING atau ORIGINATING"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("engineer", "mitra")),
):
    """
    Autofill Teskom dari PostgreSQL (tabel pa_records).
    Hanya bisa diakses oleh role engineer dan mitra.
    Query param ?node=TERMINATING (default) atau ?node=ORIGINATING.
    """
    node_upper = node.strip().upper()

    stmt = select(PARecord).where(PARecord.id_pa == id_pa.strip())

    # Filter node jika kolom ada di model
    if hasattr(PARecord, "node"):
        stmt = stmt.where(func.upper(func.trim(PARecord.node)) == node_upper)

    result = await db.execute(stmt)
    record = result.scalars().first()

    if not record:
        raise HTTPException(
            status_code=404,
            detail=f"ID PA '{id_pa}' node '{node_upper}' tidak ditemukan"
        )

    return JSONResponse(content=_build_autofill_from_pa_record(record))


# ── GET /teskom/autofill-ptl/{id_pa} — autofill dari GSheet PTL ──────────────
@router.get("/autofill-ptl/{id_pa}")
async def autofill_from_ptl_gsheet(
    id_pa: str,
    current_user: User = Depends(require_role("ptl")),
):
    """
    Autofill Teskom dari GSheet milik PTL yang sedang login.
    """
    if not current_user.gsheet_url:
        raise HTTPException(status_code=400, detail="GSheet PTL belum dikonfigurasi")

    try:
        ptl_data = read_ptl_sheet(
            current_user.gsheet_url,
            current_user.gsheet_sheet_name,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal baca GSheet PTL: {e}")

    target = id_pa.strip().lower()
    record = next(
        (r for r in ptl_data["records"]
         if r["data"].get("ID PA", "").strip().lower() == target),
        None,
    )
    if not record:
        raise HTTPException(status_code=404, detail=f"ID PA '{id_pa}' tidak ditemukan di GSheet PTL")

    return JSONResponse(content=_build_autofill_from_sheet_record(record))


# ── POST /teskom/generate — generate dokumen (engineer | mitra | ptl) ─────────
@router.post("/generate")
async def generate_teskom(
    tipe:               str = Form(...),
    kategori_layanan:   str = Form(...),
    tanggal_bai:        Optional[str] = Form(None),
    nama_layanan:       Optional[str] = Form(None),
    user:               Optional[str] = Form(None),
    sid:                Optional[str] = Form(None),
    bandwidth:          Optional[str] = Form(None),
    peruntukan_layanan: Optional[str] = Form(None),
    no_pa:              Optional[str] = Form(None),
    project_team:       Optional[str] = Form(None),
    nama_wakil_user:    Optional[str] = Form(None),
    jabatan_user:       Optional[str] = Form(None),
    no_hp_user:         Optional[str] = Form(None),
    alamat_kantor_user: Optional[str] = Form(None),
    vendor_instalasi:   Optional[str] = Form(None),
    jarak_otdr:         Optional[str] = Form(None),
    no_surat:           Optional[str] = Form(None),
    tgl_surat:          Optional[str] = Form(None),
    nama_t:             Optional[str] = Form(None),
    perangkat_t:        Optional[str] = Form(None),
    kanal_t:            Optional[str] = Form(None),
    nama_o:             Optional[str] = Form(None),
    perangkat_o:        Optional[str] = Form(None),
    kanal_o:            Optional[str] = Form(None),
    foto_asplan:            List[UploadFile] = File(default=[]),
    foto_rack_pln_t:        Optional[UploadFile] = File(None),
    foto_perangkat_pln_t:   Optional[UploadFile] = File(None),
    foto_label_pln_t:       Optional[UploadFile] = File(None),
    foto_rack_icp_t:        Optional[UploadFile] = File(None),
    foto_perangkat_icp_t:   Optional[UploadFile] = File(None),
    foto_label_icp_t:       Optional[UploadFile] = File(None),
    foto_rack_pln_o:        Optional[UploadFile] = File(None),
    foto_perangkat_pln_o:   Optional[UploadFile] = File(None),
    foto_label_pln_o:       Optional[UploadFile] = File(None),
    foto_rack_icp_o:        Optional[UploadFile] = File(None),
    foto_perangkat_icp_o:   Optional[UploadFile] = File(None),
    foto_label_icp_o:       Optional[UploadFile] = File(None),
    foto_ping:          Optional[UploadFile] = File(None),
    foto_speedtest:     Optional[UploadFile] = File(None),
    foto_bert:          List[UploadFile] = File(default=[]),
    foto_otdr:          List[UploadFile] = File(default=[]),
    current_user: User = Depends(require_role("engineer", "mitra", "ptl")),
):
    if not is_supported(kategori_layanan, tipe):
        valid = all_kategori()
        raise HTTPException(
            status_code=422,
            detail=f"Kombinasi kategori='{kategori_layanan}' tipe='{tipe}' tidak didukung. "
                   f"Kategori tersedia: {valid}"
        )

    for f, name in [
        (foto_rack_pln_t,"foto_rack_pln_t"),(foto_perangkat_pln_t,"foto_perangkat_pln_t"),
        (foto_label_pln_t,"foto_label_pln_t"),(foto_rack_icp_t,"foto_rack_icp_t"),
        (foto_perangkat_icp_t,"foto_perangkat_icp_t"),(foto_label_icp_t,"foto_label_icp_t"),
        (foto_rack_pln_o,"foto_rack_pln_o"),(foto_perangkat_pln_o,"foto_perangkat_pln_o"),
        (foto_label_pln_o,"foto_label_pln_o"),(foto_rack_icp_o,"foto_rack_icp_o"),
        (foto_perangkat_icp_o,"foto_perangkat_icp_o"),(foto_label_icp_o,"foto_label_icp_o"),
        (foto_ping,"foto_ping"),(foto_speedtest,"foto_speedtest"),
    ]:
        check_file_opt(f, name)
    for f in [*foto_asplan, *foto_bert, *foto_otdr]:
        check_file_opt(f, f.filename)

    hari, tgl, bln, thn = parse_date_id(opt(tanggal_bai))
    tmp_dir = create_tmp_dir()
    try:
        data = {
            "hari": hari, "tgl": tgl, "bln": bln, "thn": thn,
            "nama_layanan":      opt(nama_layanan),
            "user":              opt(user),
            "sid":               opt(sid),
            "bandwidth":         opt(bandwidth),
            "peruntukan_layanan": opt(peruntukan_layanan),
            "no_pa":             opt(no_pa),
            "project_team":      opt(project_team),
            "vendor_instalasi":  opt(vendor_instalasi),
            "jarak_otdr":        opt(jarak_otdr),
            "no_surat":          opt(no_surat),
            "tgl_surat":         format_date_id(opt(tgl_surat)),
            "nama_wakil_user":   (nama_wakil_user or "").strip() or " " * 30,
            "jabatan_user":      opt(jabatan_user),
            "no_hp_user":        opt(no_hp_user),
            "alamat_kantor_user": opt(alamat_kantor_user),
            "nama_t": opt(nama_t), "perangkat_t": opt(perangkat_t), "kanal_t": opt(kanal_t),
            "nama_o": opt(nama_o), "perangkat_o": opt(perangkat_o), "kanal_o": opt(kanal_o),
        }
        files = {
            "foto_asplan":          [f for f in foto_asplan if f and f.filename],
            "foto_rack_pln_t":      foto_rack_pln_t,
            "foto_perangkat_pln_t": foto_perangkat_pln_t,
            "foto_label_pln_t":     foto_label_pln_t,
            "foto_rack_icp_t":      foto_rack_icp_t,
            "foto_perangkat_icp_t": foto_perangkat_icp_t,
            "foto_label_icp_t":     foto_label_icp_t,
            "foto_rack_pln_o":      foto_rack_pln_o,
            "foto_perangkat_pln_o": foto_perangkat_pln_o,
            "foto_label_pln_o":     foto_label_pln_o,
            "foto_rack_icp_o":      foto_rack_icp_o,
            "foto_perangkat_icp_o": foto_perangkat_icp_o,
            "foto_label_icp_o":     foto_label_icp_o,
            "foto_ping":            foto_ping,
            "foto_speedtest":       foto_speedtest,
            "foto_bert":            [f for f in foto_bert if f and f.filename],
            "foto_otdr":            [f for f in foto_otdr if f and f.filename],
        }
        output_path = await render_doc(tipe=tipe, jenis=kategori_layanan, data=data, files=files, tmp_dir=tmp_dir)
        pa_clean = opt(no_pa).replace("/","-").replace(" ","_") or "dokumen"
        return FileResponse(
            path=output_path,
            filename=f"BAI_BATC_{pa_clean}.docx",
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            background=BackgroundTask(cleanup_tmp_dir, tmp_dir),
        )
    except HTTPException:
        cleanup_tmp_dir(tmp_dir); raise
    except Exception as e:
        cleanup_tmp_dir(tmp_dir)
        raise HTTPException(status_code=500, detail=f"Gagal generate dokumen: {str(e)}")


# ── Wakil User (Perwakilan Pelanggan) Endpoints ───────────────────────────────

class WakilUserIn(BaseModel):
    nama_wakil_user: str = Field(..., min_length=1, max_length=150)
    jabatan_user: Optional[str] = Field(default="", max_length=100)
    no_hp_user: Optional[str] = Field(default="", max_length=50)
    alamat_kantor_user: Optional[str] = Field(default="", max_length=500)


class WakilUserOut(BaseModel):
    id: int
    nama_wakil_user: str
    jabatan_user: str
    no_hp_user: str
    alamat_kantor_user: str
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


@router.get("/wakil-users", response_model=List[WakilUserOut])
async def list_wakil_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TeskomWakilUser)
        .where(TeskomWakilUser.user_id == current_user.id)
        .order_by(TeskomWakilUser.nama_wakil_user.asc(), TeskomWakilUser.updated_at.desc())
    )
    all_records = result.scalars().all()
    # Deduplikasi nama (pertahankan record terbaru dan bersihkan duplikat lama)
    seen_names = set()
    unique_records = []
    has_dups = False
    for r in all_records:
        norm_name = r.nama_wakil_user.strip().lower()
        if norm_name not in seen_names:
            seen_names.add(norm_name)
            unique_records.append(r)
        else:
            await db.delete(r)
            has_dups = True

    if has_dups:
        await db.flush()

    return unique_records


@router.post("/wakil-users", response_model=WakilUserOut, status_code=200)
async def create_wakil_user(
    body: WakilUserIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    nama = body.nama_wakil_user.strip()
    if not nama:
        raise HTTPException(status_code=400, detail="Nama wakil user tidak boleh kosong")

    # Cek apakah nama sudah ada (case-insensitive) untuk user ini
    result = await db.execute(
        select(TeskomWakilUser)
        .where(
            TeskomWakilUser.user_id == current_user.id,
            func.lower(TeskomWakilUser.nama_wakil_user) == func.lower(nama),
        )
        .order_by(TeskomWakilUser.updated_at.desc())
    )
    existing_records = result.scalars().all()

    if existing_records:
        record = existing_records[0]
        record.nama_wakil_user = nama
        record.jabatan_user = (body.jabatan_user or "").strip()
        record.no_hp_user = (body.no_hp_user or "").strip()
        record.alamat_kantor_user = (body.alamat_kantor_user or "").strip()

        # Bersihkan duplikat lama jika ada
        for extra in existing_records[1:]:
            await db.delete(extra)

        await db.flush()
        await db.refresh(record)
        return record

    record = TeskomWakilUser(
        user_id=current_user.id,
        nama_wakil_user=nama,
        jabatan_user=(body.jabatan_user or "").strip(),
        no_hp_user=(body.no_hp_user or "").strip(),
        alamat_kantor_user=(body.alamat_kantor_user or "").strip(),
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


@router.delete("/wakil-users/{target_id}")
async def delete_wakil_user(
    target_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TeskomWakilUser)
        .where(TeskomWakilUser.id == target_id, TeskomWakilUser.user_id == current_user.id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Data wakil user tidak ditemukan")

    await db.delete(record)
    return {"ok": True, "message": "Data wakil user berhasil dihapus"}

