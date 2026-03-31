"""add table and app settings to dashboard_settings

Revision ID: h1i2j3k4l5m6
Revises: g0h1i2j3k4l5
Create Date: 2026-03-31

Menambah seed data untuk:
- col_id_pa, col_nama_perusahaan   → kolom aksi di DynamicTable
- table_title                      → judul tabel DynamicTable
- ptl_editable_columns             → kolom editable PTL (JSON array)
- app_name, app_subtitle, app_version → info aplikasi di Sidebar
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

revision = 'h1i2j3k4l5m6'
down_revision = 'g0h1i2j3k4l5'
branch_labels = None
depends_on = None


NEW_SETTINGS = [
    # ── Kolom aksi DynamicTable ──────────────────────────────────────────────
    {
        "key": "col_id_pa",
        "value": "ID PA",
        "value_type": "string",
        "category": "columns",
        "label": "Kolom ID PA",
        "description": "Nama kolom ID PA di GSheet — dipakai di tombol aksi BAI & Teskom",
        "is_editable": True,
    },
    {
        "key": "col_nama_perusahaan",
        "value": "NAMA PERUSAHAAN",
        "value_type": "string",
        "category": "columns",
        "label": "Kolom Nama Perusahaan",
        "description": "Nama kolom Nama Perusahaan di GSheet — dipakai di modal BAI",
        "is_editable": True,
    },
    # ── Konfigurasi tabel ────────────────────────────────────────────────────
    {
        "key": "table_title",
        "value": "Detail Pekerjaan",
        "value_type": "string",
        "category": "app",
        "label": "Judul Tabel Utama",
        "description": "Judul yang ditampilkan di header TableToolbar halaman Detail",
        "is_editable": True,
    },
    {
        "key": "ptl_editable_columns",
        "value": '["STATUS", "DETAIL", "KETERANGAN"]',
        "value_type": "json",
        "category": "columns",
        "label": "Kolom Editable PTL",
        "description": "Daftar kolom yang bisa diedit oleh role PTL (format JSON array string)",
        "is_editable": True,
    },
    # ── Info aplikasi (Sidebar) ──────────────────────────────────────────────
    {
        "key": "app_name",
        "value": "Dashboard v3",
        "value_type": "string",
        "category": "app",
        "label": "Nama Aplikasi",
        "description": "Nama aplikasi yang ditampilkan di header Sidebar",
        "is_editable": True,
    },
    {
        "key": "app_subtitle",
        "value": "PA PLN Icon+",
        "value_type": "string",
        "category": "app",
        "label": "Subtitle Aplikasi",
        "description": "Subtitle di bawah nama aplikasi pada Sidebar",
        "is_editable": True,
    },
    {
        "key": "app_version",
        "value": "3.2",
        "value_type": "string",
        "category": "app",
        "label": "Versi Aplikasi",
        "description": "Versi aplikasi yang ditampilkan di footer Sidebar",
        "is_editable": True,
    },
]


def upgrade() -> None:
    conn = op.get_bind()
    now  = datetime.utcnow().isoformat()

    for s in NEW_SETTINGS:
        conn.execute(
            sa.text(
                """
                INSERT INTO dashboard_settings
                    (key, value, value_type, category, label, description, is_editable, updated_at)
                VALUES
                    (:key, :value, :value_type, :category, :label, :description, :is_editable, :updated_at)
                ON CONFLICT (key) DO NOTHING
                """
            ),
            {**s, "updated_at": now},
        )


def downgrade() -> None:
    conn = op.get_bind()
    keys = [s["key"] for s in NEW_SETTINGS]
    for key in keys:
        conn.execute(
            sa.text("DELETE FROM dashboard_settings WHERE key = :key"),
            {"key": key},
        )
