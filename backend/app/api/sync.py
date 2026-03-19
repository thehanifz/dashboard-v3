"""
api/sync.py
Phase 6 — Sync Engine endpoints.

POST /api/sync/run/{ptl_username}  → trigger manual sync untuk 1 PTL (Engineer only)
POST /api/sync/run-all             → trigger sync semua PTL aktif (Engineer only)
GET  /api/sync/logs                → riwayat sync log (Engineer only)
GET  /api/sync/mismatches          → daftar mismatch aktif (Engineer only)
DELETE /api/sync/mismatches/{id}   → dismiss mismatch
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.database import get_db
from app.db.models import (
    RoleEnum, SyncLog, SyncMismatch, SyncTypeEnum, User
)
from app.services.sync_engine import run_sync

router = APIRouter(tags=["Sync"])


def _require_engineer(current_user: User):
    if current_user.role != RoleEnum.engineer:
        raise HTTPException(status_code=403, detail="Hanya Engineer yang bisa akses sync")


# ── POST /sync/run/{ptl_username} ─────────────────────────────────────────────
@router.post("/run/{ptl_username}")
async def sync_one_ptl(
    ptl_username: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_engineer(current_user)

    result = await db.execute(
        select(User).where(User.username == ptl_username).where(User.role == RoleEnum.ptl)
    )
    ptl_user = result.scalar_one_or_none()
    if not ptl_user:
        raise HTTPException(status_code=404, detail=f"PTL user '{ptl_username}' tidak ditemukan")

    summary = await run_sync(
        db,
        ptl_user=ptl_user,
        sync_type=SyncTypeEnum.manual,
        triggered_by=current_user.username,
    )
    return summary


# ── POST /sync/run-all ────────────────────────────────────────────────────────
@router.post("/run-all")
async def sync_all_ptl(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_engineer(current_user)

    result = await db.execute(
        select(User)
        .where(User.role == RoleEnum.ptl)
        .where(User.is_active == True)
        .where(User.gsheet_url != None)
    )
    ptl_users = result.scalars().all()

    if not ptl_users:
        return {"ok": True, "message": "Tidak ada PTL aktif dengan gsheet_url", "results": []}

    results = []
    for ptl_user in ptl_users:
        summary = await run_sync(
            db,
            ptl_user=ptl_user,
            sync_type=SyncTypeEnum.manual,
            triggered_by=current_user.username,
        )
        results.append(summary)

    total_synced    = sum(r.get("synced_fields", 0) for r in results)
    total_mismatch  = sum(r.get("new_mismatches", 0) for r in results)

    return {
        "ok":            True,
        "ptl_count":     len(ptl_users),
        "total_synced":  total_synced,
        "total_mismatches": total_mismatch,
        "results":       results,
    }


# ── GET /sync/logs ────────────────────────────────────────────────────────────
@router.get("/logs")
async def get_sync_logs(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_engineer(current_user)

    result = await db.execute(
        select(SyncLog)
        .order_by(desc(SyncLog.synced_at))
        .limit(limit)
    )
    logs = result.scalars().all()

    return [
        {
            "id":            l.id,
            "id_pa":         l.id_pa,
            "field_changed": l.field_changed,
            "old_value":     l.old_value,
            "new_value":     l.new_value,
            "sync_type":     l.sync_type.value,
            "synced_at":     l.synced_at.isoformat(),
            "synced_by":     l.synced_by,
        }
        for l in logs
    ]


# ── GET /sync/mismatches ──────────────────────────────────────────────────────
@router.get("/mismatches")
async def get_mismatches(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_engineer(current_user)

    result = await db.execute(
        select(SyncMismatch)
        .where(SyncMismatch.resolved_at == None)
        .where(SyncMismatch.is_dismissed == False)
        .order_by(desc(SyncMismatch.detected_at))
    )
    items = result.scalars().all()

    return [
        {
            "id":             m.id,
            "id_pa":          m.id_pa,
            "mismatch_type":  m.mismatch_type.value,
            "detected_at":    m.detected_at.isoformat(),
            "ptl_user_id":    str(m.ptl_user_id),
        }
        for m in items
    ]


# ── DELETE /sync/mismatches/{id} ──────────────────────────────────────────────
@router.delete("/mismatches/{mismatch_id}")
async def dismiss_mismatch(
    mismatch_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_engineer(current_user)

    result = await db.execute(
        select(SyncMismatch).where(SyncMismatch.id == mismatch_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Mismatch tidak ditemukan")

    from datetime import datetime, timezone
    item.is_dismissed = True
    item.dismissed_by = current_user.username
    item.dismissed_at = datetime.now(timezone.utc)
    await db.commit()

    return {"ok": True, "dismissed_id": mismatch_id}
