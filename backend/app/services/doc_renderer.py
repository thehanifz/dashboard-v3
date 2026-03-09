# backend/app/services/doc_renderer.py  ✏️ MODIFIED — sekarang hanya dispatcher
"""
doc_renderer.py
Dispatcher: cukup lookup registry dan jalankan renderer yang tepat.
Tidak perlu diubah saat tambah layanan baru.
"""
from app.services.renderer_registry import get_renderer

async def render_doc(tipe: str, jenis: str, data: dict, files: dict, tmp_dir: str) -> str:
    renderer = get_renderer(jenis)
    return await renderer.render(tipe=tipe, data=data, files=files, tmp_dir=tmp_dir)