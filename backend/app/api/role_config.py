"""
api/role_config.py
Endpoint konfigurasi tabel per role.

GET  /api/role-config/columns  → daftar semua kolom GSheet + whitelist editable Mitra
GET  /api/role-config/{role}   → ambil konfigurasi
PUT  /api/role-config/{role}   → update konfigurasi (Engineer only)
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import MITRA_EDITABLE_WHITELIST
from app.core.deps import get_current_user
from app.db.database import get_db
from app.db.models import User, RoleEnum
from app.schemas.role_config import RoleTableConfigResponse, RoleTableConfigUpdate
from app.services.role_config_service import get_config, upsert_config
from app.services.sheet_reader import read_sheet

router = APIRouter(tags=["Role Config"])


def _serialize(config) -> RoleTableConfigResponse:
    return RoleTableConfigResponse(
        role=config.role.value if hasattr(config.role, "value") else config.role,
        visible_columns=config.visible_columns or [],
        editable_columns=config.editable_columns or [],
        updated_by=config.updated_by,
        updated_at=config.updated_at.isoformat() if config.updated_at else None,
    )


@router.get("/columns")
def get_available_columns(
    current_user: User = Depends(get_current_user),
):
    sheet_data = read_sheet()
    return {
        "all_columns": sheet_data.get("columns", []),
        "mitra_editable_whitelist": list(MITRA_EDITABLE_WHITELIST),
    }


@router.get("/{role}", response_model=RoleTableConfigResponse)
async def get_role_config(
    role: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    config = await get_config(db, role)
    if not config:
        return RoleTableConfigResponse(
            role=role,
            visible_columns=[],
            editable_columns=[],
            updated_by="system",
        )
    return _serialize(config)


@router.put("/{role}", response_model=RoleTableConfigResponse)
async def update_role_config(
    role: str,
    payload: RoleTableConfigUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != RoleEnum.engineer:
        raise HTTPException(
            status_code=403,
            detail="Hanya Engineer yang bisa update konfigurasi tabel",
        )

    config = await upsert_config(
        db,
        role=role,
        visible_columns=payload.visible_columns,
        editable_columns=payload.editable_columns,
        actor_username=current_user.username,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return _serialize(config)
