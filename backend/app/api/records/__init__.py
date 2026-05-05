"""
records/__init__.py
Gabungkan semua sub-router ke satu APIRouter tunggal.
File lain (app/api/__init__.py atau main.py) cukup import:

    from app.api.records import router as records_router
    app.include_router(records_router, prefix="/records")
"""
from fastapi import APIRouter

from .ptl      import router as _ptl_router
from .engineer import router as _engineer_router
from .mitra    import router as _mitra_router

router = APIRouter(tags=["records"])

# PTL harus di-include PERTAMA agar /ptl-sheet tidak tertangkap oleh /{row_id}
# engineer_router punya GET "/" — prefix="/" agar tidak crash
# (FastAPI tidak mengizinkan prefix="" + path="" keduanya kosong sekaligus)
router.include_router(_ptl_router)
router.include_router(_engineer_router, prefix="/")
router.include_router(_mitra_router)
