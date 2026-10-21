"""add teskom wakil users table

Revision ID: 106879e824c3
Revises: j3k4l5m6n7o8
Create Date: 2026-10-21 17:57:07.928719

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '106879e824c3'
down_revision: Union[str, None] = 'j3k4l5m6n7o8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "teskom_wakil_users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nama_wakil_user", sa.String(length=150), nullable=False),
        sa.Column("jabatan_user", sa.String(length=100), server_default="", nullable=False),
        sa.Column("no_hp_user", sa.String(length=50), server_default="", nullable=False),
        sa.Column("alamat_kantor_user", sa.Text(), server_default="", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_teskom_wakil_users_user_id", "teskom_wakil_users", ["user_id"], unique=False)
    op.create_index("ix_teskom_wakil_users_nama_wakil_user", "teskom_wakil_users", ["nama_wakil_user"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_teskom_wakil_users_nama_wakil_user", table_name="teskom_wakil_users")
    op.drop_index("ix_teskom_wakil_users_user_id", table_name="teskom_wakil_users")
    op.drop_table("teskom_wakil_users")
