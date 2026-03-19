"""
api/auth.py
Endpoint autentikasi: login, logout, refresh token.

POST /api/auth/login    → username + password → access token + set httpOnly cookie
POST /api/auth/refresh  → refresh token cookie → access token baru
POST /api/auth/logout   → revoke refresh token
GET  /api/auth/me       → info user yang sedang login
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import SUPERUSER_USERNAME, SUPERUSER_PASSWORD_HASH
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
)
from app.db.database import get_db
from app.db.models import AuditLog, RefreshToken, User
from app.core.deps import get_current_user

router = APIRouter(tags=["auth"])

REFRESH_COOKIE = "refresh_token"


# ── Schemas ───────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str
    nama_lengkap: str


# ── Helper: catat audit log ───────────────────────────────────────────────────
async def _write_audit(
    db: AsyncSession,
    actor: str,
    actor_role: str,
    action: str,
    request: Request,
    target: str | None = None,
    detail: dict | None = None,
):
    log = AuditLog(
        actor=actor,
        actor_role=actor_role,
        action=action,
        target=target,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        detail=detail,
    )
    db.add(log)


# ── POST /login ───────────────────────────────────────────────────────────────
@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    username = body.username.strip().lower()

    # --- Superuser (tidak ada di DB) ---
    if username == SUPERUSER_USERNAME.lower():
        if not SUPERUSER_PASSWORD_HASH:
            raise HTTPException(status_code=500, detail="Superuser belum dikonfigurasi di .env")
        if not verify_password(body.password, SUPERUSER_PASSWORD_HASH):
            await _write_audit(db, username, "superuser", "LOGIN_FAILED", request)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Username atau password salah")

        access_token = create_access_token({"sub": SUPERUSER_USERNAME, "role": "superuser"})
        # Superuser: access token only, tidak ada refresh token di DB
        response.set_cookie(
            key=REFRESH_COOKIE, value="superuser-no-refresh",
            httponly=True, secure=True, samesite="strict", max_age=60 * 60 * 8,
        )
        await _write_audit(db, SUPERUSER_USERNAME, "superuser", "LOGIN_SUCCESS", request)
        return LoginResponse(
            access_token=access_token,
            username=SUPERUSER_USERNAME,
            role="superuser",
            nama_lengkap="Super Admin",
        )

    # --- User biasa di DB ---
    result = await db.execute(select(User).where(User.username == username))
    user: User | None = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        await _write_audit(db, username, "unknown", "LOGIN_FAILED", request)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Username atau password salah")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akun nonaktif")

    access_token = create_access_token({"sub": user.username, "role": user.role.value})
    raw_rt, hashed_rt, expires_at = create_refresh_token()

    db.add(RefreshToken(user_id=user.id, token_hash=hashed_rt, expires_at=expires_at))
    response.set_cookie(
        key=REFRESH_COOKIE, value=raw_rt,
        httponly=True, secure=True, samesite="strict", max_age=60 * 60 * 24 * 7,
    )

    await _write_audit(db, user.username, user.role.value, "LOGIN_SUCCESS", request)
    return LoginResponse(
        access_token=access_token,
        username=user.username,
        role=user.role.value,
        nama_lengkap=user.nama_lengkap,
    )


# ── POST /refresh ─────────────────────────────────────────────────────────────
@router.post("/refresh")
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    raw_rt = request.cookies.get(REFRESH_COOKIE)
    if not raw_rt or raw_rt == "superuser-no-refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token tidak ditemukan")

    hashed = hash_refresh_token(raw_rt)
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(RefreshToken)
        .where(RefreshToken.token_hash == hashed)
        .where(RefreshToken.is_revoked == False)
        .where(RefreshToken.expires_at > now)
    )
    rt_row: RefreshToken | None = result.scalar_one_or_none()
    if not rt_row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token tidak valid atau expired")

    result2 = await db.execute(select(User).where(User.id == rt_row.user_id))
    user: User | None = result2.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User tidak valid")

    # Rotate token
    rt_row.is_revoked = True
    rt_row.revoked_at = now
    raw_new, hashed_new, expires_new = create_refresh_token()
    db.add(RefreshToken(user_id=user.id, token_hash=hashed_new, expires_at=expires_new))
    response.set_cookie(
        key=REFRESH_COOKIE, value=raw_new,
        httponly=True, secure=True, samesite="strict", max_age=60 * 60 * 24 * 7,
    )

    return {
        "access_token": create_access_token({"sub": user.username, "role": user.role.value}),
        "token_type": "bearer",
    }


# ── POST /logout ──────────────────────────────────────────────────────────────
@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    raw_rt = request.cookies.get(REFRESH_COOKIE)
    if raw_rt and raw_rt != "superuser-no-refresh":
        hashed = hash_refresh_token(raw_rt)
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.token_hash == hashed)
            .where(RefreshToken.is_revoked == False)
            .values(is_revoked=True, revoked_at=datetime.now(timezone.utc))
        )
    response.delete_cookie(key=REFRESH_COOKIE, httponly=True, secure=True, samesite="strict")
    return {"ok": True}


# ── GET /me ───────────────────────────────────────────────────────────────────
@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "nama_lengkap": current_user.nama_lengkap,
        "role": current_user.role.value,
        "is_active": current_user.is_active,
    }