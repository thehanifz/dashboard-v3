"""add_user_presets_and_column_config

Revision ID: b3c4d5e6f7a8
Revises: a1b2c3d4e5f6
Create Date: 2026-03-22

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "b3c4d5e6f7a8"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tabel preset kolom (Engineer + PTL)
    op.create_table(
        "user_presets",
        sa.Column("id",         sa.Integer(),               autoincrement=True, nullable=False),
        sa.Column("user_id",    UUID(as_uuid=True),         nullable=False),
        sa.Column("scope",      sa.String(length=20),       nullable=False),
        sa.Column("name",       sa.String(length=100),      nullable=False),
        sa.Column("columns",    sa.JSON(),                  nullable=False),
        sa.Column("widths",     sa.JSON(),                  nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_presets_user_id", "user_presets", ["user_id"])

    # Tabel editable columns config (Engineer)
    op.create_table(
        "user_column_config",
        sa.Column("id",               sa.Integer(),               autoincrement=True, nullable=False),
        sa.Column("user_id",          UUID(as_uuid=True),         nullable=False),
        sa.Column("editable_columns", sa.JSON(),                  nullable=False),
        sa.Column("updated_at",       sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("user_column_config")
    op.drop_index("ix_user_presets_user_id", table_name="user_presets")
    op.drop_table("user_presets")