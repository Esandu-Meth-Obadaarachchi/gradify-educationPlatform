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


# Brand mark — kept in sync with frontend/src/components/shared/GradifyLogo.tsx.
_LOGO_SVG = """
<svg width="46" height="46" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gmark" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
      <stop stop-color="#6366f1"/>
      <stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="48" height="48" rx="12" fill="url(#gmark)"/>
  <path d="M24 13 L40 20 L24 27 L8 20 Z" fill="#ffffff"/>
  <path d="M15 22.5 V29.5 C15 32.6 33 32.6 33 29.5 V22.5" stroke="#ffffff"
        stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M40 20 V30" stroke="#c7d2fe" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="40" cy="31.5" r="2" fill="#c7d2fe"/>
</svg>
"""


def _cover_html(paper: PaperDetailResponse) -> str:
    cover = paper.cover_page_data or {}
    institution = escape(str(cover.get("institution") or ""))
    exam_date = escape(str(cover.get("exam_date") or ""))
    instructions = escape(str(cover.get("instructions") or "")).replace("\n", "<br/>")
    subject = escape(paper.subject_name or "—")
    title = escape(paper.title)

    date_row = (
        f'<div class="date">Date <strong>{exam_date}</strong></div>' if exam_date else ""
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
      <div class="brand">
        {_LOGO_SVG}
        <span class="wordmark">Gradify<span class="dot">.</span></span>
      </div>
      {institution_row}
      <h1 class="paper-title">{title}</h1>
      <div class="accent"></div>
      <div class="meta">
        <div class="card"><span>Subject</span><strong>{subject}</strong></div>
        <div class="card"><span>Duration</span><strong>{paper.duration_minutes} min</strong></div>
        <div class="card"><span>Total marks</span><strong>{paper.total_marks}</strong></div>
      </div>
      {date_row}
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
        unit = "mark" if pq.marks == 1 else "marks"
        if pq.part_marks:
            breakdown = "  ".join(f"({p.label}) {p.marks}" for p in pq.part_marks)
            marks_label = f"{pq.marks} {unit} &nbsp;·&nbsp; {breakdown}"
        else:
            marks_label = f"{pq.marks} {unit}"
        blocks.append(
            f"""
        <section class="question">
          <div class="qhead">
            <span class="qnum">Q{pq.question_number}</span>
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
  body {{ font-family: Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; }}

  .cover {{ page-break-after: always; text-align: center; min-height: 23cm;
            display: flex; flex-direction: column; justify-content: center; align-items: center; }}
  .brand {{ display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 0.9cm; }}
  .brand .wordmark {{ font-size: 24px; font-weight: bold; letter-spacing: -0.5px; color: #0f172a; }}
  .brand .dot {{ color: #6366f1; }}
  .cover .institution {{ font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #64748b; margin-bottom: 10px; }}
  .cover .paper-title {{ font-size: 30px; margin: 0; color: #0f172a; letter-spacing: -0.5px; }}
  .cover .accent {{ width: 64px; height: 4px; border-radius: 4px; margin: 12px auto 1.2cm;
                    background: linear-gradient(90deg, #6366f1, #8b5cf6); }}

  .cover .meta {{ display: flex; justify-content: center; gap: 10px; width: 13cm; }}
  .cover .meta .card {{ flex: 1; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 8px;
                        padding: 10px 8px; }}
  .cover .meta .card span {{ display: block; font-size: 9px; font-weight: bold; letter-spacing: 0.5px;
                             text-transform: uppercase; color: #6366f1; }}
  .cover .meta .card strong {{ display: block; margin-top: 3px; font-size: 14px; color: #0f172a; }}
  .cover .date {{ margin-top: 12px; font-size: 12px; color: #64748b; }}
  .cover .date strong {{ color: #0f172a; }}

  .candidate {{ display: flex; gap: 24px; width: 13cm; margin-top: 1.3cm; text-align: left; }}
  .candidate .field {{ flex: 1; }}
  .candidate .field span {{ font-size: 11px; color: #64748b; }}
  .candidate .line {{ border-bottom: 1px solid #94a3b8; height: 24px; }}

  .instructions {{ width: 13cm; margin-top: 1.2cm; text-align: left; border: 1px solid #e0e7ff;
                   background: #eef2ff; border-radius: 8px; padding: 12px 16px; }}
  .instructions h3 {{ margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #4f46e5; }}
  .instructions p {{ margin: 0; font-size: 13px; line-height: 1.55; color: #334155; }}

  .question {{ break-inside: avoid; margin-bottom: 26px; }}
  .qhead {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }}
  .qnum {{ font-size: 13px; font-weight: bold; color: #fff; background: #6366f1;
           border-radius: 999px; padding: 4px 12px; }}
  .qmarks {{ font-size: 11px; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0;
             border-radius: 999px; padding: 4px 12px; }}
  .question img {{ display: block; max-width: 100%; }}
  .missing {{ color: #b91c1c; font-style: italic; }}
</style></head>
<body>
  {_cover_html(paper)}
  {_questions_html(paper)}
</body></html>"""
    return weasyprint.HTML(string=html).write_pdf()
