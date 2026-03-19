"""
core/security.py
Hash password, buat/verifikasi JWT, buat refresh token.
Semua urusan kriptografi ada di sini — tidak tersebar ke file lain.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import (
    SECRET_KEY, ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Password ──────────────────────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── Access Token (JWT) ────────────────────────────────────────────────────────
def create_access_token(data: dict, expires_minutes: Optional[int] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decode dan validasi access token.
    Raise JWTError jika invalid atau expired.
    """
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    if payload.get("type") != "access":
        raise JWTError("Bukan access token")
    return payload


# ── Refresh Token ─────────────────────────────────────────────────────────────
def create_refresh_token() -> tuple[str, str, datetime]:
    """
    Buat refresh token random.
    Return: (raw_token, hashed_token, expires_at)
    raw_token  → dikirim ke client via httpOnly cookie
    hashed_token → disimpan di DB
    """
    raw = secrets.token_urlsafe(64)
    hashed = _hash_token(raw)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return raw, hashed, expires_at


def hash_refresh_token(raw: str) -> str:
    return _hash_token(raw)


def _hash_token(raw: str) -> str:
    """SHA-256 hash — cukup untuk refresh token storage."""
    return hashlib.sha256(raw.encode()).hexdigest()