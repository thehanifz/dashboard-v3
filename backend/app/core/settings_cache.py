"""
core/settings_cache.py
Cache layer untuk dashboard_settings — baca DB saat startup / TTL expired.
Semua endpoint yang butuh config pakai fungsi get() bukan query DB langsung.
"""
import json
from datetime import datetime, timedelta
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

_cache: dict[str, Any] = {}
_cache_time: Optional[datetime] = None
TTL = timedelta(minutes=5)


def _coerce(value: str, value_type: str) -> Any:
    """Konversi string value ke tipe Python yang sesuai."""
    try:
        if value_type == "number":
            return float(value) if "." in value else int(value)
        elif value_type == "boolean":
            return value.lower() in ("true", "1", "yes")
        elif value_type == "json":
            return json.loads(value)
        return value
    except (ValueError, json.JSONDecodeError):
        return value


async def _reload(db: AsyncSession) -> None:
    """Muat ulang semua settings dari DB ke cache memori."""
    global _cache, _cache_time
    # import di sini untuk hindari circular import
    from app.db.models import DashboardSetting
    result = await db.execute(
        select(DashboardSetting).order_by(DashboardSetting.category, DashboardSetting.key)
    )
    rows = result.scalars().all()
    _cache = {row.key: _coerce(row.value, row.value_type) for row in rows}
    _cache_time = datetime.utcnow()


async def get(key: str, db: AsyncSession, fallback: Any = None) -> Any:
    """
    Ambil satu setting berdasarkan key.
    Otomatis reload dari DB jika cache kosong atau TTL expired.
    """
    global _cache_time
    if _cache_time is None or datetime.utcnow() - _cache_time > TTL:
        await _reload(db)
    return _cache.get(key, fallback)


async def get_all(db: AsyncSession) -> dict[str, Any]:
    """Ambil semua settings sebagai dict key->nilai."""
    if _cache_time is None or datetime.utcnow() - _cache_time > TTL:
        await _reload(db)
    return dict(_cache)


def invalidate() -> None:
    """
    Invalidate cache — panggil setelah update setting via API.
    Cache akan di-reload dari DB pada request berikutnya.
    """
    global _cache_time
    _cache_time = None
