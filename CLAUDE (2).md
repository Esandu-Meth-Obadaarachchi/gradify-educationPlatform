# CLAUDE.md — LEI (London Educational Institute)

## Project Overview

LEI (London Educational Institute) is an end-to-end educational platform for creating, delivering, and marking mock exam papers.

> Naming note: the product is **London Educational Institute**, **LEI** for short. Some infrastructure identifiers keep the original `gradify` name to avoid breaking existing data — the Postgres database (`gradify`), the GCS bucket (`gradify-32225c-uploads`) and upload folder, and the browser auth storage key (`gradify-auth`).

Two user sides:
- Admin (you): manage question bank, build papers, send to students, mark submissions
- Student: access assigned papers, take the exam with a timer, upload answer script

Stack: React (Vite) + Tailwind CSS (frontend) | FastAPI (backend) | PostgreSQL (database) | Google Cloud Storage (image/file storage)

Hosting, Docker and CI/CD are deferred to after Phase 3 is complete and working locally.

---

## Tech Stack — Locked

| Layer | Technology | Reason |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind CSS | Primary stack, fast, familiar |
| Backend | FastAPI + Python | Primary backend, well known |
| Database | PostgreSQL | Relational data fits perfectly (subjects, topics, questions, papers, students) |
| ORM | SQLAlchemy + Alembic | Clean migrations, standard with FastAPI |
| File Storage | Google Cloud Storage | Public-read bucket via a service account; stays in the GCP ecosystem alongside Gemini |
| Auth | JWT tokens (admin) + UUID-based paper links (student, no login needed) |
| PDF Export | WeasyPrint (Python, server-side) | Renders HTML/CSS to PDF reliably |
| AI Marking | Gemini 2.5 Flash API (via google-genai SDK) | Vision capable, free tier, already used in other projects |
| State Management | TanStack Query (API state) + Zustand (auth state only) | Clean separation |
| Deployment | Railway (2 services: frontend static + backend API) | Deferred to Phase 4 |
| CI/CD | GitHub Actions | Deferred to Phase 4 |
| Containerisation | Docker (backend) | Deferred to Phase 4 |

---

## Key Architectural Decisions

### Question Image Handling
Upload screenshots WITHOUT question numbers and marks on them. Store those as separate editable fields in the database (question_number, marks). This lets you reuse the same question image across different papers with different numbering. The PDF builder assembles: question number + image + marks dynamically at export time.

### Student Paper Access
No student account or login. Each assigned paper gets a UUID-based link (e.g. /exam/abc123-def456). The link is the auth. Share it directly with the student via WhatsApp or email. The exam_session record tracks: student name, student email, paper ID, status (pending / in_progress / grace_period / submitted / marking / marked), timestamps, and file URLs.

### AI Marking Flow
Two parallel paths:
1. AI auto-mark: Send answer image(s) to Gemini Vision with the question and mark scheme context, get back marks per question + feedback as JSON
2. Manual mark: Admin downloads the submitted answer PDF/images, marks it, re-uploads the annotated version

Both paths write a marked_script_url to the exam_session record. Student sees the result on their exam page.

---

## Database Schema (High Level)

```
subjects        (id, name, created_at)
topics          (id, subject_id, name, created_at)
questions       (id, topic_id, image_url, difficulty, created_at)
papers          (id, title, subject_id, total_marks, duration_minutes, status, cover_page_data JSON, created_at)
paper_questions (id, paper_id, question_id, question_number, marks, order_index)
exam_sessions   (id, paper_id, student_name, student_email, access_token UUID, status,
                 started_at, ended_at, submission_url, marked_url, marks_awarded,
                 feedback JSON, created_at)
```

---

## Build Phases

### Phase 1 — Foundation (current priority)
- FastAPI project setup with PostgreSQL + SQLAlchemy + Alembic
- React + Vite + Tailwind setup
- JWT admin auth (login page, protected routes)
- Subject + Topic CRUD (admin panel)
- Question upload (image to Google Cloud Storage, save metadata to DB)
- Question browser (filter by subject, topic, difficulty)
- Run and confirm all DB migrations locally

### Phase 2 — Paper Builder
- Paper creation form (title, subject, duration, total marks)
- Question selector (filter by topic, add to paper)
- Per-question: editable question number + marks field
- Paper preview (renders as it will look in the PDF)
- Cover page editor (exam title, date, instructions, total marks, duration)
- Export to PDF via WeasyPrint (server-side render, A4, 2.5cm margins)
- Save draft vs publish paper status

### Phase 3 — Exam Delivery
- Create exam session (select paper, enter student name + email, generate UUID link)
- Student exam page (/exam/:token):
  - Shows cover page info first
  - Start button triggers timer
  - Timer counts down, always visible top-right
  - At T-0: paper locks, 2-minute grace period overlay appears
  - Grace period prompt: student uploads answer script (images or PDF, multi-file accepted)
  - Submit confirms and locks the session (status -> submitted)
  - Server-side status lock: once submitted or grace_period, reloading does not restart timer
- Admin session dashboard (list all sessions, status badges, download submission, actions)

### Phase 4 — Hosting + CI/CD (after Phase 3 works locally)
- Docker setup for backend
- Railway deployment (2 services: frontend static + backend API)
- GitHub Actions CI/CD pipeline
- Environment variables configured in Railway dashboard
- Smoke test full flow on production URL

### Phase 5 — Marking (after hosting is stable)
- Admin can view and download submitted answer scripts from the session dashboard
- AI marking: send to Gemini Vision with question context + mark scheme, return marks + feedback per question as JSON
- Manual marking: download submission, re-upload annotated version
- Mark entry form (per question marks + overall feedback)
- Marked script visible to student on their exam page once status = marked
- Status flow: submitted -> marking -> marked
- Optional: email notification via Resend when marked

### Phase 6 — Payments (last)
- Stripe integration (or PayHere for LKR)
- Admin sets price when creating exam session
- Student pays before exam link activates
- Receipt and confirmation email

---

## Folder Structure

```
lei/
  backend/
    app/
      main.py
      database.py
      models/
        subject.py
        topic.py
        question.py
        paper.py
        session.py
      routers/
        auth.py
        subjects.py
        topics.py
        questions.py
        papers.py
        sessions.py
        marking.py
      services/
        gcs_service.py
        pdf_service.py
        ai_marking_service.py
        email_service.py
      schemas/
        subject.py
        topic.py
        question.py
        paper.py
        session.py
      core/
        config.py
        security.py
    Dockerfile
    requirements.txt
    alembic/
      env.py
      versions/
  frontend/
    src/
      pages/
        admin/
          Login.tsx
          Dashboard.tsx
          Subjects.tsx
          Topics.tsx
          Questions.tsx
          PaperBuilder.tsx
          Sessions.tsx
          MarkingDesk.tsx
        student/
          ExamPage.tsx
          SubmittedPage.tsx
      components/
        admin/
          QuestionCard.tsx
          PaperPreview.tsx
          SessionRow.tsx
        student/
          TimerDisplay.tsx
          GracePeriodOverlay.tsx
        shared/
          Navbar.tsx
          LoadingSpinner.tsx
          FileUploader.tsx
      services/
        api.ts
      hooks/
        useExamTimer.ts
        useAuth.ts
      store/
        authStore.ts
    package.json
    vite.config.ts
    tailwind.config.ts
  .github/
    workflows/
      backend.yml
      frontend.yml
  README.md
  CLAUDE.md
```

---

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql+asyncpg://localhost:5432/gradify
SECRET_KEY=your_jwt_secret_here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=480
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_me
GCS_BUCKET=
GCS_KEY_PATH=./gcs-key.json
GEMINI_API_KEY=
RESEND_API_KEY=
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
```

---

## GitHub Actions CI/CD (Phase 4)

### Backend workflow (backend.yml)
Trigger: push to main, changes in /backend/**
Steps: checkout -> set up Python -> install deps -> run tests (pytest) -> build Docker image -> push to Docker Hub -> deploy to Railway via webhook

### Frontend workflow (frontend.yml)
Trigger: push to main, changes in /frontend/**
Steps: checkout -> npm install -> npm run build -> deploy to Railway static service

---

## Railway Deployment (Phase 4)

Two services in one Railway project:
1. Backend: Docker-based Python service, expose port 8000, set all env vars in Railway dashboard
2. Frontend: Static site service, build command: npm run build, publish dir: dist

Both get auto-assigned Railway domains. Frontend calls the backend domain via VITE_API_URL.

---

## AI Marking — Gemini Vision Prompt Template

```
You are an experienced [subject] examiner. You are marking a student's answer.

QUESTION [question_number]: [marks] marks available.
[Attach question image]

MARK SCHEME: [mark_scheme_text or mark_scheme_image if available]

STUDENT ANSWER:
[Attach student answer image(s)]

Return ONLY a JSON object with no extra text:
{
  "marks_awarded": <number>,
  "max_marks": <number>,
  "feedback": "<specific feedback for this question>",
  "marking_notes": "<what the student got right and wrong>"
}

Be fair. Be specific. Do not award marks for incorrect working.
```

---

## PDF Export — WeasyPrint (Phase 2)

Server builds an HTML string from paper data, then converts to PDF via WeasyPrint.

Cover page: exam title, subject, duration, total marks, date, candidate name box, instructions block.
Question pages: question number (left-aligned), marks (right margin), question image (full width).
Footer: page numbers, paper title, London Educational Institute watermark (small).
Paper size: A4. Margins: 2.5cm all sides.

---

## UI Design Direction

Admin panel: clean, professional dark theme. Think teacher tool, not consumer app.
- slate-900 background, slate-700 cards, indigo-500 accent
- Sidebar navigation, content area, modal dialogs for CRUD

Student exam page: clean white, completely minimal, zero distractions.
- Timer always visible top-right, large and clear
- Question images full width, clean spacing
- Grace period overlay: full screen dim + upload prompt

---

## Rules for Claude Code

1. Build strictly phase by phase. Do not touch Phase 2 code until Phase 1 is confirmed working.
2. Always run Alembic migrations when adding new models. Never alter tables manually.
3. All file uploads go through the FastAPI backend to Google Cloud Storage. Never upload directly from the frontend.
4. Use Pydantic v2 schemas for all request/response models.
5. Use TanStack Query for all API state on the frontend.
6. Use Zustand for auth state only.
7. Every API route touching papers or sessions must validate JWT or UUID token before proceeding.
8. The student exam page (/exam/:token) is public but UUID-token-gated. No JWT needed.
9. When timer hits zero, update session status to grace_period server-side immediately. This prevents a student reloading to restart the timer.
10. Test PDF export end-to-end before marking Phase 2 complete.
11. Keep Dockerfile and GitHub Actions workflows in the repo from Phase 1, even though deployment is deferred. This avoids a big config dump later.

---

## Current Status

Phases 1 & 2 — COMPLETE (June 2026). File storage was swapped from Cloudinary to Google Cloud Storage during Phase 1.

Phase 1 (Foundation): admin JWT auth, Subjects/Topics CRUD, question image upload to GCS, question browser, full 6-table schema migrated.
Phase 2 (Paper Builder): paper CRUD, add/drag-reorder/edit paper questions (per-question number + marks), cover-page editor, live preview, draft/publish, PDF export via WeasyPrint (A4, cover + question pages).

Next action: Phase 3 — Exam Delivery (UUID exam links, student timer + grace period, answer-script upload to GCS, admin sessions dashboard).
