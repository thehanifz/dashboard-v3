"""
settings.py
Endpoint untuk pengaturan global aplikasi.
Saat ini: aging thresholds (tier1, tier2, tier3 dalam hari).
Data disimpan di file JSON: settings/aging.json
"""
import json
import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.deps import require_role
from app.db.models import User

router = APIRouter(tags=["settings"])

SETTINGS_DIR  = Path(__file__).resolve().parent.parent.parent / "settings"
AGING_FILE    = SETTINGS_DIR / "aging.json"

DEFAULT_AGING = {"tier1": 30, "tier2": 60, "tier3": 90}


def _ensure_dir():
    SETTINGS_DIR.mkdir(parents=True, exist_ok=True)


def _read_aging() -> dict:
    _ensure_dir()
    if not AGING_FILE.exists():
        return DEFAULT_AGING.copy()
    try:
        with open(AGING_FILE, "r") as f:
            data = json.load(f)
        # Validasi struktur
        return {
            "tier1": int(data.get("tier1", DEFAULT_AGING["tier1"])),
            "tier2": int(data.get("tier2", DEFAULT_AGING["tier2"])),
            "tier3": int(data.get("tier3", DEFAULT_AGING["tier3"])),
        }
    except Exception:
        return DEFAULT_AGING.copy()


def _write_aging(data: dict):
    _ensure_dir()
    with open(AGING_FILE, "w") as f:
        json.dump(data, f, indent=2)


class AgingThresholds(BaseModel):
    tier1: int  # batas safe → warning (hari)
    tier2: int  # batas warning → danger (hari)
    tier3: int  # batas danger → critical (hari)


# ── GET /settings/aging — semua role bisa baca ───────────────────────────────
@router.get("/aging")
def get_aging_thresholds():
    return _read_aging()


# ── PUT /settings/aging — Engineer only ──────────────────────────────────────
@router.put("/aging")
def update_aging_thresholds(
    payload: AgingThresholds,
    current_user: User = Depends(require_role("engineer")),
):
    if payload.tier1 <= 0 or payload.tier2 <= payload.tier1 or payload.tier3 <= payload.tier2:
        raise HTTPException(
            status_code=400,
            detail="Threshold harus: tier1 < tier2 < tier3 dan semua > 0",
        )
    data = {"tier1": payload.tier1, "tier2": payload.tier2, "tier3": payload.tier3}
    _write_aging(data)
    return {"ok": True, **data}