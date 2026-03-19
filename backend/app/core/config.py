import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ── Server ────────────────────────────────────────────────────────────────────
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", 8000))
ENV: str  = os.getenv("ENV", "development")
ROOT_PATH = os.getenv("ROOT_PATH", "")

def parse_cors(v: str) -> List[str]:
    if not v:
        return ["*"]
    return [x.strip() for x in v.split(",") if x]

BACKEND_CORS_ORIGINS = parse_cors(os.getenv("BACKEND_CORS_ORIGINS", "*"))

# ── Google Sheets ─────────────────────────────────────────────────────────────
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
SPREADSHEET_ID                 = os.getenv("SPREADSHEET_ID")
SHEET_NAME                     = os.getenv("SHEET_NAME", "RAW")
STATUS_SHEET_NAME              = os.getenv("STATUS_SHEET_NAME", "Opsi")
STATUS_COL_PRIMARY             = os.getenv("STATUS_COL_PRIMARY", "Status Pekerjaan")
STATUS_COL_DETAIL              = os.getenv("STATUS_COL_DETAIL", "Detail Progres")

# Nama kolom di GSheet untuk filter per role
PTL_COLUMN_NAME   = os.getenv("PTL_COLUMN_NAME", "PTL TERMINATING")
MITRA_COLUMN_NAME = os.getenv("MITRA_COLUMN_NAME", "MITRA")

# ── AsBuilt ───────────────────────────────────────────────────────────────────
SVG_TEMPLATE_DIR: Path = BASE_DIR / "public" / "templates"
SVG_TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)

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
DB_URL      = os.getenv("DB_URL", "postgresql+asyncpg://db_dashboard_pro:1c0nplus_db-thehanifz@localhost:5433/dashboard_pro")
DB_URL_SYNC = os.getenv("DB_URL_SYNC", "postgresql+psycopg2://db_dashboard_pro:1c0nplus_db-thehanifz@localhost:5433/dashboard_pro")

# ── Auth / JWT ────────────────────────────────────────────────────────────────
SECRET_KEY                  = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
ALGORITHM                   = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480))
REFRESH_TOKEN_EXPIRE_DAYS   = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

# ── Superuser ─────────────────────────────────────────────────────────────────
SUPERUSER_USERNAME      = os.getenv("SUPERUSER_USERNAME", "superadmin")
SUPERUSER_PASSWORD_HASH = os.getenv("SUPERUSER_PASSWORD_HASH", "")

# ── RBAC — kolom editable per role ───────────────────────────────────────────
PTL_EDITABLE_COLUMNS: set = {
    col.strip()
    for col in os.getenv("PTL_EDITABLE_COLUMNS", "STATUS,DETAIL,KETERANGAN").split(",")
    if col.strip()
}

MITRA_EDITABLE_WHITELIST: set = {
    col.strip()
    for col in os.getenv("MITRA_EDITABLE_WHITELIST", "VALIDASI_MITRA,KETERANGAN_MITRA,STATUS_MITRA").split(",")
    if col.strip()
}