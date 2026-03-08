"""
teskom.py
API endpoint untuk Test Commissioning document generator.
- Auto-fill form dari GSheet berdasarkan ID PA
- Generate dokumen DOCX (BAI/BATC)
"""
import re
import logging
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from starlette.background import BackgroundTask

from app.core.config import MAX_UPLOAD_BYTES, TESKOM_TEMPLATES
from app.services.sheet_reader import find_record_by_id_pa
from app.services.doc_renderer import render_doc
from app.utils.file_helper import create_tmp_dir, cleanup_tmp_dir, validate_image_file

router = APIRouter(tags=["teskom"])
log    = logging.getLogger("teskom")

HARI  = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
         "Juli", "Agustus", "September", "Oktober", "November", "Desember"]


def parse_date_id(date_str: str):
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return (HARI[dt.weekday()], str(dt.day), BULAN[dt.month - 1], str(dt.year))
    except Exception:
        return ("", "", "", "")


def format_date_id(date_str: str) -> str:
    """Format YYYY-MM-DD → '26 Februari 2026'"""
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return f"{dt.day} {BULAN[dt.month - 1]} {dt.year}"
    except Exception:
        return date_str


def opt(v) -> str:
    return (v or "").strip()


def parse_bandwidth_from_keterangan(keterangan: str) -> str:
    """
    Parse bandwidth dari kolom KETERANGAN GSheet.
    Contoh: 'BANDWIDTH: 2 MBPS ROUTE: 0 IP PUBLIC: 0 PORT: 1 AKSES: 1'
    → '2 MBPS'
    """
    if not keterangan:
        return ""
    match = re.search(r"BANDWIDTH:\s*(\S+(?:\s+\S+)?)", keterangan, re.IGNORECASE)
    if match:
        raw = match.group(1).strip()
        # Ambil angka + satuan (MBPS/GBPS)
        m2 = re.match(r"(\d+(?:\.\d+)?)\s*(MBPS|GBPS|KBPS)?", raw, re.IGNORECASE)
        if m2:
            num  = m2.group(1)
            unit = (m2.group(2) or "MBPS").upper()
            return f"{num} {unit}"
    return ""


@router.get("/autofill/{id_pa}")
def autofill_from_gsheet(id_pa: str):
    """
    Cari data di GSheet berdasarkan ID PA dan kembalikan field
    yang bisa di-auto-fill ke form Teskom.
    """
    record = find_record_by_id_pa(id_pa)

    if not record:
        raise HTTPException(
            status_code=404,
            detail=f"ID PA '{id_pa}' tidak ditemukan di GSheet"
        )

    data = record["data"]

    keterangan = data.get("KETERANGAN", "")
    bandwidth  = parse_bandwidth_from_keterangan(keterangan)

    autofill = {
        "no_pa":              data.get("ID PA", ""),
        "sid":                data.get("SERVICE ID", ""),
        "user":               data.get("NAMA PERUSAHAAN", ""),
        "nama_layanan":       data.get("LAYANAN", ""),
        "bandwidth":          bandwidth,
        "no_surat":           data.get("No Surat Permohonan", ""),
        "vendor_instalasi":   data.get("MITRA TERMINATING", ""),
        "project_team":       data.get("PTL TERMINATING", ""),
        "nama_t":             data.get("ALAMAT TERMINATING", ""),
        "nama_o":             data.get("ALAMAT ORIGINATING", ""),
        "alamat_kantor_user": data.get("ALAMAT TERMINATING", ""),
        "no_pa_raw":          data.get("ID PA", ""),
        "tgl_terbit_pa":      data.get("TGL TERBIT PA", ""),
    }

    return JSONResponse(content={
        "ok": True,
        "id_pa": id_pa,
        "row_id": record["row_id"],
        "autofill": autofill,
    })


def check_file_opt(upload: Optional[UploadFile], field_name: str):
    if not upload or not upload.filename:
        return
    err = validate_image_file(upload.filename, upload.size or 0, MAX_UPLOAD_BYTES)
    if err:
        raise HTTPException(status_code=422, detail=f"[{field_name}] {err}")


@router.post("/generate")
async def generate_teskom(
    tipe:              str = Form(...),
    kategori_layanan:  str = Form(...),

    tanggal_bai:       Optional[str] = Form(None),
    nama_layanan:      Optional[str] = Form(None),
    user:              Optional[str] = Form(None),
    sid:               Optional[str] = Form(None),
    bandwidth:         Optional[str] = Form(None),
    peruntukan_layanan: Optional[str] = Form(None),
    no_pa:             Optional[str] = Form(None),
    project_team:      Optional[str] = Form(None),
    nama_wakil_user:   Optional[str] = Form(None),
    jabatan_user:      Optional[str] = Form(None),
    no_hp_user:        Optional[str] = Form(None),
    alamat_kantor_user: Optional[str] = Form(None),
    vendor_instalasi:  Optional[str] = Form(None),
    jarak_otdr:        Optional[str] = Form(None),
    no_surat:          Optional[str] = Form(None),
    tgl_surat:         Optional[str] = Form(None),

    nama_t:            Optional[str] = Form(None),
    perangkat_t:       Optional[str] = Form(None),
    kanal_t:           Optional[str] = Form(None),

    nama_o:            Optional[str] = Form(None),
    perangkat_o:       Optional[str] = Form(None),
    kanal_o:           Optional[str] = Form(None),

    foto_asplan:       List[UploadFile] = File(default=[]),
    foto_rack_pln_t:       Optional[UploadFile] = File(None),
    foto_perangkat_pln_t:  Optional[UploadFile] = File(None),
    foto_label_pln_t:      Optional[UploadFile] = File(None),
    foto_rack_icp_t:       Optional[UploadFile] = File(None),
    foto_perangkat_icp_t:  Optional[UploadFile] = File(None),
    foto_label_icp_t:      Optional[UploadFile] = File(None),
    foto_rack_pln_o:       Optional[UploadFile] = File(None),
    foto_perangkat_pln_o:  Optional[UploadFile] = File(None),
    foto_label_pln_o:      Optional[UploadFile] = File(None),
    foto_rack_icp_o:       Optional[UploadFile] = File(None),
    foto_perangkat_icp_o:  Optional[UploadFile] = File(None),
    foto_label_icp_o:      Optional[UploadFile] = File(None),
    foto_ping:         Optional[UploadFile] = File(None),
    foto_speedtest:    Optional[UploadFile] = File(None),
    foto_bert:         List[UploadFile] = File(default=[]),
    foto_otdr:         List[UploadFile] = File(default=[]),
):
    """Generate dokumen BAI/BATC (.docx) untuk Test Commissioning."""
    if tipe not in ("T", "OT"):
        raise HTTPException(status_code=422, detail="Tipe harus 'T' atau 'OT'.")
    if kategori_layanan not in ("CC_TDM", "CC_IP", "DARK_FIBER"):
        raise HTTPException(status_code=422, detail="Kategori layanan tidak valid.")

    for f, name in [
        (foto_rack_pln_t,      "foto_rack_pln_t"),
        (foto_perangkat_pln_t, "foto_perangkat_pln_t"),
        (foto_label_pln_t,     "foto_label_pln_t"),
        (foto_rack_icp_t,      "foto_rack_icp_t"),
        (foto_perangkat_icp_t, "foto_perangkat_icp_t"),
        (foto_label_icp_t,     "foto_label_icp_t"),
        (foto_rack_pln_o,      "foto_rack_pln_o"),
        (foto_perangkat_pln_o, "foto_perangkat_pln_o"),
        (foto_label_pln_o,     "foto_label_pln_o"),
        (foto_rack_icp_o,      "foto_rack_icp_o"),
        (foto_perangkat_icp_o, "foto_perangkat_icp_o"),
        (foto_label_icp_o,     "foto_label_icp_o"),
        (foto_ping,            "foto_ping"),
        (foto_speedtest,       "foto_speedtest"),
    ]:
        check_file_opt(f, name)

    for f in foto_asplan:
        check_file_opt(f, "foto_asplan")
    for f in foto_bert:
        check_file_opt(f, "foto_bert")
    for f in foto_otdr:
        check_file_opt(f, "foto_otdr")

    hari, tgl, bln, thn = parse_date_id(opt(tanggal_bai))

    tmp_dir = create_tmp_dir()
    try:
        data = {
            "hari":              hari,
            "tgl":               tgl,
            "bln":               bln,
            "thn":               thn,
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
            "nama_t":            opt(nama_t),
            "perangkat_t":       opt(perangkat_t),
            "kanal_t":           opt(kanal_t),
            "nama_o":            opt(nama_o),
            "perangkat_o":       opt(perangkat_o),
            "kanal_o":           opt(kanal_o),
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

        output_path = await render_doc(
            tipe=tipe,
            jenis=kategori_layanan,
            data=data,
            files=files,
            tmp_dir=tmp_dir,
        )

        pa_clean = opt(no_pa).replace("/", "-").replace(" ", "_") or "dokumen"
        return FileResponse(
            path=output_path,
            filename=f"BAI_BATC_{pa_clean}.docx",
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            background=BackgroundTask(cleanup_tmp_dir, tmp_dir),
        )

    except HTTPException:
        cleanup_tmp_dir(tmp_dir)
        raise
    except Exception as e:
        cleanup_tmp_dir(tmp_dir)
        raise HTTPException(status_code=500, detail=f"Gagal generate dokumen: {str(e)}")
