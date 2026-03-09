# backend/app/services/renderers/cc_ip.py  🆕 NEW
import os, logging
from docxtpl import DocxTemplate
from app.utils.file_helper import get_output_path
from app.services.renderers.base import process_foto_dokumentasi, process_image

log = logging.getLogger("renderer.cc_ip")

REGISTRY_KEY   = "CC_IP"
SUPPORTED_TIPE = ["T", "OT"]
TEMPLATE = {
    "T":  "templates/docx/cc_ip_t.docx",
    "OT": "templates/docx/cc_ip_ot.docx",
}

async def render(tipe: str, data: dict, files: dict, tmp_dir: str) -> str:
    template_path = TEMPLATE.get(tipe)
    if not template_path or not os.path.exists(template_path):
        raise FileNotFoundError(f"Template CC_IP/{tipe} tidak ditemukan: {template_path}")

    tpl      = DocxTemplate(template_path)
    foto_ctx = await process_foto_dokumentasi(tipe, files, tmp_dir, tpl)

    foto_ctx["foto_ping"]      = await process_image(files.get("foto_ping"),      "ping",      tmp_dir, "full", tpl)
    foto_ctx["foto_speedtest"] = await process_image(files.get("foto_speedtest"), "speedtest", tmp_dir, "full", tpl)

    tpl.render({**data, **foto_ctx})
    out = get_output_path(tmp_dir, data.get("no_pa", "dokumen"))
    tpl.save(out)
    log.info("[cc_ip] Saved → %s", out)
    return out