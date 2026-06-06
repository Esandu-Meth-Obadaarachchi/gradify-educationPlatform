# Gradify

End-to-end platform for creating, delivering, and marking mock exam papers.

- **Backend:** FastAPI + async SQLAlchemy + Alembic + PostgreSQL (`backend/`)
- **Frontend:** React 19 + Vite + TypeScript + Tailwind v4 + TanStack Query + Zustand (`frontend/`)
- **File storage:** Google Cloud Storage · **PDF:** WeasyPrint (Phase 2) · **AI marking:** Gemini (Phase 5)

See [CLAUDE (2).md](CLAUDE%20(2).md) for the full spec and phase plan.

## Status

- **Phase 1 — Foundation: ✅ complete.** Admin JWT auth, Subjects/Topics CRUD, Question
  upload + browser (Google Cloud Storage), full DB schema migrated.
- **Phase 2 — Paper Builder: ✅ complete.** Paper CRUD, add/drag-reorder/edit questions
  (per-question number + marks), cover-page editor, live preview, draft/publish, and
  server-side **PDF export via WeasyPrint** (A4, cover page + question pages).
- Phase 3 (Exam Delivery) onward: not started.

## Prerequisites

- Python 3.12+ (tested on 3.14), Node 20+ (tested on 24), PostgreSQL 16 running locally.
- **WeasyPrint (PDF export) needs Pango.** macOS: `brew install pango`.

## Backend — run

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# One-time DB setup (Postgres must be running)
createdb gradify
.venv/bin/alembic upgrade head

# Start the API (run.sh handles WeasyPrint's native-lib path on macOS)
./run.sh
```

API docs: http://localhost:8000/docs · Health: http://localhost:8000/health

Config lives in `backend/.env` (copy from `.env.example`). Default admin login is
`admin` / `admin123`. File storage uses **Google Cloud Storage**: set `GCS_BUCKET`
and put the service-account JSON at `backend/gcs-key.json` (gitignored). Already
provisioned — project `gradify-32225c`, bucket `gradify-32225c-uploads` (public-read,
asia-south1). If `GCS_*` is unset, question **upload** returns 503; everything else
works regardless.

## Frontend — run

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173 — `VITE_API_URL` (in `frontend/.env`) points at the backend.

## Migrations

```bash
cd backend
.venv/bin/alembic revision --autogenerate -m "describe change"   # create
.venv/bin/alembic upgrade head                                   # apply
```
