from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import BACKEND_CORS_ORIGINS, ROOT_PATH
from app.api.records import router as records_router
from app.api.status import router as status_router
from app.api.asbuilt import router as asbuilt_router
from app.api.teskom import router as teskom_router
from app.api.bai import router as bai_router

app = FastAPI(
    title="Dashboard v3 — Unified API",
    version="3.0.0",
    description="Unified backend: Dashboard, AsBuilt, Teskom",
    root_path="",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers BEFORE static files mount
app.include_router(records_router, prefix="/api/records")
app.include_router(status_router, prefix="/api/status")
app.include_router(asbuilt_router, prefix="/api/asbuilt")
app.include_router(teskom_router, prefix="/api/teskom")
app.include_router(bai_router, prefix="/api/bai")

@app.get("/health")
def health():
    return {"ok": True, "version": "3.0.0", "message": "Dashboard v3 is running"}

# Mount folder template AsBuilt (SVG) agar bisa diakses frontend
if os.path.exists("public/templates"):
    app.mount("/public/templates", StaticFiles(directory="public/templates"), name="svg-templates")

# Serve frontend static files (build result)
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
