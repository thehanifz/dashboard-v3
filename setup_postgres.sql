-- ============================================================
-- Setup PostgreSQL untuk Dashboard V3
-- Jalankan sebagai postgres superuser:
--   sudo -u postgres psql -f setup_postgres.sql
-- ============================================================

-- 1. Buat user
CREATE USER db_dashboard_pro WITH PASSWORD '1c0nplus_db-thehanifz';

-- 2. Buat database
CREATE DATABASE dashboard_pro OWNER db_dashboard_pro;

-- 3. Grant privileges
GRANT ALL PRIVILEGES ON DATABASE dashboard_pro TO db_dashboard_pro;

-- 4. Koneksi ke database baru, lalu grant schema
\c dashboard_pro

GRANT ALL ON SCHEMA public TO db_dashboard_pro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO db_dashboard_pro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO db_dashboard_pro;

-- Selesai. Jalankan Alembic setelah ini untuk buat semua tabel.