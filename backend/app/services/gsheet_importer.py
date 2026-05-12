"""
gsheet_importer.py
Sync GSheet → PostgreSQL (INSERT-only + UPDATE tgl_upload_bai).

Logika:
  1. Baca semua baris dari GSheet via read_sheet()
  2. Filter: jenis_pekerjaan ∈ {AKTIVASI, RETENDER, UPGRADE, DOWNGRADE, RELOKASI}
  3. Untuk tiap baris:
       - gsheet_row belum ada di DB → INSERT
       - gsheet_row sudah ada       → UPDATE tgl_upload_bai jika berubah, else skip
  4. Return { inserted, updated_bai, skipped }
"""
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import PARecord
from app.services.sheet_reader import read_sheet
from app.services.aging import calculate_aging_days

logger = logging.getLogger(__name__)

# Jenis pekerjaan yang di-import
ALLOWED_JENIS = {"AKTIVASI", "RETENDER", "UPGRADE", "DOWNGRADE", "RELOKASI"}

# Mapping header GSheet → kolom DB
# Key  : nama kolom di output read_sheet() (case-sensitive, sesuai header GSheet)
# Value: nama atribut PARecord
COL_MAP: dict[str, str] = {
    "ID PA":                      "id_pa",
    "NODE":                       "node",
    "ID PERMOHONAN":              "id_permohonan",
    "SERVICE ID":                 "service_id",
    "NAMA PRODUK":                "nama_produk",
    "JENIS LAYANAN":              "jenis_layanan",
    "KATEGORI LAYANAN":           "kategori_layanan",
    "SEGMENTASI":                 "segmentasi",
    "KATEGORI CUSTOMER":          "kategori_customer",
    "KATEGORI OWNER":             "kategori_owner",
    "BANDWIDTH":                  "bandwidth",
    "ALAMAT":                     "alamat",
    "KP NODE":                    "kp_node",
    "KP/NODE":                    "kp_node",           # fallback header alternatif
    "LATITUDE":                   "latitude",
    "LONGITUDE":                  "longitude",
    "NAMA CUSTOMER":              "nama_customer",
    "TGL TERBIT PA":              "tgl_terbit_pa",
    "TGL BAI":                    "tgl_bai",
    "TGL UPLOAD BAI":             "tgl_upload_bai",
    "JENIS PEKERJAAN":            "jenis_pekerjaan",
    "jenisMutasi":                "jenis_pekerjaan",   # fallback
    "NOMOR IO":                   "nomor_io",
    "Status PA":                  "status_pa",
    "Kategori PA":                "kategori_status",
    "Status Pekerjaan":           "kategori_progres",
    "Detail Progres":             "detail_progres",
    "KETERANGAN UPDATE DETAIL":   "progress_update",
    "Nama PTL":                   "nama_ptl",
    "PTL TERMINATING":            "nama_ptl",          # fallback
    "Nama Sales":                 "nama_sales",
    "PTL Update":                 "ptl_update",
}

DATE_COLS = {"tgl_terbit_pa", "tgl_bai", "tgl_upload_bai"}
FLOAT_COLS = {"latitude", "longitude"}


def _parse_date(val: str) -> Optional[datetime]:
    if not val or not val.strip():
        return None
    for fmt in ["%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y %H:%M", "%d/%m/%Y"]:
        try:
            return datetime.strptime(val.strip(), fmt)
        except ValueError:
            continue
    return None


def _parse_float(val: str) -> Optional[float]:
    if not val or not val.strip():
        return None
    try:
        return float(val.strip().replace(",", "."))
    except ValueError:
        return None


def _row_to_record_kwargs(row_data: dict, gsheet_row: int) -> dict:
    """
    Konversi dict baris GSheet → kwargs untuk PARecord.
    Kolom 'Aging PA' dari GSheet diabaikan — dihitung ulang dari tgl_terbit_pa.
    """
    kwargs: dict = {"gsheet_row": gsheet_row}

    for header, db_col in COL_MAP.items():
        if header not in row_data:
            continue
        if db_col in kwargs:  # sudah di-set oleh header sebelumnya (fallback)
            continue

        val = (row_data[header] or "").strip()

        if db_col in DATE_COLS:
            kwargs[db_col] = _parse_date(val)
        elif db_col in FLOAT_COLS:
            kwargs[db_col] = _parse_float(val)
        else:
            kwargs[db_col] = val or None

    # Hitung aging dari tgl_terbit_pa — abaikan nilai dari GSheet
    tgl_terbit = kwargs.get("tgl_terbit_pa")
    tgl_str = tgl_terbit.strftime("%Y-%m-%d %H:%M") if tgl_terbit else ""
    kwargs["aging_pa"] = calculate_aging_days(
        tgl_str,
        tgl_upload_bai=kwargs.get("tgl_upload_bai"),
        kategori_status=kwargs.get("kategori_status"),
    )

    return kwargs


async def sync_gsheet_to_db(db: AsyncSession) -> dict:
    """
    Baca GSheet → INSERT baris baru + UPDATE tgl_upload_bai yang berubah.
    Return: { inserted, updated_bai, skipped, errors }
    """
    inserted = 0
    updated_bai = 0
    skipped = 0
    errors: list[str] = []

    # 1. Baca GSheet
    try:
        sheet_data = read_sheet()
    except Exception as e:
        logger.error(f"Gagal baca GSheet: {e}")
        raise

    records = sheet_data.get("records", [])
    logger.info(f"[GSheet Import] Baca {len(records)} baris dari GSheet")

    # 2. Ambil semua gsheet_row yang sudah ada di DB (satu query)
    existing_result = await db.execute(select(PARecord.gsheet_row, PARecord.tgl_upload_bai, PARecord.id))
    existing_rows: dict[int, dict] = {
        row.gsheet_row: {"tgl_upload_bai": row.tgl_upload_bai, "id": row.id}
        for row in existing_result
    }

    # 3. Proses tiap baris
    for rec in records:
        try:
            row_id: int = rec.get("row_id", 0)
            data: dict  = rec.get("data", {})

            # Filter jenis pekerjaan
            jenis = (data.get("JENIS PEKERJAAN") or data.get("jenisMutasi") or "").strip().upper()
            if jenis not in ALLOWED_JENIS:
                skipped += 1
                continue

            if row_id in existing_rows:
                # Sudah ada — cek tgl_upload_bai
                new_bai_str = (data.get("TGL UPLOAD BAI") or "").strip()
                new_bai     = _parse_date(new_bai_str)
                old_bai     = existing_rows[row_id]["tgl_upload_bai"]

                # Bandingkan: update jika beda (keduanya None = sama = skip)
                old_bai_norm = old_bai.replace(second=0, microsecond=0) if old_bai else None
                new_bai_norm = new_bai.replace(second=0, microsecond=0) if new_bai else None

                if old_bai_norm != new_bai_norm:
                    result = await db.execute(
                        select(PARecord).where(PARecord.gsheet_row == row_id)
                    )
                    pa_rec = result.scalar_one_or_none()
                    if pa_rec:
                        pa_rec.tgl_upload_bai = new_bai
                        pa_rec.updated_at     = datetime.now()
                        updated_bai += 1
                else:
                    skipped += 1
            else:
                # Belum ada — INSERT
                kwargs = _row_to_record_kwargs(data, row_id)
                new_rec = PARecord(**kwargs)
                db.add(new_rec)
                inserted += 1

        except Exception as e:
            row_id_str = str(rec.get("row_id", "?"))
            logger.warning(f"[GSheet Import] Skip baris row_id={row_id_str}: {e}")
            errors.append(f"row {row_id_str}: {e}")
            continue

    await db.commit()

    logger.info(
        f"[GSheet Import] Selesai — inserted={inserted}, "
        f"updated_bai={updated_bai}, skipped={skipped}, errors={len(errors)}"
    )

    return {
        "inserted":    inserted,
        "updated_bai": updated_bai,
        "skipped":     skipped,
        "errors":      errors,
    }
