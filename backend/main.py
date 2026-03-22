from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os

from app.core.config import BACKEND_CORS_ORIGINS
from app.api.records  import router as records_router
from app.api.status   import router as status_router
from app.api.asbuilt  import router as asbuilt_router
from app.api.teskom   import router as teskom_router
from app.api.bai      import router as bai_router
from app.api.auth     import router as auth_router
from app.api.admin import router as admin_router
from app.api.role_config import router as role_config_router
from app.api.sync    import router as sync_router
from app.api.profile  import router as profile_router
from app.api.settings import router as settings_router
from app.api.presets import router as presets_router

# ── Rate Limiter ──────────────────────────────────────────────────────────────
# Default limit: 200/menit untuk semua endpoint
# Login limit lebih ketat: 5x per 10 menit — diset langsung di auth.py
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

app = FastAPI(
    title="Dashboard v3 — Unified API",
    version="3.1.0",
    description="Unified backend: Dashboard, AsBuilt, Teskom + Auth",
    root_path="",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Error handler — jangan leak stack trace ───────────────────────────────────
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "Terjadi kesalahan server"})

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router,    prefix="/api/auth")
app.include_router(records_router, prefix="/api/records")
app.include_router(status_router,  prefix="/api/status")
app.include_router(asbuilt_router, prefix="/api/asbuilt")
app.include_router(teskom_router,  prefix="/api/teskom")
app.include_router(bai_router,     prefix="/api/bai")
app.include_router(admin_router, prefix="/api/admin")
app.include_router(role_config_router, prefix="/api/role-config")
app.include_router(sync_router,    prefix="/api/sync")
app.include_router(profile_router,  prefix="/api/profile")
app.include_router(settings_router, prefix="/api/settings")
app.include_router(presets_router, prefix="/api/presets")

@app.get("/health")
def health():
    return {"ok": True, "version": "3.1.0"}

# ── Static files ──────────────────────────────────────────────────────────────
if os.path.exists("public/templates"):
    app.mount("/public/templates", StaticFiles(directory="public/templates"), name="svg-templates")

if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")