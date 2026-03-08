# Dashboard v3 — Unified App

Penggabungan 3 aplikasi dalam 1 platform:
- **Dashboard PA** — Monitor progres PA dari GSheet (Table, Kanban, Summary)
- **As-Built Generator** — Upload SVG template & generate diagram jaringan
- **Teskom** — Generate dokumen BAI/BATC + auto-fill dari GSheet

## Struktur Project
```
dashboard-v3/
├── backend/          # FastAPI — 1 backend untuk semua modul
│   ├── app/
│   │   ├── api/      # 1 file = 1 grup endpoint
│   │   ├── services/ # 1 file = 1 layanan
│   │   └── utils/    # 1 file = 1 utilitas
│   └── main.py
└── frontend/         # React + TypeScript + Vite + Tailwind
    └── src/
        ├── pages/     # 1 file = 1 halaman
        ├── components/# 1 file = 1 komponen
        ├── services/  # 1 file = 1 grup API call
        └── state/     # 1 file = 1 store
```

## Setup Backend
```bash
cd backend
cp .env.example .env          # Edit sesuai konfigurasi
cp credentials.json.example credentials.json  # Isi dengan service account GSheet
pip install -r requirements.txt
uvicorn main:app --reload
```

## Setup Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Tambah Fitur Baru
Cukup buat file baru:
- Backend: `app/api/fitur_baru.py` + daftarkan di `main.py`
- Frontend: `src/pages/FiturBaruPage.tsx` + tambah menu di `Sidebar.tsx` & `appStore.ts`
