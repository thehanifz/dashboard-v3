"""
doc_renderer.py
Render DOCX testcomm document berdasarkan:
  - tipe: "T" (Terminating) atau "OT" (Originating-Terminating)
  - jenis: "CC_TDM" | "CC_IP" | "DARK_FIBER"
"""

import os, io, uuid, logging
from docxtpl import DocxTemplate, InlineImage
from docx.shared import Mm
from PIL import Image
from app.core.config import IMG_QUALITY
from app.utils.file_helper import get_output_path

log = logging.getLogger("doc_renderer")
logging.basicConfig(level=logging.DEBUG)

# ── Template paths ──
TEMPLATES = {
    ("CC_TDM",    "T"):  "templates/docx/cc_tdm_t.docx",
    ("CC_TDM",    "OT"): "templates/docx/cc_tdm_ot.docx",
    ("CC_IP",     "T"):  "templates/docx/cc_ip_t.docx",
    ("CC_IP",     "OT"): "templates/docx/cc_ip_ot.docx",
    ("DARK_FIBER","T"):  "templates/docx/df_t.docx",
    ("DARK_FIBER","OT"): "templates/docx/df_ot.docx",
}

SLOT_MM = {
    "half":      70,
    "full":     140,
    "bert":     160,
    "bert_half": 80,
    "asplan":   130,
    "otdr":     140,
}


def _blank_image(tpl, tmp_dir: str, width_mm: int) -> InlineImage:
    buf = io.BytesIO()
    Image.new("RGB", (10, 10), (255, 255, 255)).save(buf, "JPEG")
    buf.seek(0)
    path = os.path.join(tmp_dir, f"blank_{uuid.uuid4()}.jpg")
    with open(path, "wb") as f:
        f.write(buf.read())
    return InlineImage(tpl, path, width=Mm(width_mm))


async def _process(upload, name: str, tmp_dir: str, slot: str, tpl) -> InlineImage:
    """Resize + compress UploadFile → InlineImage. Jika None → blank."""
    width_mm = SLOT_MM.get(slot, 70)
    max_px   = {
        "half": 1200, "full": 2000, "bert": 2200,
        "bert_half": 1200, "asplan": 1800, "otdr": 2000
    }.get(slot, 1200)

    if not upload or not upload.filename:
        log.debug("[_process] %s → SKIP (None atau no filename), blank image", name)
        return _blank_image(tpl, tmp_dir, width_mm)

    log.debug("[_process] %s → filename=%s size=%s slot=%s",
              name, upload.filename, getattr(upload, 'size', '?'), slot)

    raw  = os.path.join(tmp_dir, f"raw_{name}")
    data = await upload.read()
    log.debug("[_process] %s → bytes read: %d", name, len(data))

    with open(raw, "wb") as f:
        f.write(data)

    proc = os.path.join(tmp_dir, f"proc_{name}.jpg")
    with Image.open(raw) as img:
        if img.mode in ("RGBA", "LA"):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            rgba = img.convert("RGBA")
            bg.paste(rgba, mask=rgba.split()[3])
            img = bg
        elif img.mode == "P":
            if "transparency" in img.info:
                rgba = img.convert("RGBA")
                bg = Image.new("RGB", img.size, (255, 255, 255))
                bg.paste(rgba, mask=rgba.split()[3])
                img = bg
            else:
                img = img.convert("RGB")
        elif img.mode not in ("RGB",):
            img = img.convert("RGB")
        w, h = img.size
        if w > max_px:
            img = img.resize((max_px, int(h * max_px / w)), Image.LANCZOS)
        img.save(proc, "JPEG", quality=IMG_QUALITY, optimize=True)
        log.debug("[_process] %s → saved proc %s (%dx%d)", name, proc, img.width, img.height)

    os.remove(raw)
    return InlineImage(tpl, proc, width=Mm(width_mm))


async def render_doc(tipe: str, jenis: str, data: dict,
                     files: dict, tmp_dir: str) -> str:

    template_path = TEMPLATES.get((jenis, tipe))
    log.info("[render_doc] jenis=%s tipe=%s template=%s", jenis, tipe, template_path)

    if not template_path or not os.path.exists(template_path):
        raise FileNotFoundError(
            f"Template tidak ditemukan untuk jenis={jenis}, tipe={tipe}. "
            f"Diharapkan di: {template_path}"
        )

    tpl = DocxTemplate(template_path)

    # ── Log semua file yang diterima ──
    log.info("[render_doc] FILES diterima:")
    for k, v in files.items():
        if isinstance(v, list):
            log.info("  %-25s → LIST len=%d  items=%s",
                     k, len(v),
                     [getattr(f, 'filename', str(f)) for f in v])
        else:
            fname = getattr(v, 'filename', None) if v else None
            log.info("  %-25s → %s", k, fname or "None")

    # ── Foto Dokumentasi Terminating ──
    foto_ctx = {
        "foto_rack_pln_t":      await _process(files["foto_rack_pln_t"],      "rack_pln_t",      tmp_dir, "half", tpl),
        "foto_perangkat_pln_t": await _process(files["foto_perangkat_pln_t"], "perangkat_pln_t", tmp_dir, "half", tpl),
        "foto_label_pln_t":     await _process(files["foto_label_pln_t"],     "label_pln_t",     tmp_dir, "half", tpl),
        "foto_rack_icp_t":      await _process(files["foto_rack_icp_t"],      "rack_icp_t",      tmp_dir, "half", tpl),
        "foto_perangkat_icp_t": await _process(files["foto_perangkat_icp_t"], "perangkat_icp_t", tmp_dir, "half", tpl),
        "foto_label_icp_t":     await _process(files["foto_label_icp_t"],     "label_icp_t",     tmp_dir, "half", tpl),
    }

    # ── Foto Dokumentasi Originating (OT only) ──
    if tipe == "OT":
        foto_ctx.update({
            "foto_rack_pln_o":      await _process(files["foto_rack_pln_o"],      "rack_pln_o",      tmp_dir, "half", tpl),
            "foto_perangkat_pln_o": await _process(files["foto_perangkat_pln_o"], "perangkat_pln_o", tmp_dir, "half", tpl),
            "foto_label_pln_o":     await _process(files["foto_label_pln_o"],     "label_pln_o",     tmp_dir, "half", tpl),
            "foto_rack_icp_o":      await _process(files["foto_rack_icp_o"],      "rack_icp_o",      tmp_dir, "half", tpl),
            "foto_perangkat_icp_o": await _process(files["foto_perangkat_icp_o"], "perangkat_icp_o", tmp_dir, "half", tpl),
            "foto_label_icp_o":     await _process(files["foto_label_icp_o"],     "label_icp_o",     tmp_dir, "half", tpl),
        })

    # ── Foto As-Plan ──
    foto_asplan_list = files.get("foto_asplan", [])
    log.info("[render_doc] foto_asplan list len=%d", len(foto_asplan_list))
    processed_asplan = []
    for i, upload in enumerate(foto_asplan_list):
        log.debug("[render_doc] foto_asplan[%d] filename=%s", i, getattr(upload, 'filename', '?'))
        img = await _process(upload, f"asplan_{i}", tmp_dir, "asplan", tpl)
        processed_asplan.append(img)
    foto_ctx["foto_asplan"] = processed_asplan
    log.info("[render_doc] foto_asplan processed: %d items → context list len=%d",
             len(foto_asplan_list), len(foto_ctx["foto_asplan"]))

    # ── Hasil Test ──
    if jenis == "CC_TDM":
        foto_bert_list = files.get("foto_bert", [])
        log.info("[render_doc] foto_bert list len=%d", len(foto_bert_list))
        processed_bert = []
        for i, upload in enumerate(foto_bert_list):
            log.debug("[render_doc] foto_bert[%d] filename=%s", i, getattr(upload, 'filename', '?'))
            img = await _process(upload, f"bert_{i}", tmp_dir, "bert", tpl)
            processed_bert.append(img)
        foto_ctx["foto_bert"] = processed_bert
        log.info("[render_doc] foto_bert processed: %d items", len(processed_bert))

    elif jenis == "CC_IP":
        foto_ctx["foto_ping"]      = await _process(files["foto_ping"],      "ping",      tmp_dir, "full", tpl)
        foto_ctx["foto_speedtest"] = await _process(files["foto_speedtest"], "speedtest", tmp_dir, "full", tpl)

    elif jenis == "DARK_FIBER":
        foto_otdr_list = files.get("foto_otdr", [])
        log.info("[render_doc] foto_otdr list len=%d", len(foto_otdr_list))
        processed_otdr = []
        for i, upload in enumerate(foto_otdr_list):
            log.debug("[render_doc] foto_otdr[%d] filename=%s", i, getattr(upload, 'filename', '?'))
            img = await _process(upload, f"otdr_{i}", tmp_dir, "otdr", tpl)
            processed_otdr.append(img)
        foto_ctx["foto_otdr"] = processed_otdr
        log.info("[render_doc] foto_otdr processed: %d items", len(processed_otdr))

    # ── Log context keys ──
    log.info("[render_doc] CONTEXT KEYS: %s", list(foto_ctx.keys()))
    for k, v in foto_ctx.items():
        if isinstance(v, list):
            log.info("  ctx[%s] = list len=%d", k, len(v))

    context = {**data, **foto_ctx}

    log.info("[render_doc] Rendering template...")
    tpl.render(context)
    out = get_output_path(tmp_dir, data.get("no_pa", "dokumen"))
    tpl.save(out)
    log.info("[render_doc] Saved → %s", out)
    return out