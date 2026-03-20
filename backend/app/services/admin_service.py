from datetime import datetime, timezone
from fastapi import HTTPException, status
from passlib.context import CryptContext
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditLog, RefreshToken, User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _normalize_gsheet_url(role: str, gsheet_url: str | None) -> str | None:
    if role == "ptl":
        if not gsheet_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="gsheet_url wajib diisi untuk role PTL",
            )
        return gsheet_url
    return None


async def _write_audit_log(
    db: AsyncSession,
    *,
    actor: str,
    actor_role: str,
    action: str,
    target: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    detail: dict | None = None,
) -> None:
    log = AuditLog(
        actor=actor,
        actor_role=actor_role,
        action=action,
        target=target,
        ip_address=ip_address,
        user_agent=user_agent,
        detail=detail,
    )
    db.add(log)


async def list_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(desc(User.created_at)))
    return result.scalars().all()


async def create_user(
    db: AsyncSession,
    *,
    actor_username: str,
    actor_role: str,
    payload,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> User:
    result = await db.execute(select(User).where(User.username == payload.username))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username sudah digunakan",
        )

    gsheet_url = _normalize_gsheet_url(payload.role, payload.gsheet_url)
    gsheet_sheet_name = payload.gsheet_sheet_name if payload.role == "ptl" else None
    password_hash = pwd_context.hash(payload.password)

    user = User(
        username=payload.username,
        password_hash=password_hash,
        nama_lengkap=payload.nama_lengkap,
        role=payload.role,
        gsheet_url=gsheet_url,
        gsheet_sheet_name=gsheet_sheet_name,
        is_active=True,
        created_by=actor_username,
    )
    db.add(user)
    await db.flush()

    await _write_audit_log(
        db,
        actor=actor_username,
        actor_role=actor_role,
        action="USER_CREATED",
        target=user.username,
        ip_address=ip_address,
        user_agent=user_agent,
        detail={
            "user_id": str(user.id),
            "role": payload.role,
            "nama_lengkap": user.nama_lengkap,
        },
    )

    await db.commit()
    await db.refresh(user)
    return user


async def update_user(
    db: AsyncSession,
    *,
    user_id: str,
    actor_username: str,
    actor_role: str,
    payload,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    previous = {
        "nama_lengkap": user.nama_lengkap,
        "role": user.role.value if hasattr(user.role, "value") else user.role,
        "gsheet_url": user.gsheet_url,
        "is_active": user.is_active,
    }

    user.nama_lengkap = payload.nama_lengkap
    user.role = payload.role
    user.gsheet_url = _normalize_gsheet_url(payload.role, payload.gsheet_url)
    user.gsheet_sheet_name = payload.gsheet_sheet_name if payload.role == "ptl" else None
    user.is_active = payload.is_active

    if not payload.is_active:
        await _revoke_all_refresh_tokens(db, user.id)

    await _write_audit_log(
        db,
        actor=actor_username,
        actor_role=actor_role,
        action="USER_UPDATED",
        target=user.username,
        ip_address=ip_address,
        user_agent=user_agent,
        detail={
            "before": previous,
            "after": {
                "nama_lengkap": user.nama_lengkap,
                "role": payload.role,
                "gsheet_url": user.gsheet_url,
                "is_active": user.is_active,
            },
        },
    )

    await db.commit()
    await db.refresh(user)
    return user


async def deactivate_user(
    db: AsyncSession,
    *,
    user_id: str,
    actor_username: str,
    actor_role: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    user.is_active = False
    revoked_count = await _revoke_all_refresh_tokens(db, user.id)

    await _write_audit_log(
        db,
        actor=actor_username,
        actor_role=actor_role,
        action="USER_DEACTIVATED",
        target=user.username,
        ip_address=ip_address,
        user_agent=user_agent,
        detail={"user_id": str(user.id), "revoked_refresh_tokens": revoked_count},
    )

    await db.commit()
    await db.refresh(user)
    return user


async def reset_password(
    db: AsyncSession,
    *,
    user_id: str,
    new_password: str,
    actor_username: str,
    actor_role: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    user.password_hash = pwd_context.hash(new_password)
    revoked_count = await _revoke_all_refresh_tokens(db, user.id)

    await _write_audit_log(
        db,
        actor=actor_username,
        actor_role=actor_role,
        action="PASSWORD_RESET",
        target=user.username,
        ip_address=ip_address,
        user_agent=user_agent,
        detail={"user_id": str(user.id), "revoked_refresh_tokens": revoked_count},
    )

    await db.commit()
    await db.refresh(user)
    return user


async def _revoke_all_refresh_tokens(db: AsyncSession, user_id) -> int:
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked == False,
        )
    )
    tokens = result.scalars().all()
    now = datetime.now(timezone.utc)
    for token in tokens:
        token.is_revoked = True
        token.revoked_at = now
    return len(tokens)
