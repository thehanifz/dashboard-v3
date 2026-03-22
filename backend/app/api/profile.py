"""
api/profile.py
Endpoint profil user yang sedang login.
Superuser tidak ada di DB — data diambil dari token JWT langsung.

GET  /api/profile/me           → info profil (semua role termasuk superuser)
PUT  /api/profile/password     → ganti password (verifikasi lama dulu) — non-superuser only
PUT  /api/profile/gsheet       → edit gsheet_url + gsheet_sheet_name — PTL only
"""
import re
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import SUPERUSER_USERNAME, GOOGLE_SERVICE_ACCOUNT_EMAIL
from app.core.deps import get_current_user, _get_token
from app.core.security import verify_password, hash_password, decode_access_token
from app.db.database import get_db
from app.db.models import RefreshToken, User, RoleEnum
from app.services.sheet_writer import (
    ensure_columns_exist_external,
    check_write_permission_external,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Profile"])

# Kolom wajib yang harus ada di GSheet PTL
PTL_REQUIRED_COLUMNS = [
    "Status Pekerjaan",
    "Detail Progres",
    "Status PA",
    "Kategori PA",
]


def _extract_spreadsheet_id(url: str) -> str | None:
    match = re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", url)
    return match.group(1) if match else None


# ── Schemas ───────────────────────────────────────────────────────────────────
class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password:     str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)


class UpdateGSheetRequest(BaseModel):
    gsheet_url:        str | None = Field(default=None, max_length=500)
    gsheet_sheet_name: str | None = Field(default=None, max_length=100)


# ── GET /me — support semua role termasuk superuser ───────────────────────────
bearer_scheme = HTTPBearer(auto_error=False)

@router.get("/me")
async def get_profile(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    """
    Ambil data profil.
    - Superuser: data dari token JWT (tidak ada di DB)
    - User biasa: data dari DB
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Token tidak ditemukan")

    try:
        payload = decode_access_token(credentials.credentials)
        username: str = payload.get("sub", "")
        role: str = payload.get("role", "")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token tidak valid")

    # Superuser — return dari token, tidak query DB
    if username == SUPERUSER_USERNAME or role == "superuser":
        return {
            "username":          username,
            "nama_lengkap":      "Super Admin",
            "role":              "superuser",
            "is_active":         True,
            "gsheet_url":        None,
            "gsheet_sheet_name": None,
            "created_at":        None,
            "created_by":        None,
        }

    # User biasa — query DB
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    return {
        "username":          user.username,
        "nama_lengkap":      user.nama_lengkap,
        "role":              user.role.value,
        "is_active":         user.is_active,
        "gsheet_url":        user.gsheet_url,
        "gsheet_sheet_name": user.gsheet_sheet_name,
        "created_at":        user.created_at.isoformat() if user.created_at else None,
        "created_by":        user.created_by,
    }


# ── PUT /password — non-superuser only ───────────────────────────────────────
@router.put("/password")
async def change_password(
    payload: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password lama tidak sesuai",
        )

    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Konfirmasi password tidak cocok",
        )

    if verify_password(payload.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password baru tidak boleh sama dengan password lama",
        )

    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()
    user.password_hash = hash_password(payload.new_password)

    # Revoke semua refresh token
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == current_user.id)
        .where(RefreshToken.is_revoked == False)
        .values(is_revoked=True)
    )

    await db.commit()
    return {"ok": True, "message": "Password berhasil diubah. Silakan login ulang."}


# ── PUT /gsheet — PTL only ────────────────────────────────────────────────────
@router.put("/gsheet")
async def update_gsheet(
    payload: UpdateGSheetRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != RoleEnum.ptl:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya PTL yang bisa update GSheet info",
        )

    # Simpan ke DB dulu
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()
    user.gsheet_url        = payload.gsheet_url.strip() if payload.gsheet_url else None
    user.gsheet_sheet_name = payload.gsheet_sheet_name.strip() if payload.gsheet_sheet_name else None
    await db.commit()

    # Kalau URL kosong, return langsung
    if not user.gsheet_url:
        return {"ok": True, "gsheet_url": None, "gsheet_sheet_name": None,
                "created_columns": [], "need_share": False, "service_email": GOOGLE_SERVICE_ACCOUNT_EMAIL}

    spreadsheet_id = _extract_spreadsheet_id(user.gsheet_url)
    if not spreadsheet_id:
        raise HTTPException(status_code=400, detail="URL GSheet tidak valid")

    sheet_name = user.gsheet_sheet_name or "Sheet1"

    # ── 1. Cek write permission ───────────────────────────────────────────────
    has_write = False
    try:
        has_write = check_write_permission_external(spreadsheet_id, sheet_name)
    except Exception as e:
        logger.warning(f"[profile/gsheet] Gagal cek permission: {e}")

    if not has_write:
        return {
            "ok":              True,
            "gsheet_url":      user.gsheet_url,
            "gsheet_sheet_name": user.gsheet_sheet_name,
            "created_columns": [],
            "need_share":      True,
            "service_email":   GOOGLE_SERVICE_ACCOUNT_EMAIL,
        }

    # ── 2. Auto-create kolom wajib yang belum ada ─────────────────────────────
    created_columns = []
    try:
        created_columns = ensure_columns_exist_external(
            spreadsheet_id=spreadsheet_id,
            sheet_name=sheet_name,
            required_columns=PTL_REQUIRED_COLUMNS,
        )
        if created_columns:
            logger.info(f"[profile/gsheet] Auto-created columns: {created_columns} for user {current_user.username}")
    except Exception as e:
        logger.warning(f"[profile/gsheet] Gagal auto-create kolom: {e}")

    return {
        "ok":                True,
        "gsheet_url":        user.gsheet_url,
        "gsheet_sheet_name": user.gsheet_sheet_name,
        "created_columns":   created_columns,
        "need_share":        False,
        "service_email":     GOOGLE_SERVICE_ACCOUNT_EMAIL,
    }