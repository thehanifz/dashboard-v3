"""add_kanban_preset_scope

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-03-23

Kanban preset memakai tabel user_presets yang sama dengan tabel preset.
Scope baru: 'kanban_engineer' dan 'kanban_ptl'.
Yang disimpan: columns (cardFields) dan data JSON tambahan (hiddenStatuses/urutan).
Tidak perlu migrasi struktur DB — hanya perlu update validasi scope di API.
"""
from typing import Sequence, Union

revision: str = "e6f7a8b9c0d1"
down_revision: Union[str, None] = "d5e6f7a8b9c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tidak ada perubahan schema — scope baru cukup ditambah di validasi API
    pass


def downgrade() -> None:
    pass
