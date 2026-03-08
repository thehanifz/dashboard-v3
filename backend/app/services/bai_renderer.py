"""
bai_renderer.py
Render dokumen BAI (Berita Acara Instalasi) dari template BAI.docx.
Menggunakan docxtpl — placeholder di template berupa {{ nama_field }}.
"""
import os
import logging
from docxtpl import DocxTemplate

log = logging.getLogger("bai_renderer")

# Path template BAI — letakkan file BAI.docx di folder ini
TEMPLATE_PATH = os.getenv("TEMPLATE_BAI", "templates/docx/BAI.docx")


def render_bai(context: dict, tmp_dir: str) -> str:
    """
    Render template BAI.docx dengan context data dari GSheet.

    Args:
        context  : dict berisi semua field yang akan diisi ke template
        tmp_dir  : folder temporary untuk menyimpan output

    Returns:
        Path lengkap file DOCX yang sudah dirender

    Raises:
        FileNotFoundError : jika template BAI.docx tidak ditemukan
    """
    if not os.path.exists(TEMPLATE_PATH):
        raise FileNotFoundError(
            f"Template BAI tidak ditemukan di: {TEMPLATE_PATH}\n"
            f"Letakkan file BAI.docx di folder templates/docx/"
        )

    log.info("[bai_renderer] Rendering template: %s", TEMPLATE_PATH)
    log.debug("[bai_renderer] Context keys: %s", list(context.keys()))

    tpl = DocxTemplate(TEMPLATE_PATH)
    tpl.render(context)

    pa_clean    = context.get("no_pa", "dokumen").replace("/", "-").replace(" ", "_")
    output_path = os.path.join(tmp_dir, f"BAI_{pa_clean}.docx")
    tpl.save(output_path)

    log.info("[bai_renderer] Saved → %s", output_path)
    return output_path