"""
svg_parser.py
Scan variabel {field_NAMA} di dalam file SVG template,
dan inject data ke dalam template SVG.
"""
import re
from pathlib import Path


def scan_variables(file_path: Path) -> list[str]:
    """
    Scan file SVG dan temukan semua placeholder {field_NAMA}.
    Return list nama field unik (tanpa prefix 'field_').
    """
    try:
        content  = file_path.read_text(encoding="utf-8")
        pattern  = re.compile(r"\{field_([a-zA-Z0-9_\- ]+)\}")
        matches  = pattern.findall(content)
        variables = list(dict.fromkeys(v.strip() for v in matches if v.strip()))
        return variables
    except Exception as e:
        print(f"[svg_parser] scan_variables error: {e}")
        return []


def inject_data(file_path: Path, data: dict) -> str | None:
    """
    Baca SVG template dan replace semua {field_NAMA} dengan nilai dari data dict.
    Return string SVG yang sudah diisi, atau None jika gagal.
    """
    try:
        content = file_path.read_text(encoding="utf-8")
        for key, value in data.items():
            pattern = re.compile(re.escape(f"{{field_{key}}}"))
            content = pattern.sub(str(value) if value else "-", content)
        return content
    except Exception as e:
        print(f"[svg_parser] inject_data error: {e}")
        return None
