"""add_dashboard_settings

Revision ID: g0h1i2j3k4l5
Revises: f7a8b9c0d1e2
Create Date: 2026-03-30

Buat tabel dashboard_settings untuk konfigurasi dinamis yang bisa diedit
superadmin via UI tanpa perlu restart atau ubah file kode.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

revision: str = "g0h1i2j3k4l5"
down_revision: Union[str, None] = "f7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "dashboard_settings",
        sa.Column("id",          sa.Integer(),     nullable=False),
        sa.Column("key",         sa.String(100),   nullable=False),
        sa.Column("value",       sa.Text(),         nullable=False),
        sa.Column("value_type",  sa.String(20),    nullable=False, server_default="string"),
        sa.Column("category",    sa.String(50),    nullable=False),
        sa.Column("label",       sa.String(200),   nullable=False),
        sa.Column("description", sa.Text(),         nullable=True),
        sa.Column("is_editable", sa.Boolean(),     nullable=False, server_default="true"),
        sa.Column("updated_by",  sa.String(100),   nullable=True),
        sa.Column("updated_at",  sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )
    op.create_index("ix_dashboard_settings_key",      "dashboard_settings", ["key"],      unique=True)
    op.create_index("ix_dashboard_settings_category", "dashboard_settings", ["category"], unique=False)

    # Seed data awal
    op.execute(text("""
        INSERT INTO dashboard_settings (key, value, value_type, category, label, description) VALUES
        ('aging.tier1',        '11',                'number',  'aging',   'Tier 1 (Hari)',       'Batas hari aging tier 1 — tampil kuning'),
        ('aging.tier2',        '30',                'number',  'aging',   'Tier 2 (Hari)',       'Batas hari aging tier 2 — tampil oranye'),
        ('aging.tier3',        '60',                'number',  'aging',   'Tier 3 (Hari)',       'Batas hari aging tier 3 — tampil merah'),
        ('app.name',           'Dashboard V3',      'string',  'app',     'Nama Aplikasi',       'Nama tampil di login & header'),
        ('app.date_format',    'DD/MM/YYYY',        'string',  'app',     'Format Tanggal',      'Format tanggal yang ditampilkan di tabel'),
        ('columns.mitra',      'MITRA TERMINATING', 'string',  'columns', 'Kolom Mitra',         'Nama kolom mitra di Google Sheet'),
        ('columns.sheet_name', 'PLN',               'string',  'columns', 'Nama Sheet',          'Nama tab sheet Google Sheets yang dibaca'),
        ('columns.ptl_terminating', 'PTL TERMINATING', 'string', 'columns', 'Kolom PTL Terminating', 'Nama kolom PTL Terminating di GSheet'),
        ('columns.ptl_originating', 'PTL ORIGINATING', 'string', 'columns', 'Kolom PTL Originating', 'Nama kolom PTL Originating di GSheet'),
        ('columns.status_primary',  'Status Pekerjaan', 'string', 'columns', 'Kolom Status Primer', 'Nama kolom status utama di GSheet'),
        ('columns.status_detail',   'Detail Progres',   'string', 'columns', 'Kolom Detail Progres', 'Nama kolom detail progres di GSheet')
    """))


def downgrade() -> None:
    op.drop_index("ix_dashboard_settings_category", table_name="dashboard_settings")
    op.drop_index("ix_dashboard_settings_key",      table_name="dashboard_settings")
    op.drop_table("dashboard_settings")
