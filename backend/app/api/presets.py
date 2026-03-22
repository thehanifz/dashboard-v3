"""
api/presets.py
Endpoint sinkronisasi preset kolom dan editable columns ke DB.

Preset (Engineer & PTL):
  GET    /api/presets?scope=engineer   → list preset milik user
  POST   /api/presets                  → buat preset baru
  PUT    /api/presets/{id}             → update preset
  DELETE /api/presets/{id}             → hapus preset

Editable columns (Engineer):
  GET    /api/presets/editable-columns → ambil daftar kolom editable
  PUT    /api/presets/editable-columns → simpan daftar kolom editable
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.db.database import get_db
from app.db.models import UserPreset, UserColumnConfig
from app.core.deps import get_current_user, User

router = APIRouter(tags=["presets"])


# ── Schemas ───────────────────────────────────────────────────────────────────
class PresetIn(BaseModel):
    scope   : str
    name    : str
    columns : list[str]
    widths  : Optional[dict[str, float]] = None


class PresetUpdate(BaseModel):
    name    : Optional[str]              = None
    columns : Optional[list[str]]        = None
    widths  : Optional[dict[str, float]] = None


class PresetOut(BaseModel):
    id      : int
    scope   : str
    name    : str
    columns : list[str]
    widths  : Optional[dict[str, float]] = None
    model_config = {"from_attributes": True}


class EditableColumnsIn(BaseModel):
    columns: list[str]


# ── Preset endpoints ──────────────────────────────────────────────────────────

@router.get("", response_model=list[PresetOut])
async def list_presets(
    scope: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserPreset)
        .where(UserPreset.user_id == current_user.id, UserPreset.scope == scope)
        .order_by(UserPreset.created_at)
    )
    return result.scalars().all()


@router.post("", response_model=PresetOut, status_code=201)
async def create_preset(
    body: PresetIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.scope not in ("engineer", "ptl"):
        raise HTTPException(400, "scope harus 'engineer' atau 'ptl'")
    preset = UserPreset(
        user_id = current_user.id,
        scope   = body.scope,
        name    = body.name.strip(),
        columns = body.columns,
        widths  = body.widths or {},
    )
    db.add(preset)
    await db.flush()
    await db.refresh(preset)
    return preset


@router.get("/editable-columns", response_model=list[str])
async def get_editable_columns(
    scope: str = Query("engineer"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserColumnConfig).where(UserColumnConfig.user_id == current_user.id)
    )
    config = result.scalar_one_or_none()
    if not config:
        return []
    if scope == "ptl":
        return config.ptl_editable_columns or []
    return config.editable_columns or []


@router.put("/editable-columns", response_model=list[str])
async def save_editable_columns(
    body: EditableColumnsIn,
    scope: str = Query("engineer"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserColumnConfig).where(UserColumnConfig.user_id == current_user.id)
    )
    config = result.scalar_one_or_none()
    if config:
        if scope == "ptl":
            config.ptl_editable_columns = body.columns
        else:
            config.editable_columns = body.columns
    else:
        config = UserColumnConfig(
            user_id=current_user.id,
            editable_columns=body.columns if scope == "engineer" else [],
            ptl_editable_columns=body.columns if scope == "ptl" else [],
        )
        db.add(config)
    await db.flush()
    return body.columns


@router.put("/{preset_id}", response_model=PresetOut)
async def update_preset(
    preset_id: int,
    body: PresetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserPreset).where(UserPreset.id == preset_id, UserPreset.user_id == current_user.id)
    )
    preset = result.scalar_one_or_none()
    if not preset:
        raise HTTPException(404, "Preset tidak ditemukan")

    if body.name    is not None: preset.name    = body.name.strip()
    if body.columns is not None: preset.columns = body.columns
    if body.widths  is not None: preset.widths  = body.widths

    await db.flush()
    await db.refresh(preset)
    return preset


@router.delete("/{preset_id}", status_code=204)
async def delete_preset(
    preset_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserPreset).where(UserPreset.id == preset_id, UserPreset.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Preset tidak ditemukan")
    await db.execute(delete(UserPreset).where(UserPreset.id == preset_id))