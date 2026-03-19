"""
sync_engine.py
Phase 6 — Sync Engine.

Fungsi utama:
- read_ptl_sheet(gsheet_url)  → baca GSheet milik PTL
- compare_records(engineer, ptl) → deteksi mismatch
- run_sync(db, ptl_user)      → full sync: baca, bandingkan, catat ke DB
"""
import re
from datetime import datetime, timezone
from typing import Any

from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import GOOGLE_APPLICATION_CREDENTIALS
from app.db.models import SyncLog, SyncMismatch, MismatchTypeEnum, SyncTypeEnum, User
from app.services.sheet_reader import read_sheet, parse_ptl_name


# Kolom kunci untuk join Engineer ↔ PTL
JOIN_KEY = "ID PA"

# Kolom yang di-sync dari PTL ke Engineer (sesuai PRD Phase 6)
SYNC_COLUMNS = {
    "Status Pekerjaan",
    "Detail Progres",
    "KETERANGAN",
}


def _extract_spreadsheet_id(url: str) -> str | None:
    """Ekstrak spreadsheet ID dari URL GSheet."""
    match = re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", url)
    return match.group(1) if match else None


def read_ptl_sheet(gsheet_url: str) -> dict:
    """
    Baca GSheet milik PTL.
    Otomatis deteksi nama sheet pertama — tidak hardcode 'Sheet1'.
    """
    spreadsheet_id = _extract_spreadsheet_id(gsheet_url)
    if not spreadsheet_id:
        raise ValueError(f"URL GSheet PTL tidak valid: {gsheet_url}")

    creds = Credentials.from_service_account_file(
        GOOGLE_APPLICATION_CREDENTIALS,
        scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"],
    )
    service = build("sheets", "v4", credentials=creds)

    # Ambil metadata dulu untuk dapat nama sheet pertama
    spreadsheet = service.spreadsheets().get(
        spreadsheetId=spreadsheet_id
    ).execute()

    first_sheet_name = spreadsheet["sheets"][0]["properties"]["title"]

    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=spreadsheet_id, range=first_sheet_name)
        .execute()
    )

    values = result.get("values", [])
    if not values:
        return {"columns": [], "records": []}

    headers = values[0]
    records = []
    for idx, row in enumerate(values[1:], start=2):
        row_data = dict(zip(headers, row))
        records.append({
            "id":     f"rec_{idx}",
            "row_id": idx,
            "data":   row_data,
        })

    return {"columns": headers, "records": records}



def compare_records(
    engineer_data: dict,
    ptl_data: dict,
    ptl_nama: str,
) -> dict[str, Any]:
    """
    Bandingkan data Engineer vs PTL untuk PTL tertentu.

    Return:
    {
        "matched":  [ {id_pa, engineer_row, ptl_row, diffs: {col: {eng, ptl}}} ],
        "missing_in_ptl":      [id_pa, ...],   # ada di Engineer, tidak ada di PTL
        "missing_in_engineer": [id_pa, ...],   # ada di PTL, tidak ada di Engineer
    }
    """
    # Filter data Engineer hanya untuk PTL ini
    nama_lower = ptl_nama.strip().lower()
    eng_records = {
        r["data"][JOIN_KEY]: r
        for r in engineer_data["records"]
        if parse_ptl_name(r["data"].get("PTL TERMINATING", "")).strip().lower() == nama_lower
        and r["data"].get(JOIN_KEY)
    }

    ptl_records = {
        r["data"][JOIN_KEY]: r
        for r in ptl_data["records"]
        if r["data"].get(JOIN_KEY)
    }

    eng_ids = set(eng_records.keys())
    ptl_ids = set(ptl_records.keys())

    matched = []
    for id_pa in eng_ids & ptl_ids:
        eng_row = eng_records[id_pa]["data"]
        ptl_row = ptl_records[id_pa]["data"]

        diffs = {}
        for col in SYNC_COLUMNS:
            eng_val = eng_row.get(col, "").strip()
            ptl_val = ptl_row.get(col, "").strip()
            if eng_val != ptl_val:
                diffs[col] = {"engineer": eng_val, "ptl": ptl_val}

        matched.append({
            "id_pa":        id_pa,
            "engineer_row": eng_records[id_pa]["row_id"],
            "ptl_row":      ptl_records[id_pa]["row_id"],
            "diffs":        diffs,
        })

    return {
        "matched":              matched,
        "missing_in_ptl":       list(eng_ids - ptl_ids),
        "missing_in_engineer":  list(ptl_ids - eng_ids),
    }


async def run_sync(
    db: AsyncSession,
    ptl_user: User,
    sync_type: SyncTypeEnum = SyncTypeEnum.manual,
    triggered_by: str = "system",
) -> dict[str, Any]:
    """
    Full sync untuk satu PTL user:
    1. Baca Engineer GSheet
    2. Baca PTL GSheet
    3. Compare
    4. Update Engineer GSheet dari PTL (kolom SYNC_COLUMNS)
    5. Catat SyncLog + SyncMismatch ke DB

    Return summary hasil sync.
    """
    if not ptl_user.gsheet_url:
        return {
            "ok": False,
            "error": f"User '{ptl_user.username}' tidak punya gsheet_url",
        }

    now = datetime.now(timezone.utc)

    # ── 1. Baca data ──────────────────────────────────────────────────────────
    try:
        engineer_data = read_sheet()
    except Exception as e:
        return {"ok": False, "error": f"Gagal baca Engineer GSheet: {e}"}

    try:
        ptl_data = read_ptl_sheet(ptl_user.gsheet_url)
    except Exception as e:
        return {"ok": False, "error": f"Gagal baca PTL GSheet: {e}"}

    # ── 2. Compare ────────────────────────────────────────────────────────────
    result = compare_records(engineer_data, ptl_data, ptl_user.nama_lengkap)

    synced_count   = 0
    mismatch_count = 0

    # ── 3. Update Engineer dari PTL + catat SyncLog ───────────────────────────
    from app.services.sheet_writer import update_cells

    for item in result["matched"]:
        if not item["diffs"]:
            continue

        id_pa    = item["id_pa"]
        eng_row  = item["engineer_row"]
        updates  = {}

        for col, vals in item["diffs"].items():
            old_val = vals["engineer"]
            new_val = vals["ptl"]
            updates[col] = new_val

            log = SyncLog(
                ptl_user_id=ptl_user.id,
                id_pa=id_pa,
                field_changed=col,
                old_value=old_val,
                new_value=new_val,
                sync_type=sync_type,
                synced_by=triggered_by,
            )
            db.add(log)
            synced_count += 1

        try:
            update_cells(row_id=eng_row, updates=updates)
        except Exception as e:
            # Catat error tapi jangan stop proses
            db.add(SyncLog(
                ptl_user_id=ptl_user.id,
                id_pa=id_pa,
                field_changed="__error__",
                old_value=None,
                new_value=str(e),
                sync_type=sync_type,
                synced_by=triggered_by,
            ))

    # ── 4. Catat SyncMismatch ─────────────────────────────────────────────────
    # Resolve mismatch lama yang sekarang sudah matched
    matched_ids = {item["id_pa"] for item in result["matched"]}
    await db.execute(
        update(SyncMismatch)
        .where(SyncMismatch.ptl_user_id == ptl_user.id)
        .where(SyncMismatch.id_pa.in_(matched_ids))
        .where(SyncMismatch.resolved_at == None)
        .values(resolved_at=now)
    )

    # Tambah mismatch baru
    for id_pa in result["missing_in_engineer"]:
        existing = await db.execute(
            select(SyncMismatch).where(
                SyncMismatch.ptl_user_id == ptl_user.id,
                SyncMismatch.id_pa == id_pa,
                SyncMismatch.mismatch_type == MismatchTypeEnum.missing_in_engineer,
                SyncMismatch.resolved_at == None,
            )
        )
        if not existing.scalar_one_or_none():
            db.add(SyncMismatch(
                ptl_user_id=ptl_user.id,
                id_pa=id_pa,
                mismatch_type=MismatchTypeEnum.missing_in_engineer,
            ))
            mismatch_count += 1

    for id_pa in result["missing_in_ptl"]:
        existing = await db.execute(
            select(SyncMismatch).where(
                SyncMismatch.ptl_user_id == ptl_user.id,
                SyncMismatch.id_pa == id_pa,
                SyncMismatch.mismatch_type == MismatchTypeEnum.missing_in_ptl,
                SyncMismatch.resolved_at == None,
            )
        )
        if not existing.scalar_one_or_none():
            db.add(SyncMismatch(
                ptl_user_id=ptl_user.id,
                id_pa=id_pa,
                mismatch_type=MismatchTypeEnum.missing_in_ptl,
            ))
            mismatch_count += 1

    await db.commit()

    return {
        "ok":            True,
        "ptl_username":  ptl_user.username,
        "synced_fields": synced_count,
        "new_mismatches": mismatch_count,
        "missing_in_ptl": result["missing_in_ptl"],
        "missing_in_engineer": result["missing_in_engineer"],
        "diffs_applied": [
            {"id_pa": i["id_pa"], "diffs": list(i["diffs"].keys())}
            for i in result["matched"] if i["diffs"]
        ],
    }
