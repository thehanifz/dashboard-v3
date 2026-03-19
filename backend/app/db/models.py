"""
db/models.py
Semua ORM model dalam satu file.
"""
import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


# ── Enums ─────────────────────────────────────────────────────────────────────
class RoleEnum(str, enum.Enum):
    engineer = "engineer"
    ptl      = "ptl"
    mitra    = "mitra"

class SyncTypeEnum(str, enum.Enum):
    auto         = "auto"
    manual       = "manual"
    dashboard    = "dashboard"
    mitra_update = "mitra_update"

class MismatchTypeEnum(str, enum.Enum):
    missing_in_engineer = "missing_in_engineer"
    missing_in_ptl      = "missing_in_ptl"

class ResetStatusEnum(str, enum.Enum):
    pending   = "pending"
    completed = "completed"
    cancelled = "cancelled"

class RoleConfigEnum(str, enum.Enum):
    mitra = "mitra"
    ptl   = "ptl"


# ── users ─────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id            : Mapped[uuid.UUID]           = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username      : Mapped[str]                 = mapped_column(String(50), unique=True, nullable=False, index=True)
    password_hash : Mapped[str]                 = mapped_column(String(255), nullable=False)
    nama_lengkap  : Mapped[str]                 = mapped_column(String(150), nullable=False, index=True)
    role          : Mapped[RoleEnum]            = mapped_column(Enum(RoleEnum), nullable=False)
    gsheet_url    : Mapped[Optional[str]]       = mapped_column(String(500), nullable=True)
    is_active     : Mapped[bool]                = mapped_column(Boolean, default=True, nullable=False)
    created_at    : Mapped[datetime]            = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by    : Mapped[Optional[str]]       = mapped_column(String(50), nullable=True)

    refresh_tokens         : Mapped[list["RefreshToken"]]        = relationship(back_populates="user", cascade="all, delete-orphan")
    sync_logs              : Mapped[list["SyncLog"]]             = relationship(back_populates="ptl_user", foreign_keys="SyncLog.ptl_user_id")
    sync_mismatches        : Mapped[list["SyncMismatch"]]        = relationship(back_populates="ptl_user")
    password_reset_requests: Mapped[list["PasswordResetRequest"]]= relationship(back_populates="user", cascade="all, delete-orphan")


# ── refresh_tokens ────────────────────────────────────────────────────────────
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id         : Mapped[int]                 = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id    : Mapped[uuid.UUID]           = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash : Mapped[str]                 = mapped_column(String(255), nullable=False, index=True)
    issued_at  : Mapped[datetime]            = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at : Mapped[datetime]            = mapped_column(DateTime(timezone=True), nullable=False)
    is_revoked : Mapped[bool]                = mapped_column(Boolean, default=False, nullable=False)
    revoked_at : Mapped[Optional[datetime]]  = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")


# ── role_table_config ─────────────────────────────────────────────────────────
class RoleTableConfig(Base):
    __tablename__ = "role_table_config"

    id               : Mapped[int]            = mapped_column(Integer, primary_key=True, autoincrement=True)
    role             : Mapped[RoleConfigEnum] = mapped_column(Enum(RoleConfigEnum), nullable=False, unique=True)
    visible_columns  : Mapped[list]           = mapped_column(JSON, nullable=False, default=list)
    editable_columns : Mapped[list]           = mapped_column(JSON, nullable=False, default=list)
    updated_by       : Mapped[str]            = mapped_column(String(50), nullable=False, default="system")
    updated_at       : Mapped[datetime]       = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ── sync_log ──────────────────────────────────────────────────────────────────
class SyncLog(Base):
    __tablename__ = "sync_log"

    id            : Mapped[int]                 = mapped_column(Integer, primary_key=True, autoincrement=True)
    ptl_user_id   : Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    id_pa         : Mapped[str]                 = mapped_column(String(100), nullable=False, index=True)
    field_changed : Mapped[str]                 = mapped_column(String(100), nullable=False)
    old_value     : Mapped[Optional[str]]       = mapped_column(Text, nullable=True)
    new_value     : Mapped[Optional[str]]       = mapped_column(Text, nullable=True)
    sync_type     : Mapped[SyncTypeEnum]        = mapped_column(Enum(SyncTypeEnum), nullable=False)
    synced_at     : Mapped[datetime]            = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    synced_by     : Mapped[Optional[str]]       = mapped_column(String(50), nullable=True)

    ptl_user: Mapped[Optional["User"]] = relationship(back_populates="sync_logs", foreign_keys=[ptl_user_id])


# ── sync_mismatch ─────────────────────────────────────────────────────────────
class SyncMismatch(Base):
    __tablename__ = "sync_mismatch"

    id            : Mapped[int]                  = mapped_column(Integer, primary_key=True, autoincrement=True)
    ptl_user_id   : Mapped[uuid.UUID]            = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    id_pa         : Mapped[str]                  = mapped_column(String(100), nullable=False)
    mismatch_type : Mapped[MismatchTypeEnum]     = mapped_column(Enum(MismatchTypeEnum), nullable=False)
    detected_at   : Mapped[datetime]             = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at   : Mapped[Optional[datetime]]   = mapped_column(DateTime(timezone=True), nullable=True)
    is_dismissed  : Mapped[bool]                 = mapped_column(Boolean, default=False, nullable=False)
    dismissed_by  : Mapped[Optional[str]]        = mapped_column(String(50), nullable=True)
    dismissed_at  : Mapped[Optional[datetime]]   = mapped_column(DateTime(timezone=True), nullable=True)

    ptl_user: Mapped["User"] = relationship(back_populates="sync_mismatches")


# ── audit_log ─────────────────────────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_log"

    id         : Mapped[int]            = mapped_column(Integer, primary_key=True, autoincrement=True)
    actor      : Mapped[str]            = mapped_column(String(50), nullable=False, index=True)
    actor_role : Mapped[str]            = mapped_column(String(20), nullable=False)
    action     : Mapped[str]            = mapped_column(String(100), nullable=False, index=True)
    target     : Mapped[Optional[str]]  = mapped_column(String(150), nullable=True)
    ip_address : Mapped[Optional[str]]  = mapped_column(String(45), nullable=True)
    user_agent : Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    detail     : Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at : Mapped[datetime]       = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


# ── password_reset_requests ───────────────────────────────────────────────────
class PasswordResetRequest(Base):
    __tablename__ = "password_reset_requests"

    id           : Mapped[int]                  = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id      : Mapped[uuid.UUID]            = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status       : Mapped[ResetStatusEnum]      = mapped_column(Enum(ResetStatusEnum), nullable=False, default=ResetStatusEnum.pending)
    requested_at : Mapped[datetime]             = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at : Mapped[Optional[datetime]]   = mapped_column(DateTime(timezone=True), nullable=True)
    completed_by : Mapped[Optional[str]]        = mapped_column(String(50), nullable=True)

    user: Mapped["User"] = relationship(back_populates="password_reset_requests")