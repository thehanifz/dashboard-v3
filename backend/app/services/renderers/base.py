# backend/app/services/renderers/base.py  ✏️ MODIFIED
import os, io, uuid, logging
from docxtpl import InlineImage
from docx.shared import Mm
from PIL import Image
from app.core.config import IMG_QUALITY

log = logging.getLogger("renderer.base")

SLOT_MM = {
    "half":      80,   # ← was 70
    "full":      80,   # ← was 140
    "bert":      80,   # ← was 160
    "bert_half": 80,   # unchanged
    "asplan":   150,   # ← was 130
    "otdr":      80,   # ← was 140
}
MAX_PX = {
    "half":      1200,
    "full":      1200, # ← was 2000
    "bert":      1200, # ← was 2200
    "bert_half": 1200,
    "asplan":    2000, # ← was 1800
    "otdr":      1200, # ← was 2000
}

def blank_image(tpl, tmp_dir: str, width_mm: int) -> InlineImage:
    buf = io.BytesIO()
    Image.new("RGB", (10, 10), (255, 255, 255)).save(buf, "JPEG")
    buf.seek(0)
    path = os.path.join(tmp_dir, f"blank_{uuid.uuid4()}.jpg")
    with open(path, "wb") as f:
        f.write(buf.read())
    return InlineImage(tpl, path, width=Mm(width_mm))

async def process_image(upload, name: str, tmp_dir: str, slot: str, tpl) -> InlineImage:
    width_mm = SLOT_MM.get(slot, 80)
    max_px   = MAX_PX.get(slot, 1200)

    if not upload or not upload.filename:
        log.debug("[process] %s → blank", name)
        return blank_image(tpl, tmp_dir, width_mm)

    raw  = os.path.join(tmp_dir, f"raw_{name}")
    data = await upload.read()
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
        elif img.mode != "RGB":
            img = img.convert("RGB")
        w, h = img.size
        if w > max_px:
            img = img.resize((max_px, int(h * max_px / w)), Image.LANCZOS)
        img.save(proc, "JPEG", quality=IMG_QUALITY, optimize=True)

    os.remove(raw)
    return InlineImage(tpl, proc, width=Mm(width_mm))

async def process_foto_dokumentasi(tipe: str, files: dict, tmp_dir: str, tpl) -> dict:
    ctx = {
        "foto_rack_pln_t":      await process_image(files["foto_rack_pln_t"],      "rack_pln_t",      tmp_dir, "half", tpl),
        "foto_perangkat_pln_t": await process_image(files["foto_perangkat_pln_t"], "perangkat_pln_t", tmp_dir, "half", tpl),
        "foto_label_pln_t":     await process_image(files["foto_label_pln_t"],     "label_pln_t",     tmp_dir, "half", tpl),
        "foto_rack_icp_t":      await process_image(files["foto_rack_icp_t"],      "rack_icp_t",      tmp_dir, "half", tpl),
        "foto_perangkat_icp_t": await process_image(files["foto_perangkat_icp_t"], "perangkat_icp_t", tmp_dir, "half", tpl),
        "foto_label_icp_t":     await process_image(files["foto_label_icp_t"],     "label_icp_t",     tmp_dir, "half", tpl),
    }
    if tipe == "OT":
        ctx.update({
            "foto_rack_pln_o":      await process_image(files["foto_rack_pln_o"],      "rack_pln_o",      tmp_dir, "half", tpl),
            "foto_perangkat_pln_o": await process_image(files["foto_perangkat_pln_o"], "perangkat_pln_o", tmp_dir, "half", tpl),
            "foto_label_pln_o":     await process_image(files["foto_label_pln_o"],     "label_pln_o",     tmp_dir, "half", tpl),
            "foto_rack_icp_o":      await process_image(files["foto_rack_icp_o"],      "rack_icp_o",      tmp_dir, "half", tpl),
            "foto_perangkat_icp_o": await process_image(files["foto_perangkat_icp_o"], "perangkat_icp_o", tmp_dir, "half", tpl),
            "foto_label_icp_o":     await process_image(files["foto_label_icp_o"],     "label_icp_o",     tmp_dir, "half", tpl),
        })

    processed_asplan = []
    for i, upload in enumerate(files.get("foto_asplan", [])):
        processed_asplan.append(await process_image(upload, f"asplan_{i}", tmp_dir, "asplan", tpl))
    ctx["foto_asplan"] = processed_asplan

    return ctx