# backend/app/services/renderers/dark_fiber.py  ✏️ MODIFIED
import os, logging
from docxtpl import DocxTemplate
from app.utils.file_helper import get_output_path
from app.services.renderers.base import process_foto_dokumentasi, process_image

log = logging.getLogger("renderer.dark_fiber")

REGISTRY_KEY   = "DARK_FIBER"
SUPPORTED_TIPE = ["T", "OT"]    # ← sebelumnya ["T"]
TEMPLATE = {
    "T":  "templates/docx/df_t.docx",
    "OT": "templates/docx/df_ot.docx",  # ← tambah template OT
}

async def render(tipe: str, data: dict, files: dict, tmp_dir: str) -> str:
    template_path = TEMPLATE.get(tipe)
    if not template_path or not os.path.exists(template_path):
        raise FileNotFoundError(f"Template DARK_FIBER/{tipe} tidak ditemukan: {template_path}")

    tpl      = DocxTemplate(template_path)
    foto_ctx = await process_foto_dokumentasi(tipe, files, tmp_dir, tpl)

    processed_otdr = []
    for i, upload in enumerate(files.get("foto_otdr", [])):
        processed_otdr.append(await process_image(upload, f"otdr_{i}", tmp_dir, "otdr", tpl))
    foto_ctx["foto_otdr"] = processed_otdr

    tpl.render({**data, **foto_ctx})
    out = get_output_path(tmp_dir, data.get("no_pa", "dokumen"))
    tpl.save(out)
    log.info("[dark_fiber] Saved → %s", out)
    return out