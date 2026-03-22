"""add_ptl_own_sheet_to_synctypeenum

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-03-22

"""
from typing import Sequence, Union
from alembic import op

revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, None] = "c4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL: tambah value baru ke enum yang sudah ada
    op.execute("ALTER TYPE synctypeenum ADD VALUE IF NOT EXISTS 'ptl_own_sheet'")


def downgrade() -> None:
    # PostgreSQL tidak support DROP VALUE dari enum
    # Untuk rollback, perlu recreate enum tanpa value ini
    pass