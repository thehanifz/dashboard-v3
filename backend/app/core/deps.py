"""
core/deps.py
Dependency injection untuk autentikasi dan otorisasi.
Satu pintu validasi role — tidak tersebar ke endpoint lain.

Cara pakai di endpoint:
    from app.core.deps import get_current_user, require_role
    from app.db.models import User

    @router.get("/something")
    async def my_endpoint(current_user: User = Depends(require_role("engineer", "ptl"))):
        ...

Superuser TIDAK ada di DB — diverifikasi langsung dari .env.
Untuk endpoint khusus superuser, pakai: Depends(require_superuser)
"""
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.database import get_db
from app.db.models import User, RoleEnum

bearer_scheme = HTTPBearer(auto_error=False)

# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_token(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> str:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak ditemukan",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials


async def get_current_user(
    token: Annotated[str, Depends(_get_token)],
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Ambil user dari DB berdasarkan access token.
    Raise 401 jika token invalid, expired, atau user tidak aktif.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token tidak valid atau sudah expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        username: str = payload.get("sub")
        if not username:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Superuser tidak ada di DB — handle terpisah
    from app.core.config import SUPERUSER_USERNAME
    if username == SUPERUSER_USERNAME:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser tidak bisa akses endpoint ini",
        )

    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if not user:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akun nonaktif")

    return user


# ── Role guard ────────────────────────────────────────────────────────────────
def require_role(*roles: str):
    """
    Factory dependency — batasi endpoint ke role tertentu.

    Contoh:
        Depends(require_role("engineer"))
        Depends(require_role("engineer", "ptl"))
    """
    async def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Akses ditolak. Role yang diizinkan: {', '.join(roles)}",
            )
        return current_user
    return _check


# ── Superuser guard ───────────────────────────────────────────────────────────
async def require_superuser(
    token: Annotated[str, Depends(_get_token)],
) -> dict:
    """
    Khusus untuk endpoint superuser.
    Superuser tidak ada di DB — verifikasi dari token saja.
    """
    from app.core.config import SUPERUSER_USERNAME
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token tidak valid atau bukan superuser",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        username: str = payload.get("sub")
        role: str = payload.get("role", "")
        if username != SUPERUSER_USERNAME or role != "superuser":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    return {"username": username, "role": "superuser"}


# ── Convenience type aliases ──────────────────────────────────────────────────
CurrentUser      = Annotated[User, Depends(get_current_user)]
EngineerOnly     = Annotated[User, Depends(require_role("engineer"))]
EngineerOrPTL    = Annotated[User, Depends(require_role("engineer", "ptl"))]
AllRoles         = Annotated[User, Depends(require_role("engineer", "ptl", "mitra"))]