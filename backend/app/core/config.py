# backend/app/core/config.py  ✏️ MODIFIED — hapus TESKOM_TEMPLATES
import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent

HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", 8000))
ENV: str  = os.getenv("ENV", "development")
ROOT_PATH = os.getenv("ROOT_PATH", "/api")

def parse_cors(v: str) -> List[str]:
    if not v: return ["*"]
    return [x.strip() for x in v.split(",") if x]

BACKEND_CORS_ORIGINS = parse_cors(os.getenv("BACKEND_CORS_ORIGINS", "*"))

GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
SPREADSHEET_ID                 = os.getenv("SPREADSHEET_ID")
SHEET_NAME                     = os.getenv("SHEET_NAME", "RAW")
STATUS_SHEET_NAME              = os.getenv("STATUS_SHEET_NAME", "Opsi")
STATUS_COL_PRIMARY             = os.getenv("STATUS_COL_PRIMARY", "Status Pekerjaan")
STATUS_COL_DETAIL              = os.getenv("STATUS_COL_DETAIL", "Detail Progres")

SVG_TEMPLATE_DIR: Path = BASE_DIR / "public" / "templates"
SVG_TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_MB    = int(os.getenv("MAX_UPLOAD_MB", 10))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
IMG_QUALITY      = int(os.getenv("IMG_QUALITY", 85))
IMG_WIDTH_OT     = int(os.getenv("IMG_WIDTH_OT", 70))
IMG_WIDTH_SINGLE = int(os.getenv("IMG_WIDTH_SINGLE", 140))
IMG_WIDTH_BERT   = int(os.getenv("IMG_WIDTH_BERT", 160))
TMP_DIR: str     = os.getenv("TMP_DIR", "tmp")

# TESKOM_TEMPLATES dihapus — tiap renderer menyimpan template path-nya sendiri