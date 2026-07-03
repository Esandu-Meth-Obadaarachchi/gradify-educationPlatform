"""Render an exam paper to PDF with WeasyPrint.

Question images live on public GCS URLs. Rather than rely on WeasyPrint's
network fetcher (this Python build ships no CA bundle), we fetch each image
with ``requests`` (which bundles certifi) and embed it as a base64 data URI,
so the render is fully self-contained.

WeasyPrint needs the Homebrew native libs at import time — run the server with
``DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib`` (see backend/run.sh).
"""

import base64
import io
import os
import sys
from html import escape

import requests

# macOS: WeasyPrint loads Pango/cairo via dlopen, which reads
# DYLD_FALLBACK_LIBRARY_PATH at call time. The hardened-runtime Python strips
# DYLD_* at launch (and uvicorn --reload re-execs), so set it in-process here,
# before importing weasyprint, pointing at the Homebrew libs.
if sys.platform == "darwin" and os.path.isdir("/opt/homebrew/lib"):
    _existing = os.environ.get("DYLD_FALLBACK_LIBRARY_PATH", "")
    if "/opt/homebrew/lib" not in _existing.split(":"):
        os.environ["DYLD_FALLBACK_LIBRARY_PATH"] = (
            f"{_existing}:/opt/homebrew/lib" if _existing else "/opt/homebrew/lib"
        )

import weasyprint  # noqa: E402  (must follow the DYLD setup above)
from PIL import Image  # noqa: E402

from app.schemas.paper import PaperDetailResponse  # noqa: E402


def _data_uri(image_url: str) -> str | None:
    """Fetch an image and return a normalized PNG data URI.

    Re-encoding through Pillow (flattening any alpha onto white) guarantees
    WeasyPrint can render it; a bad/unreadable image degrades to a placeholder
    rather than failing the whole export.
    """
    try:
        resp = requests.get(image_url, timeout=15)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content))
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            img = img.convert("RGBA")
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1])
            img = background
        else:
            img = img.convert("RGB")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
        return f"data:image/png;base64,{encoded}"
    except Exception:
        return None


def _cover_html(paper: PaperDetailResponse) -> str:
    cover = paper.cover_page_data or {}
    institution = escape(str(cover.get("institution") or ""))
    exam_date = escape(str(cover.get("exam_date") or ""))
    instructions = escape(str(cover.get("instructions") or "")).replace("\n", "<br/>")
    subject = escape(paper.subject_name or "")
    title = escape(paper.title)

    date_row = (
        f"<div><span>Date</span><strong>{exam_date}</strong></div>" if exam_date else ""
    )
    institution_row = (
        f'<div class="institution">{institution}</div>' if institution else ""
    )
    instructions_block = (
        f'<div class="instructions"><h3>Instructions</h3><p>{instructions}</p></div>'
        if instructions
        else ""
    )
    return f"""
    <section class="cover">
      {institution_row}
      <h1 class="paper-title">{title}</h1>
      <div class="meta">
        <div><span>Subject</span><strong>{subject}</strong></div>
        <div><span>Duration</span><strong>{paper.duration_minutes} minutes</strong></div>
        <div><span>Total marks</span><strong>{paper.total_marks}</strong></div>
        {date_row}
      </div>
      <div class="candidate">
        <div class="field"><span>Candidate name</span><div class="line"></div></div>
        <div class="field"><span>Index / ID number</span><div class="line"></div></div>
      </div>
      {instructions_block}
    </section>
    """


def _questions_html(paper: PaperDetailResponse) -> str:
    blocks = []
    for pq in paper.questions:
        uri = _data_uri(pq.image_url) if pq.image_url else None
        body = (
            f'<img src="{uri}"/>'
            if uri
            else '<div class="missing">[question image unavailable]</div>'
        )
        if pq.part_marks:
            breakdown = ", ".join(
                f"({p.label}) {p.marks}" for p in pq.part_marks
            )
            marks_label = f"[{pq.marks} marks — {breakdown}]"
        else:
            marks_label = f"[{pq.marks} marks]"
        blocks.append(
            f"""
        <section class="question">
          <div class="qhead">
            <span class="qnum">Question {pq.question_number}</span>
            <span class="qmarks">{marks_label}</span>
          </div>
          {body}
        </section>
        """
        )
    if not blocks:
        return '<p style="color:#888">This paper has no questions yet.</p>'
    return "\n".join(blocks)


def render_paper_pdf(paper: PaperDetailResponse) -> bytes:
    title = escape(paper.title)
    html = f"""<!doctype html>
<html><head><meta charset="utf-8"/>
<style>
  @page {{
    size: A4;
    margin: 2.5cm;
    @bottom-left {{ content: "{title}"; font-size: 8px; color: #b0b0b0; }}
    @bottom-center {{ content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #888; }}
    @bottom-right {{ content: "Gradify"; font-size: 8px; color: #c8c8c8; }}
  }}
  * {{ box-sizing: border-box; }}
  body {{ font-family: Helvetica, Arial, sans-serif; color: #111; margin: 0; }}
  .cover {{ page-break-after: always; padding-top: 2cm; text-align: center; }}
  .cover .institution {{ font-size: 14px; letter-spacing: 2px; text-transform: uppercase; color: #555; margin-bottom: 1cm; }}
  .cover .paper-title {{ font-size: 30px; margin: 0 0 1.2cm; }}
  .cover .meta {{ display: flex; flex-direction: column; gap: 4px; max-width: 12cm; margin: 0 auto 1.4cm; }}
  .cover .meta > div {{ display: flex; justify-content: space-between; border-bottom: 1px solid #e3e3e3; padding: 6px 2px; }}
  .cover .meta span {{ color: #666; }}
  .candidate {{ max-width: 12cm; margin: 0 auto 1.4cm; text-align: left; }}
  .candidate .field {{ margin-bottom: 14px; }}
  .candidate .field span {{ font-size: 12px; color: #666; }}
  .candidate .line {{ border-bottom: 1px solid #999; height: 22px; }}
  .instructions {{ max-width: 13cm; margin: 0 auto; text-align: left; border: 1px solid #e3e3e3; border-radius: 6px; padding: 12px 16px; }}
  .instructions h3 {{ margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #444; }}
  .instructions p {{ margin: 0; font-size: 13px; line-height: 1.5; }}
  .question {{ break-inside: avoid; margin-bottom: 26px; }}
  .qhead {{ display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }}
  .qnum {{ font-size: 15px; font-weight: bold; }}
  .qmarks {{ font-size: 13px; color: #444; }}
  .question img {{ display: block; max-width: 100%; }}
  .missing {{ color: #b91c1c; font-style: italic; }}
</style></head>
<body>
  {_cover_html(paper)}
  {_questions_html(paper)}
</body></html>"""
    return weasyprint.HTML(string=html).write_pdf()
