"""create_pa_records_table

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-03-26

Tabel pa_records — data Engineer dari GSheet yang sudah dimigrasi ke PostgreSQL.
Menggantikan pembacaan langsung GSheet untuk performa lebih baik.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "f7a8b9c0d1e2"
down_revision: Union[str, None] = "e6f7a8b9c0d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pa_records",

        # ── Primary key ──────────────────────────────────────────────────────
        sa.Column("id",               sa.Integer,     primary_key=True, autoincrement=True),

        # ── Identitas PA ─────────────────────────────────────────────────────
        sa.Column("id_pa",            sa.String(50),  nullable=True,  index=True),
        sa.Column("node",             sa.String(20),  nullable=True),   # TERMINATING / ORIGINATING
        sa.Column("id_permohonan",    sa.String(50),  nullable=True),
        sa.Column("service_id",       sa.String(50),  nullable=True),

        # ── Produk & Layanan ─────────────────────────────────────────────────
        sa.Column("nama_produk",      sa.Text,        nullable=True),
        sa.Column("jenis_layanan",    sa.String(50),  nullable=True),
        sa.Column("kategori_layanan", sa.String(100), nullable=True),
        sa.Column("segmentasi",       sa.String(50),  nullable=True),
        sa.Column("kategori_customer",sa.String(100), nullable=True),
        sa.Column("kategori_owner",   sa.String(100), nullable=True),
        sa.Column("bandwidth",        sa.String(50),  nullable=True),

        # ── Lokasi ───────────────────────────────────────────────────────────
        sa.Column("alamat",           sa.Text,        nullable=True),
        sa.Column("kp_node",          sa.String(100), nullable=True, index=True),
        sa.Column("latitude",         sa.Float,       nullable=True),
        sa.Column("longitude",        sa.Float,       nullable=True),

        # ── Customer ─────────────────────────────────────────────────────────
        sa.Column("nama_customer",    sa.Text,        nullable=True),

        # ── Tanggal ──────────────────────────────────────────────────────────
        sa.Column("tgl_terbit_pa",    sa.DateTime,    nullable=True),
        sa.Column("tgl_bai",          sa.DateTime,    nullable=True),
        sa.Column("tgl_upload_bai",   sa.DateTime,    nullable=True),

        # ── Jenis & Status ───────────────────────────────────────────────────
        sa.Column("jenis_pekerjaan",  sa.String(50),  nullable=True, index=True),
        sa.Column("nomor_io",         sa.String(50),  nullable=True),
        sa.Column("status_pa",        sa.String(100), nullable=True, index=True),
        sa.Column("kategori_status",  sa.String(100), nullable=True),
        sa.Column("kategori_progres", sa.String(200), nullable=True),
        sa.Column("detail_progres",   sa.Text,        nullable=True),
        sa.Column("progress_update",  sa.Text,        nullable=True),

        # ── Aging ────────────────────────────────────────────────────────────
        sa.Column("aging_pa",         sa.Integer,     nullable=True),
        sa.Column("aging_non_sc",     sa.Float,       nullable=True),   # ada desimal
        sa.Column("aging_sc",         sa.Float,       nullable=True),   # ada desimal

        # ── Tim ──────────────────────────────────────────────────────────────
        sa.Column("nama_ptl",         sa.String(200), nullable=True),
        sa.Column("nama_sales",       sa.String(200), nullable=True),
        sa.Column("ptl_update",       sa.String(200), nullable=True),

        # ── Metadata sync ────────────────────────────────────────────────────
        sa.Column("gsheet_row",       sa.Integer,     nullable=False),  # nomor baris di GSheet
        sa.Column("synced_at",        sa.DateTime,    nullable=True,
                  server_default=sa.func.now()),
        sa.Column("updated_at",       sa.DateTime,    nullable=True,
                  onupdate=sa.func.now()),
    )

    # Index tambahan untuk query umum
    op.create_index("ix_pa_records_id_pa",    "pa_records", ["id_pa"], if_not_exists=True)
    op.create_index("ix_pa_records_status",   "pa_records", ["status_pa"], if_not_exists=True)
    op.create_index("ix_pa_records_jenis",    "pa_records", ["jenis_pekerjaan"], if_not_exists=True)
    op.create_index("ix_pa_records_kpnode",   "pa_records", ["kp_node"], if_not_exists=True)
    op.create_index("ix_pa_records_gsheet",   "pa_records", ["gsheet_row"], unique=True, if_not_exists=True)


def downgrade() -> None:
    op.drop_index("ix_pa_records_gsheet",   table_name="pa_records")
    op.drop_index("ix_pa_records_kpnode",   table_name="pa_records")
    op.drop_index("ix_pa_records_jenis",    table_name="pa_records")
    op.drop_index("ix_pa_records_status",   table_name="pa_records")
    op.drop_index("ix_pa_records_id_pa",    table_name="pa_records")
    op.drop_table("pa_records")