"""
api/settings.py
Endpoint CRUD untuk dashboard_settings.

Menggantikan versi lama yang baca dari aging.json.
Sekarang semua konfigurasi disimpan di tabel dashboard_settings (PostgreSQL).

GET  /api/settings         — semua user login, baca list semua settings
GET  /api/settings/public  — tanpa auth, untuk frontend baca config awal
GET  /api/settings/{key}   — baca satu setting by key
PUT  /api/settings/{key}   — engineer only: update satu setting
POST /api/settings/cache/invalidate — engineer only: force reload cache

Superuser dapat membaca konfigurasi; perubahan setting tetap dibatasi ke engineer.
"""
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import settings_cache
import os
import logging

logger = logging.getLogger(__name__)
from app.core.deps import get_current_user, require_role
from app.db.database import get_db
from app.db.models import DashboardSetting
from app.schemas.settings import AgingThresholdUpdate, SettingRead, SettingUpdate

router = APIRouter(tags=["settings"])


# ── GET /settings/public — tanpa auth, untuk frontend ──────────────────────────
@router.get("/public", response_model=dict[str, Any])
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    """
    Endpoint publik — tidak butuh login.
    Frontend pakai ini saat pertama kali load untuk dapat app.name, dll.
    """
    all_settings = await settings_cache.get_all(db)
    aging_debug = {k: all_settings.get(k) for k in ("aging.tier1", "aging.tier2", "aging.tier3")}
    logger.info("[AGING_DEBUG][PUBLIC] pid=%s tiers=%s", os.getpid(), aging_debug)
    # Hanya expose key yang aman untuk publik
    safe_prefixes = ("app.", "columns.", "aging.")
    return {
        k: v for k, v in all_settings.items()
        if any(k.startswith(p) for p in safe_prefixes)
    }


# ── GET /settings — semua user login ───────────────────────────────────────
@router.get("/", response_model=list[SettingRead])
async def list_settings(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Baca semua settings lengkap — user login, termasuk superuser."""
    result = await db.execute(
        select(DashboardSetting).order_by(DashboardSetting.category, DashboardSetting.key)
    )
    return result.scalars().all()


# ── GET /settings/{key} ────────────────────────────────────────────────────
@router.put("/aging-thresholds", response_model=dict[str, int])
async def update_aging_thresholds(
    payload: AgingThresholdUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("engineer")),
):
    """Update seluruh threshold aging dalam satu transaksi; tidak ada partial update."""
    if payload.tier1 <= 0 or payload.tier2 <= payload.tier1 or payload.tier3 <= payload.tier2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Harus: Tier 1 < Tier 2 < Tier 3 dan semua > 0")

    keys = {"aging.tier1": payload.tier1, "aging.tier2": payload.tier2, "aging.tier3": payload.tier3}
    result = await db.execute(select(DashboardSetting).where(DashboardSetting.key.in_(keys.keys())))
    settings = {row.key: row for row in result.scalars().all()}
    missing = [key for key in keys if key not in settings]
    if missing:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Setting aging tidak ditemukan di database: {', '.join(missing)}")
    locked = [key for key, row in settings.items() if not row.is_editable]
    if locked:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Setting aging tidak bisa diedit: {', '.join(locked)}")

    actor = getattr(current_user, "username", "engineer")
    old_values = {key: settings[key].value for key in keys}
    logger.info("[AGING_DEBUG][SAVE] pid=%s actor=%s old=%s new=%s", os.getpid(), actor, old_values, keys)
    try:
        for key, value in keys.items():
            await db.execute(update(DashboardSetting).where(DashboardSetting.key == key).values(value=str(value), updated_by=actor))
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    settings_cache.invalidate()
    logger.info("[AGING_DEBUG][SAVE_DONE] pid=%s actor=%s db_values=%s cache_invalidated=true", os.getpid(), actor, keys)
    return keys


@router.get("/{key}", response_model=SettingRead)
async def get_setting(
    key: str,
    db: AsyncSession = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(DashboardSetting).where(DashboardSetting.key == key)
    )
    setting = result.scalar_one_or_none()
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting '{key}' tidak ditemukan",
        )
    return setting


# ── PUT /settings/{key} — engineer only ─────────────────────────────────────
@router.put("/{key}", response_model=SettingRead)
async def update_setting(
    key: str,
    payload: SettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("engineer")),
):
    """Update satu setting — engineer."""
    result = await db.execute(
        select(DashboardSetting).where(DashboardSetting.key == key)
    )
    setting = result.scalar_one_or_none()
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting '{key}' tidak ditemukan",
        )
    if not setting.is_editable:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Setting '{key}' tidak bisa diedit via API",
        )

    actor = getattr(current_user, "username", "engineer")

    await db.execute(
        update(DashboardSetting)
        .where(DashboardSetting.key == key)
        .values(value=payload.value, updated_by=actor)
    )
    await db.commit()

    # Invalidate cache agar perubahan langsung berlaku tanpa tunggu TTL
    settings_cache.invalidate()

    result2 = await db.execute(
        select(DashboardSetting).where(DashboardSetting.key == key)
    )
    return result2.scalar_one()


# ── POST /settings/cache/invalidate — engineer only ─────────────────────────
@router.post("/cache/invalidate", status_code=status.HTTP_204_NO_CONTENT)
async def force_invalidate_cache(
    _current_user=Depends(require_role("engineer")),
):
    """Force reload cache — berguna setelah maintenance DB langsung."""
    settings_cache.invalidate()
