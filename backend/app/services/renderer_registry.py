# backend/app/services/renderer_registry.py  🆕 NEW
"""
renderer_registry.py
Registry central semua renderer Teskom.

Tambah layanan baru → import renderer di sini + tambah ke RENDERERS.
Tidak perlu ubah file lain.
"""
from app.services.renderers import cc_tdm, cc_ip, dark_fiber

RENDERERS: dict = {
    cc_tdm.REGISTRY_KEY:     cc_tdm,
    cc_ip.REGISTRY_KEY:      cc_ip,
    dark_fiber.REGISTRY_KEY: dark_fiber,
}

def get_renderer(jenis: str):
    renderer = RENDERERS.get(jenis)
    if not renderer:
        raise ValueError(f"Renderer untuk '{jenis}' tidak terdaftar.")
    return renderer

def is_supported(jenis: str, tipe: str) -> bool:
    renderer = RENDERERS.get(jenis)
    if not renderer:
        return False
    return tipe in renderer.SUPPORTED_TIPE

def all_kategori() -> list[str]:
    return list(RENDERERS.keys())

def all_supported_tipe(jenis: str) -> list[str]:
    renderer = RENDERERS.get(jenis)
    return renderer.SUPPORTED_TIPE if renderer else []