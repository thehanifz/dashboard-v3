# backend/app/services/renderers/cc_tdm.py  🆕 NEW
import os, logging
from docxtpl import DocxTemplate
from app.utils.file_helper import get_output_path
from app.services.renderers.base import process_foto_dokumentasi, process_image

log = logging.getLogger("renderer.cc_tdm")

REGISTRY_KEY   = "CC_TDM"
SUPPORTED_TIPE = ["T", "OT"]
TEMPLATE = {
    "T":  "templates/docx/cc_tdm_t.docx",
    "OT": "templates/docx/cc_tdm_ot.docx",
}

async def render(tipe: str, data: dict, files: dict, tmp_dir: str) -> str:
    template_path = TEMPLATE.get(tipe)
    if not template_path or not os.path.exists(template_path):
        raise FileNotFoundError(f"Template CC_TDM/{tipe} tidak ditemukan: {template_path}")

    tpl      = DocxTemplate(template_path)
    foto_ctx = await process_foto_dokumentasi(tipe, files, tmp_dir, tpl)

    processed_bert = []
    for i, upload in enumerate(files.get("foto_bert", [])):
        processed_bert.append(await process_image(upload, f"bert_{i}", tmp_dir, "bert", tpl))
    foto_ctx["foto_bert"] = processed_bert

    tpl.render({**data, **foto_ctx})
    out = get_output_path(tmp_dir, data.get("no_pa", "dokumen"))
    tpl.save(out)
    log.info("[cc_tdm] Saved → %s", out)
    return out