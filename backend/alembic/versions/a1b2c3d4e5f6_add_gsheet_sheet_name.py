"""add_gsheet_sheet_name_to_users

Revision ID: a1b2c3d4e5f6
Revises: 9667709678d7
Create Date: 2026-03-20

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "9667709678d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("gsheet_sheet_name", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "gsheet_sheet_name")
