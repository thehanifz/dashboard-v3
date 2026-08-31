"""persist superuser sessions and rename application to OverSee

Revision ID: j3k4l5m6n7o8
Revises: i2j3k4l5m6n7
"""
from alembic import op
import sqlalchemy as sa

revision = "j3k4l5m6n7o8"
down_revision = "i2j3k4l5m6n7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "superuser_refresh_tokens",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_revoked", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_superuser_refresh_tokens_username", "superuser_refresh_tokens", ["username"], unique=False)
    op.create_index("ix_superuser_refresh_tokens_token_hash", "superuser_refresh_tokens", ["token_hash"], unique=True)

    # Existing databases use both app_name and legacy app.name in different
    # parts of the codebase. Keep both in sync with the new brand.
    conn = op.get_bind()
    conn.execute(
        sa.text("UPDATE dashboard_settings SET value = 'OverSee' WHERE key IN ('app_name', 'app.name')")
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text("UPDATE dashboard_settings SET value = 'Dashboard v3' WHERE key = 'app_name'")
    )
    conn.execute(
        sa.text("UPDATE dashboard_settings SET value = 'Dashboard V3' WHERE key = 'app.name'")
    )
    op.drop_index("ix_superuser_refresh_tokens_token_hash", table_name="superuser_refresh_tokens")
    op.drop_index("ix_superuser_refresh_tokens_username", table_name="superuser_refresh_tokens")
    op.drop_table("superuser_refresh_tokens")
