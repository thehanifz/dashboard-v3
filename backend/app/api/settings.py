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

Role superuser hanya untuk management user — tidak akses endpoint fitur operasional.
"""
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import settings_cache
from app.core.deps import get_current_user, require_role
from app.db.database import get_db
from app.db.models import DashboardSetting
from app.schemas.settings import SettingRead, SettingUpdate

router = APIRouter(tags=["settings"])


# ── GET /settings/public — tanpa auth, untuk frontend ──────────────────────────
@router.get("/public", response_model=dict[str, Any])
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    """
    Endpoint publik — tidak butuh login.
    Frontend pakai ini saat pertama kali load untuk dapat app.name, dll.
    """
    all_settings = await settings_cache.get_all(db)
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
    _current_user=Depends(get_current_user),
):
    """Baca semua settings lengkap — butuh login."""
    result = await db.execute(
        select(DashboardSetting).order_by(DashboardSetting.category, DashboardSetting.key)
    )
    return result.scalars().all()


# ── GET /settings/{key} ────────────────────────────────────────────────────
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
