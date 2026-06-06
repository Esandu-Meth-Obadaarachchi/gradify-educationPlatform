#!/usr/bin/env bash
# Start the Gradify API.
#
# WeasyPrint's native-lib path (Homebrew Pango/cairo) is set in-process by
# app/services/pdf_service.py before it imports weasyprint, so no special
# environment is needed here and --reload is safe.
set -euo pipefail
cd "$(dirname "$0")"
exec .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
