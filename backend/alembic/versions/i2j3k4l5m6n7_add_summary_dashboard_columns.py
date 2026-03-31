"""add summary dashboard column settings

Revision ID: i2j3k4l5m6n7
Revises: h1i2j3k4l5m6
Create Date: 2026-03-31

Menambah seed data nama kolom GSheet untuk SummaryDashboard:
- col_tgl_terbit, col_status_pa, col_status_pekerjaan,
  col_layanan, col_jenis_mutasi

Nilai isi dropdown (Done BAI, On Progress, dll) TIDAK disimpan di DB
— diambil langsung dari data GSheet secara dinamis.

Juga membenarkan columns.status_primary & columns.status_detail
agar sinkron dengan nilai di .env (STATUS_COL_PRIMARY / STATUS_COL_DETAIL).
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

revision = 'i2j3k4l5m6n7'
down_revision = 'h1i2j3k4l5m6'
branch_labels = None
depends_on = None

NEW_SETTINGS = [
    {
        "key": "col_tgl_terbit",
        "value": "TGL TERBIT PA",
        "value_type": "string",
        "category": "columns",
        "label": "Kolom Tanggal Terbit PA",
        "description": "Nama kolom tanggal terbit PA di GSheet — dipakai untuk kalkulasi aging",
        "is_editable": True,
    },
    {
        "key": "col_status_pa",
        "value": "Status PA",
        "value_type": "string",
        "category": "columns",
        "label": "Kolom Status PA",
        "description": "Nama kolom Status PA di GSheet — dipakai untuk filter & KPI summary",
        "is_editable": True,
    },
    {
        "key": "col_status_pekerjaan",
        "value": "Status Pekerjaan",
        "value_type": "string",
        "category": "columns",
        "label": "Kolom Status Pekerjaan",
        "description": "Nama kolom Status Pekerjaan di GSheet — dipakai untuk chart breakdown on-progress",
        "is_editable": True,
    },
    {
        "key": "col_layanan",
        "value": "LAYANAN",
        "value_type": "string",
        "category": "columns",
        "label": "Kolom Layanan",
        "description": "Nama kolom Layanan di GSheet — dipakai untuk chart distribusi layanan",
        "is_editable": True,
    },
    {
        "key": "col_jenis_mutasi",
        "value": "JENIS MUTASI",
        "value_type": "string",
        "category": "columns",
        "label": "Kolom Jenis Mutasi",
        "description": "Nama kolom Jenis Mutasi di GSheet — dipakai untuk chart distribusi jenis mutasi",
        "is_editable": True,
    },
]

# Key yang nilainya perlu dikoreksi agar sinkron dengan .env
CORRECT_EXISTING = [
    {"key": "columns.status_primary", "value": "Status Pekerjaan"},
    {"key": "columns.status_detail",  "value": "Detail Progres"},
]


def upgrade() -> None:
    conn = op.get_bind()
    now  = datetime.utcnow().isoformat()

    # Insert kolom baru (skip jika key sudah ada)
    for s in NEW_SETTINGS:
        conn.execute(
            sa.text("""
                INSERT INTO dashboard_settings
                    (key, value, value_type, category, label, description, is_editable, updated_at)
                VALUES
                    (:key, :value, :value_type, :category, :label, :description, :is_editable, :updated_at)
                ON CONFLICT (key) DO NOTHING
            """),
            {**s, "updated_at": now},
        )

    # Koreksi nilai columns.status_primary & columns.status_detail
    for c in CORRECT_EXISTING:
        conn.execute(
            sa.text("""
                UPDATE dashboard_settings
                SET value = :value, updated_at = :updated_at
                WHERE key = :key
            """),
            {"key": c["key"], "value": c["value"], "updated_at": now},
        )


def downgrade() -> None:
    conn = op.get_bind()
    # Hapus key baru
    for s in NEW_SETTINGS:
        conn.execute(
            sa.text("DELETE FROM dashboard_settings WHERE key = :key"),
            {"key": s["key"]},
        )
    # Kembalikan nilai lama
    conn.execute(
        sa.text("UPDATE dashboard_settings SET value = 'kategori_progres' WHERE key = 'columns.status_primary'"),
    )
    conn.execute(
        sa.text("UPDATE dashboard_settings SET value = 'detail_progres' WHERE key = 'columns.status_detail'"),
    )
