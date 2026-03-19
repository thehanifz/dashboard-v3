from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import MITRA_EDITABLE_WHITELIST
from app.db.models import AuditLog, RoleTableConfig, RoleConfigEnum


async def get_config(db: AsyncSession, role: str) -> RoleTableConfig | None:
    result = await db.execute(
        select(RoleTableConfig).where(RoleTableConfig.role == role)
    )
    return result.scalar_one_or_none()


async def upsert_config(
    db: AsyncSession,
    *,
    role: str,
    visible_columns: list[str],
    editable_columns: list[str],
    actor_username: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> RoleTableConfig:
    if role not in ("mitra", "ptl"):
        raise HTTPException(
            status_code=400,
            detail="Role tidak valid untuk konfigurasi tabel",
        )

    if role == "mitra":
        invalid = [c for c in editable_columns if c not in MITRA_EDITABLE_WHITELIST]
        if invalid:
            raise HTTPException(
                status_code=400,
                detail=f"Kolom editable tidak diizinkan: {invalid}. Whitelist: {list(MITRA_EDITABLE_WHITELIST)}",
            )

    result = await db.execute(
        select(RoleTableConfig).where(RoleTableConfig.role == role)
    )
    config = result.scalar_one_or_none()

    if config:
        config.visible_columns  = visible_columns
        config.editable_columns = editable_columns
        config.updated_by       = actor_username
    else:
        config = RoleTableConfig(
            role=RoleConfigEnum(role),
            visible_columns=visible_columns,
            editable_columns=editable_columns,
            updated_by=actor_username,
        )
        db.add(config)

    log = AuditLog(
        actor=actor_username,
        actor_role="engineer",
        action="CONFIG_UPDATED",
        target=f"role_table_config:{role}",
        ip_address=ip_address,
        user_agent=user_agent,
        detail={
            "role": role,
            "visible_columns": visible_columns,
            "editable_columns": editable_columns,
        },
    )
    db.add(log)

    await db.commit()
    await db.refresh(config)
    return config
