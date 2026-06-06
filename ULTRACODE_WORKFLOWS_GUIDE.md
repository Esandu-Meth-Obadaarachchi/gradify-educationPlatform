# Gradify — Claude Code: Ultracode + Workflows Usage Guide

This file tells you exactly how to use Claude Code's Ultracode and Workflows modes to build Gradify phase by phase. Read this before you start each phase.

---

## What is Ultracode Mode

Ultracode is a Claude Code mode that spins up multiple sub-agents working in parallel. Instead of Claude writing one file at a time sequentially, it breaks the task into chunks and works on several things at once.

When to use it: large scaffolding tasks, building a full phase in one go, anything where you have 5+ files to create that do not depend on each other.

When NOT to use it: debugging a specific bug, making a small change to one file, anything that requires careful step-by-step reasoning.

How to activate: type /ultracode before your prompt in Claude Code.

---

## What is Workflows Mode

Workflows is a Claude Code feature where you define a sequence of steps and Claude executes them one by one, confirming or pausing at checkpoints you define.

When to use it: multi-step processes with a clear order (e.g. run migration, then test endpoint, then build frontend), anything where order matters and you want visibility at each step.

How to activate: type /workflow before your prompt, or describe the steps explicitly and tell Claude to treat them as a workflow.

---

## How to Use Both for Gradify

The pattern is:

- Use Ultracode to BUILD (scaffold files, write models, write components)
- Use Workflows to VERIFY (run migrations, test endpoints, confirm things work before moving on)

Never use Ultracode to debug. Switch to normal mode for that.

---

## Phase 1 — Foundation

### Step 1: Scaffold backend with Ultracode

Open Claude Code. Run:

```
/ultracode

Read CLAUDE.md. Build Phase 1 backend in parallel:

Agent 1: Create the full folder structure for gradify/backend/ as defined in CLAUDE.md. Create app/main.py with FastAPI app setup, CORS config, and router includes (empty routers for now). Create app/database.py with SQLAlchemy async engine setup and get_db dependency.

Agent 2: Write all SQLAlchemy models in app/models/ — subject.py, topic.py, question.py, paper.py, session.py — exactly matching the schema in CLAUDE.md. Use proper foreign keys and relationships.

Agent 3: Write all Pydantic v2 schemas in app/schemas/ — one file per domain. Include Create, Update and Response variants for each.

Agent 4: Write app/core/config.py using pydantic-settings to load all env vars from .env. Write app/core/security.py with JWT encode/decode functions.

After all agents complete, wire everything together in main.py.
```

### Step 2: Run migrations with Workflow

```
/workflow

Steps:
1. Create the Alembic folder and alembic.ini. Configure env.py to use the DATABASE_URL from config and import all models.
2. Run: alembic revision --autogenerate -m "initial_schema"
3. Run: alembic upgrade head
4. Confirm all tables exist by connecting to PostgreSQL and listing tables.
5. If any table is missing, fix the model and re-run step 2 and 3.

Do not proceed past step 4 until all tables are confirmed.
```

### Step 3: Auth + Subject/Topic routes

```
/ultracode

Build Phase 1 API routes in parallel:

Agent 1: Write app/routers/auth.py — POST /auth/login endpoint, returns JWT token. Write the JWT middleware/dependency for protected routes.

Agent 2: Write app/routers/subjects.py and app/routers/topics.py — full CRUD for both. All routes JWT-protected except GET.

Agent 3: Write app/services/cloudinary_service.py — upload_image function that takes a file and returns the Cloudinary URL. Write app/routers/questions.py — POST to upload a question image, GET to list/filter questions by subject/topic/difficulty.

After agents complete, add all routers to main.py includes.
```

### Step 4: Frontend scaffold with Ultracode

```
/ultracode

Scaffold the Gradify React frontend in parallel:

Agent 1: Initialise Vite + React + TypeScript in gradify/frontend/. Install and configure Tailwind CSS. Set up tailwind.config.ts with the Gradify colour palette: slate-900 background, slate-700 cards, indigo-500 accent. Create base layout with sidebar.

Agent 2: Create src/services/api.ts — Axios instance with base URL from VITE_API_URL, JWT interceptor that attaches token from Zustand store to every request. Create src/store/authStore.ts with Zustand — stores token and admin user state.

Agent 3: Create src/pages/admin/Login.tsx — login form, calls POST /auth/login, stores token in Zustand. Create src/hooks/useAuth.ts — returns current user and logout function. Create protected route wrapper component.

Agent 4: Create src/pages/admin/Subjects.tsx and Topics.tsx — list, create, edit, delete. Use TanStack Query for all API calls. Modal dialogs for forms.

After agents complete, wire up React Router in main.tsx with protected routes.
```

### Step 5: Confirm Phase 1 is done

Normal mode, not Ultracode:

```
Phase 1 verification. Do the following one at a time and confirm each:

1. Start the FastAPI backend locally. Hit GET /docs and confirm Swagger loads with all routes.
2. Test POST /auth/login with admin credentials. Confirm JWT is returned.
3. Test POST /subjects and GET /subjects. Confirm data persists in PostgreSQL.
4. Test question image upload. Confirm image URL is saved to DB and image is accessible on Cloudinary.
5. Start the React frontend. Confirm login page renders, login works, and subjects/topics pages load data.

Stop and flag any failures before proceeding to Phase 2.
```

---

## Phase 2 — Paper Builder

### Step 1: Build paper builder backend

```
/ultracode

Build Phase 2 backend in parallel:

Agent 1: Write app/routers/papers.py — POST to create a paper, GET to list papers, GET /:id to fetch one paper with all its questions. PATCH to update status (draft/published). All JWT-protected.

Agent 2: Write the paper_questions logic — endpoints to add a question to a paper, reorder questions, update question_number and marks per question, remove a question from a paper.

Agent 3: Write app/services/pdf_service.py — takes a paper ID, fetches all paper_questions with images, builds an HTML string with cover page + question pages, runs WeasyPrint to convert to PDF bytes, returns the PDF.

After agents complete, add PDF export as GET /papers/:id/export endpoint that returns a PDF file response.
```

### Step 2: Build paper builder frontend

```
/ultracode

Build Phase 2 frontend in parallel:

Agent 1: Create src/pages/admin/PaperBuilder.tsx — paper creation form (title, subject, duration, total marks, cover page fields). Uses TanStack Query mutations to POST to /papers.

Agent 2: Create src/components/admin/QuestionCard.tsx — displays question image thumbnail, topic badge, editable marks field, drag handle. Create the question selector panel inside PaperBuilder that filters by subject/topic and lists available questions to add.

Agent 3: Create src/components/admin/PaperPreview.tsx — live preview panel showing how the paper will look. Updates as questions are added/reordered. Shows cover page, question list with numbers and marks.

Wire all three together in PaperBuilder.tsx. Add export PDF button that calls GET /papers/:id/export and triggers browser download.
```

### Step 3: Confirm Phase 2

Normal mode:

```
Phase 2 verification:

1. Create a test paper via the UI. Add 3 questions from different topics.
2. Reorder the questions. Confirm order persists on page reload.
3. Edit question number and marks for each question. Confirm changes save.
4. Export the paper as PDF. Open it. Confirm cover page is correct, all 3 questions appear with correct numbers and marks, images are visible.
5. Confirm draft vs published status toggle works.

Do not proceed to Phase 3 until PDF export is confirmed working end to end.
```

---

## Phase 3 — Exam Delivery

### Step 1: Build exam session backend

```
/ultracode

Build Phase 3 backend in parallel:

Agent 1: Write app/routers/sessions.py — POST to create an exam session (takes paper_id, student_name, student_email, generates UUID access_token, sets status to pending). GET /:token for the student-facing route — returns paper data if token is valid, respects status (locks content if submitted/grace_period/submitted). PATCH /:token/start — sets started_at and status to in_progress. PATCH /:token/grace — sets status to grace_period when timer hits zero.

Agent 2: Write the submission endpoint — POST /:token/submit — accepts multifile upload (images or PDF), uploads to Cloudinary, saves submission_url to session, sets status to submitted.

Agent 3: Write the admin sessions list endpoint — GET /sessions — returns all sessions with status, student info, paper title, timestamps, submission URL. JWT-protected.
```

### Step 2: Build student exam page

```
/ultracode

Build Phase 3 student-facing frontend in parallel:

Agent 1: Create src/pages/student/ExamPage.tsx — fetches session data via GET /exam/:token. Shows cover page with Start button if status is pending. Shows paper questions after start. Calls PATCH /:token/start on button click.

Agent 2: Create src/hooks/useExamTimer.ts — takes duration in minutes, tracks elapsed time in state, fires a callback at T-0. Persists timer state to localStorage keyed by token so page reload does not reset it. Create src/components/student/TimerDisplay.tsx — shows MM:SS, turns red in last 5 minutes.

Agent 3: Create src/components/student/GracePeriodOverlay.tsx — full screen dim overlay with upload prompt. Appears when timer hits zero. Contains the FileUploader component for answer script upload (multi-file, accepts images and PDF). Has a Submit button that calls POST /:token/submit.

Wire all three together. After submit, redirect to src/pages/student/SubmittedPage.tsx showing confirmation and telling student they will receive their marked paper soon.
```

### Step 3: Build admin sessions dashboard

Normal mode (this is simpler, no need for Ultracode):

```
Build src/pages/admin/Sessions.tsx — table of all exam sessions fetched from GET /sessions. Columns: student name, student email, paper title, status badge, created date, started time, submitted time, actions. Actions: copy exam link, view submission (opens Cloudinary URL), delete session. Status badges colour-coded: pending=grey, in_progress=blue, submitted=yellow, marked=green.
```

### Step 4: Confirm Phase 3

Normal mode:

```
Phase 3 end-to-end verification:

1. Create an exam session for a test paper. Copy the generated link.
2. Open the link in a private/incognito window as a student.
3. Confirm cover page shows. Press Start. Confirm timer begins.
4. Close and reopen the tab. Confirm timer continues from where it left off (localStorage persistence).
5. Wait for timer to end OR manually trigger grace period via the API.
6. Confirm grace period overlay appears. Upload a test PDF as the answer script.
7. Press Submit. Confirm redirect to SubmittedPage.
8. In the admin panel, go to Sessions. Confirm the session shows status = submitted and the submission file is accessible.
9. Confirm that opening the exam link again after submission shows a locked state, not the paper.

All 9 checks must pass before Phase 3 is complete.
```

---

## Phase 4 onwards (Hosting, Marking, Payments)

Come back to this guide when Phase 3 is confirmed working. A new section will be added for each phase at that point.

---

## General Rules for Ultracode

- Always give each agent a clear, contained task. If agents share a file, they will conflict.
- After Ultracode finishes, always do a manual review pass in normal mode. Ultracode is fast but can miss wiring things together.
- If Ultracode produces an error mid-run, switch to normal mode to fix it, then re-run Ultracode for the remaining work.
- Never run Ultracode on a file that already exists with real logic in it unless you explicitly tell it to rewrite.

---

## General Rules for Workflows

- Use numbered steps. Claude follows them in order.
- Add "Do not proceed until X is confirmed" to any step that is a hard gate.
- Workflows are best for: migrations, test runs, deployment steps, verification checklists.
- You can pause a workflow at any step by saying "stop here and wait for my confirmation".

---

## Quick Reference — Which Mode for What

| Task | Mode |
|---|---|
| Scaffold a full phase | /ultracode |
| Write multiple independent files | /ultracode |
| Run migrations | /workflow |
| Test and verify endpoints | /workflow |
| Fix a specific bug | Normal mode |
| Small change to one file | Normal mode |
| Deploy to Railway | /workflow |
| Debug Alembic migration error | Normal mode |
| Build a complex single component | Normal mode |
| Write all models at once | /ultracode |
