import os
import sys
from pathlib import Path
from typing import List
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ── Server ────────────────────────────────────────────────────────────────────
HOST: str  = os.getenv("HOST", "0.0.0.0")
PORT: int  = int(os.getenv("PORT", 8000))
ENV: str   = os.getenv("ENV", "development")
ROOT_PATH  = os.getenv("ROOT_PATH", "")

def parse_cors(v: str) -> List[str]:
    if not v:
        return ["*"]
    return [x.strip() for x in v.split(",") if x]

BACKEND_CORS_ORIGINS = parse_cors(os.getenv("BACKEND_CORS_ORIGINS", "*"))

# ── Google Sheets ─────────────────────────────────────────────────────────────
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
SPREADSHEET_ID                 = os.getenv("SPREADSHEET_ID")
SHEET_NAME                     = os.getenv("SHEET_NAME", "PLN")  # DEPRECATED: gunakan key 'columns.sheet_name' di dashboard_settings
STATUS_SHEET_NAME              = os.getenv("STATUS_SHEET_NAME", "Opsi")
STATUS_COL_PRIMARY             = os.getenv("STATUS_COL_PRIMARY", "Status Pekerjaan")  # DEPRECATED: gunakan key 'columns.status_primary' di dashboard_settings
STATUS_COL_DETAIL              = os.getenv("STATUS_COL_DETAIL", "Detail Progres")  # DEPRECATED: gunakan key 'columns.status_detail' di dashboard_settings
GOOGLE_SERVICE_ACCOUNT_EMAIL   = os.getenv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "")

# Nama kolom di GSheet untuk filter per role
# Dua kolom PTL — filter OR: baris dimana salah satu kolom = nama PTL  # DEPRECATED: gunakan key 'columns.ptl_terminating' di dashboard_settings
PTL_COL_TERMINATING = os.getenv("PTL_COL_TERMINATING", "PTL TERMINATING")  # DEPRECATED: gunakan key 'columns.ptl_originating' di dashboard_settings
PTL_COL_ORIGINATING = os.getenv("PTL_COL_ORIGINATING", "PTL ORIGINATING")  # DEPRECATED: gunakan key 'columns.ptl_originating' di dashboard_settings
MITRA_COLUMN_NAME   = os.getenv("MITRA_COLUMN_NAME", "MITRA TERMINATING")  # DEPRECATED: gunakan key 'columns.mitra' di dashboard_settings

# ── AsBuilt ───────────────────────────────────────────────────────────────────
SVG_TEMPLATE_DIR: Path = BASE_DIR / "public" / "templates"
SVG_TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)
FREE_DRAWING_ICON_DIR: Path = BASE_DIR.parent / "frontend" / "public" / "icons"
FREE_DRAWING_ICON_DIR.mkdir(parents=True, exist_ok=True)

# ── Teskom ────────────────────────────────────────────────────────────────────
MAX_UPLOAD_MB    = int(os.getenv("MAX_UPLOAD_MB", 10))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
IMG_QUALITY      = int(os.getenv("IMG_QUALITY", 85))
IMG_WIDTH_OT     = int(os.getenv("IMG_WIDTH_OT", 70))
IMG_WIDTH_SINGLE = int(os.getenv("IMG_WIDTH_SINGLE", 140))
IMG_WIDTH_BERT   = int(os.getenv("IMG_WIDTH_BERT", 160))
TMP_DIR: str     = os.getenv("TMP_DIR", "tmp")

TESKOM_TEMPLATES = {
    ("CC_TDM",     "T"):  os.getenv("TEMPLATE_CC_TDM_T",  "templates/docx/cc_tdm_t.docx"),
    ("CC_TDM",     "OT"): os.getenv("TEMPLATE_CC_TDM_OT", "templates/docx/cc_tdm_ot.docx"),
    ("CC_IP",      "T"):  os.getenv("TEMPLATE_CC_IP_T",   "templates/docx/cc_ip_t.docx"),
    ("CC_IP",      "OT"): os.getenv("TEMPLATE_CC_IP_OT",  "templates/docx/cc_ip_ot.docx"),
    ("DARK_FIBER", "T"):  os.getenv("TEMPLATE_DF_T",      "templates/docx/df_t.docx"),
    ("DARK_FIBER", "OT"): os.getenv("TEMPLATE_DF_OT",     "templates/docx/df_ot.docx"),
}

# ── PostgreSQL ────────────────────────────────────────────────────────────────
# WAJIB diset via .env — tidak ada default untuk menghindari kebocoran kredensial
DB_URL      = os.getenv("DB_URL")
DB_URL_SYNC = os.getenv("DB_URL_SYNC")

# ── Auth / JWT ────────────────────────────────────────────────────────────────
# Generate SECRET_KEY baru dengan:
#   python -c "import secrets; print(secrets.token_hex(32))"
# WAJIB diset via .env — tidak ada default untuk keamanan
SECRET_KEY                  = os.getenv("SECRET_KEY")
ALGORITHM                   = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480))
REFRESH_TOKEN_EXPIRE_DAYS   = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

# ── Superuser ─────────────────────────────────────────────────────────────────
# Tidak disimpan di DB — dikonfigurasi di sini saja via .env
# Buat hash password dengan:
#   python -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('PASSWORD_KAMU'))"
SUPERUSER_USERNAME      = os.getenv("SUPERUSER_USERNAME", "superadmin")
SUPERUSER_PASSWORD_HASH = os.getenv("SUPERUSER_PASSWORD_HASH")

# ── Kolom editable per role ───────────────────────────────────────────────────
PTL_EDITABLE_COLUMNS: list = [
    col.strip()
    for col in os.getenv("PTL_EDITABLE_COLUMNS", "").split(",")
    if col.strip()
]

MITRA_EDITABLE_WHITELIST: set = {
    col.strip()
    for col in os.getenv("MITRA_EDITABLE_WHITELIST", "VALIDASI_MITRA,KETERANGAN_MITRA,STATUS_MITRA").split(",")
    if col.strip()
}

# ── Startup Validation ────────────────────────────────────────────────────────
# Variabel ini WAJIB ada di .env — app akan gagal start dengan pesan jelas jika kosong
_REQUIRED_ENV_VARS = {
    "DB_URL":                DB_URL,
    "DB_URL_SYNC":           DB_URL_SYNC,
    "SECRET_KEY":            SECRET_KEY,
    "SPREADSHEET_ID":        SPREADSHEET_ID,
    "SUPERUSER_PASSWORD_HASH": SUPERUSER_PASSWORD_HASH,
}

_missing = [key for key, val in _REQUIRED_ENV_VARS.items() if not val]

if _missing:
    print("\n" + "=" * 60, file=sys.stderr)
    print("❌  STARTUP ERROR — Variabel .env berikut wajib diisi:", file=sys.stderr)
    for key in _missing:
        print(f"    • {key}", file=sys.stderr)
    print("\n    Salin backend/.env.example ke backend/.env", file=sys.stderr)
    print("    lalu isi nilai yang sesuai.", file=sys.stderr)
    print("=" * 60 + "\n", file=sys.stderr)
    sys.exit(1)
