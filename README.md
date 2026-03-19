# Phase 0 + 1 — Setup & Auth

## Urutan pengerjaan

---

### STEP 1 — Setup PostgreSQL

Jalankan di server (sebagai user postgres):

```bash
sudo -u postgres psql -f setup_postgres.sql
```

Verifikasi koneksi berhasil:
```bash
psql -h localhost -p 5433 -U db_dashboard_pro -d dashboard_pro -c "\dt"
# Harusnya: "Did not find any relations." (belum ada tabel, tapi koneksi berhasil)
```

---

### STEP 2 — Salin file ke project

**Backend — file yang DIGANTI:**
```
backend/.env                        ← salin dari sini (isi SPREADSHEET_ID + SECRET_KEY + SUPERUSER_PASSWORD_HASH)
backend/requirements.txt            ← salin dari sini
backend/main.py                     ← salin dari sini
backend/app/core/config.py          ← salin dari sini
```

**Backend — folder BARU (buat dulu kalau belum ada):**
```
backend/app/core/security.py        ← salin dari sini
backend/app/core/deps.py            ← salin dari sini
backend/app/db/__init__.py          ← buat file kosong
backend/app/db/database.py          ← salin dari sini
backend/app/db/models.py            ← salin dari sini
backend/app/api/auth.py             ← salin dari sini
backend/alembic.ini                 ← salin dari sini
backend/alembic/env.py              ← salin dari sini
backend/alembic/script.py.mako      ← salin dari sini
backend/alembic/versions/           ← buat folder kosong
```

**Frontend — file yang DIGANTI:**
```
frontend/src/services/api.ts        ← salin dari sini
frontend/src/App.tsx                ← salin dari sini
```

**Frontend — file BARU:**
```
frontend/src/state/authStore.ts     ← salin dari sini
frontend/src/services/authApi.ts    ← salin dari sini
frontend/src/pages/LoginPage.tsx    ← salin dari sini
```

---

### STEP 3 — Isi nilai .env yang belum ada

Edit `backend/.env`, isi 3 nilai ini:

**SPREADSHEET_ID** — ambil dari URL Google Sheets kamu:
```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_ADA_DI_SINI/edit
```

**SECRET_KEY** — generate di server:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**SUPERUSER_PASSWORD_HASH** — generate dengan password pilihan kamu:
```bash
cd /root/main-app/dashboard-v3/backend
python3 -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('PASSWORD_PILIHAN_KAMU'))"
```
Salin output-nya ke `SUPERUSER_PASSWORD_HASH=` di .env

---

### STEP 4 — Install dependencies

```bash
cd /root/main-app/dashboard-v3/backend
pip install -r requirements.txt
```

---

### STEP 5 — Jalankan migrasi Alembic (buat semua tabel)

```bash
cd /root/main-app/dashboard-v3/backend

# Buat file migrasi pertama dari model
alembic revision --autogenerate -m "initial_tables"

# Jalankan migrasi
alembic upgrade head
```

Verifikasi tabel terbuat:
```bash
psql -h localhost -p 5433 -U db_dashboard_pro -d dashboard_pro -c "\dt"
```
Harusnya muncul: users, refresh_tokens, role_table_config, sync_log, sync_mismatch, audit_log, password_reset_requests

---

### STEP 6 — Build frontend

```bash
cd /root/main-app/dashboard-v3/frontend
npm install
npm run build
```

---

### STEP 7 — Restart PM2

```bash
pm2 restart dashboard-v3
# atau kalau nama proses berbeda:
pm2 list
pm2 restart <nama_proses>
```

---

### STEP 8 — Test

**Test login superuser:**
```bash
curl -X POST https://dasdev.thehanifz.fun/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"PASSWORD_KAMU"}'
```

Harusnya return `access_token`.

**Test CORS sudah benar:**
- Buka browser, akses `https://dasdev.thehanifz.fun`
- Harusnya tampil halaman login

---

### Troubleshooting umum

**Error: connection refused port 5433**
```bash
# Cek PostgreSQL berjalan
sudo systemctl status postgresql
# Cek port yang dipakai
sudo -u postgres psql -c "SHOW port;"
```

**Error: alembic tidak bisa import app**
```bash
# Pastikan jalankan dari folder backend/
cd /root/main-app/dashboard-v3/backend
alembic revision --autogenerate -m "initial_tables"
```

**Error: bcrypt version mismatch**
```bash
pip install bcrypt==4.1.3 --force-reinstall
```

**Halaman login tidak muncul (masih tampil app lama)**
```bash
# Frontend perlu di-rebuild ulang
cd /root/main-app/dashboard-v3/frontend
npm run build
pm2 restart dashboard-v3
```