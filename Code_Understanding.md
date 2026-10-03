# Code Understanding

## Project Overview

Audio Notes Platform is a production-style MVP for uploading audio, processing it asynchronously, and presenting a transcript plus concise notes. It uses Next.js, FastAPI, PostgreSQL, S3-compatible storage, Redis/Celery, Gnani Prisma for transcription, and Gemini for optional language detection plus summaries.

The repository was empty on 2026-09-30. It now contains the complete MVP implementation. Dependencies, automated tests, the production frontend build, API startup, migration SQL, and the live Gnani/Gemini provider chain have been verified. A local human-testing profile uses SQLite, private filesystem storage, and an in-process background executor when infrastructure is unavailable. On 2026-10-03, a real FLAC recording completed through the localhost upload API with Auto detection (`en-IN`), a 104-character Gnani transcript, a Gemini summary, persisted history, and no processing error. The production-shaped container stack and public deployment remain unverified because Docker and deployment credentials are unavailable in this environment.

## Repository Structure

```text
frontend/app/             Next.js pages, including note detail and architecture
frontend/components/      Upload, library, progress, and result UI
frontend/lib/             Typed browser API client and response types
backend/app/api.py        HTTP routes and upload orchestration
backend/app/models.py     SQLAlchemy AudioNote model and status vocabulary
backend/app/services/     Object storage, Gnani, Gemini, and processing workflow
backend/app/worker.py     Celery task and bounded retry behavior
backend/migrations/       Alembic schema migration
backend/tests/            API validation and status tests
.github/workflows/ci.yml  Backend/frontend verification and Compose validation
docker-compose.yml        PostgreSQL, Redis, MinIO, API, worker, and UI
.env.example              Non-secret configuration template
README.md                 Setup, usage, testing, and deployment guide
Code_Understanding.md     This implementation handoff
Decisions.md              Architectural decision record
TASK_STATUS.md            Immediate status snapshot
```

`backend/app/config.py` is the backend configuration source. `frontend/lib/api.ts` is the browser transport boundary.

## Frontend Design System

The Next.js App Router, routes, browser API client, note state, polling behavior, and request/response contracts remain unchanged. The presentation layer is organized around reusable primitives:

- `components/app-providers.tsx` — global Radix tooltip context and Sonner toast viewport.
- `components/status-badge.tsx` — the single visual/wording map for every persisted note status.
- `components/icon-button.tsx` — accessible icon action with a visible Radix tooltip and `aria-label`.
- `components/dashboard.tsx` — responsive three-step upload workspace, skeleton library, upload feedback, and automatic transition to the live note page after HTTP 202.
- `components/note-detail.tsx` — progress timeline, explicit Summary and Original Transcript panels, copy feedback, failure recovery, and language correction.
- `app/globals.css` — design tokens, typography/spacing scale, surfaces, responsive grids, focus states, reduced-motion support, and micro-interactions.

Frontend libraries are deliberately narrow: Lucide supplies consistent SVG icons, Radix supplies accessible tooltip behavior, Motion handles entrance/state transitions with reduced-motion compatibility, and Sonner supplies non-blocking action feedback. Install them with:

```bash
cd frontend
pnpm add lucide-react sonner @radix-ui/react-tooltip motion
```

Frontend verification checklist:

- [x] Next.js remains the core framework; no route was renamed or removed.
- [x] `frontend/lib/api.ts` and `frontend/lib/types.ts` are unchanged from the committed MVP baseline.
- [x] Upload multipart fields, polling intervals, retry payloads, and response handling remain intact.
- [x] All persisted statuses still render, including `detecting_language` and terminal failures.
- [x] Icon-only actions have accessible names and Radix tooltips; keyboard focus is visible.
- [x] Loading skeletons, inline errors, progress feedback, and Sonner action feedback are present.
- [x] Responsive layouts cover desktop, tablet, and narrow screens; reduced-motion preferences are honored.
- [x] Frontend tests and the optimized production build pass with no missing imports or placeholders.

## Architecture

```text
Browser -> Next.js -> FastAPI -> PostgreSQL
                          |  -> S3-compatible object storage
                          `-> Redis queue -> Celery worker
                                                   |-> Gemini language detection (Auto only)
                                                   |-> Gnani Prisma transcription
                                                   `-> Gemini summary -> PostgreSQL
```

FastAPI synchronously validates/stores uploads, creates a record, and enqueues work. Transcription and summarization run in the worker. The frontend polls durable status until `completed` or `failed`.

With `LOCAL_DEVELOPMENT_MODE=true`, the same API and processing workflow use SQLite, `work/local-storage`, and a bounded in-process executor. This profile exists only for browser-based human testing; deployment continues to use PostgreSQL, S3-compatible storage, Redis, and Celery.

## Data Flow

1. Next.js validates basic audio size/type and uploads multipart field `audio` with progress.
2. FastAPI canonicalizes media type, checks a format signature, enforces the byte limit, sanitizes the display name, generates an opaque key, and stores the original privately.
3. FastAPI creates a PostgreSQL row in `queued`, submits its UUID to Celery, and returns HTTP 202.
4. The worker downloads the object. In Auto mode it sets `detecting_language` and asks Gemini to select a supported dominant language; a manual source choice skips this call.
5. The worker sets `transcribing` and sends the audio plus language code to Gnani Prisma.
6. Gnani returns the original-language transcript; the worker persists it and sets `summarizing`.
7. Gemini creates notes in either the detected/source language or the user-selected summary language. The worker persists them and sets `completed`.
8. The browser polls every 2–2.5 seconds and stops at a terminal state. Notes stay reopenable.
9. Failures retry with bounded delay. Terminal failures show a safe message; a language override can retranscribe the stored original without re-uploading.

## Database Schema

Migration `20260930_01` creates `audio_notes`:

- `id` — UUID primary key exposed in note URLs.
- `original_filename`, `media_type`, `size_bytes` — display/validation metadata.
- `storage_key` — unique private object reference generated by the API.
- `status` — indexed `queued`, `detecting_language`, `transcribing`, `summarizing`, `completed`, or `failed`.
- `source_language`, `summary_language` — user choices (`auto`/`same` or a supported BCP-47 code).
- `detected_language`, `detected_language_name`, `is_code_switched` — persisted detection result and display metadata.
- `transcript`, `summary` — separate nullable results so summary retry can reuse a transcript.
- `error_code`, `error_message` — operational category and safe explanation.
- `attempt_count` — worker attempt count.
- `created_at`, `updated_at`, `completed_at` — lifecycle timestamps; `created_at` is indexed.

There are no relationships because this is intentionally a no-auth, single-user MVP.

## API Documentation

- `GET /api/health` — process liveness.
- `GET /api/ready` — PostgreSQL `SELECT 1` readiness.
- `GET /api/languages` — supported source/summary language catalog.
- `POST /api/notes` — validated multipart upload with source/summary language choices; HTTP 202. Errors: 400 empty, 413 too large, 415 unsupported audio, 422 unsupported language, and safe 503 infrastructure failure.
- `GET /api/notes?limit=50` — newest-first list; limit 1–100.
- `GET /api/notes/{uuid}` — durable state, error, transcript, and summary; 404 when absent.
- `POST /api/notes/{uuid}/retry` — retries failed work or accepts language overrides to retranscribe a completed note from stored audio.

Authentication is absent. A multi-user version must add identity, ownership, and row filtering.

## Background Processing

Redis-backed Celery handles long work. Upload validation, object persistence, database insertion, and enqueueing are synchronous. Transcription and summarization are asynchronous. PostgreSQL is the visible status source, so Celery results are disabled.

Attempts are bounded by `TASK_MAX_RETRIES`. Intermediate failure returns to `queued`; the last becomes `failed`. Re-running never creates a second record, completed records are no-ops, and a saved transcript is reused if summarization needs retrying.

## Environment Variables

`.env.example` documents:

- `DATABASE_URL` — PostgreSQL for API, worker, and Alembic.
- `REDIS_URL` — Celery broker; job results and progress live in PostgreSQL.
- `CORS_ORIGINS` — trusted browser origins.
- `LOCAL_DEVELOPMENT_MODE`, `LOCAL_STORAGE_PATH` — opt-in infrastructure-free human-test profile and its private audio directory.
- `STORAGE_*` — S3 endpoint, region, bucket, credentials, and addressing mode.
- `GEMINI_API_KEY`, `GEMINI_DETECTION_MODEL`, `GEMINI_SUMMARY_MODEL`, `GEMINI_REQUEST_TIMEOUT_MS` — server-only credential, independent detection/summary models, and timeout.
- `GNANI_API_KEY`, `GNANI_API_URL`, `GNANI_REQUEST_TIMEOUT_SECONDS` — server-only transcription credential, endpoint, and timeout.
- `MAX_UPLOAD_BYTES`, `TASK_MAX_RETRIES` — safety/reliability limits.
- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_REPOSITORY_URL` — public browser configuration only.

## Local Development

Commands are in `README.md`. The intended path is `docker compose up --build` after copying `.env.example` to `.env`. The API runs `alembic upgrade head` before Uvicorn; the worker uses the same image.

Exact local sequence:

```text
copy .env.example to .env and set GNANI_API_KEY plus GEMINI_API_KEY
docker compose up --build

# or run infrastructure plus processes separately
docker compose up -d postgres redis minio minio-init
cd backend
python -m venv .venv
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
celery -A app.worker.celery_app worker --loglevel=INFO   # second terminal
cd ../frontend
corepack enable
corepack prepare pnpm@11.19.0 --activate
pnpm install --frozen-lockfile
pnpm dev

cd backend && pytest
cd frontend && pnpm test
cd frontend && pnpm build
```

Verification currently passes: 27 backend tests with 66% coverage, frontend component tests for the upload/empty state and completed summary/transcript presentation, an optimized Next.js build, FastAPI health/language smoke checks, PostgreSQL migration SQL generation, live Gemini detection → Gnani transcription → Gemini summary, and the complete localhost API workflow using the human-test adapters. Desktop home, completed-note, architecture, full-page, and narrow responsive layouts were rendered and visually inspected. The production container path remains unverified because this machine lacks Docker.

## Local Human Testing Without Docker

Use this profile when PostgreSQL, Redis, and MinIO are not installed. It preserves the real frontend, API validation, polling, Gemini calls, Gnani transcription, history, retry, and language-correction behavior. Only the infrastructure adapters change.

Backend terminal (PowerShell):

```powershell
cd backend
$env:LOCAL_DEVELOPMENT_MODE = "true"
$env:DATABASE_URL = "sqlite:///../work/local-audio-notes.db"
$env:LOCAL_STORAGE_PATH = "../work/local-storage"
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000
```

Frontend terminal:

```powershell
cd frontend
pnpm dev --hostname 127.0.0.1
```

Open `http://localhost:3000`, upload a real recording, leave both language selectors at their defaults for the complete Auto flow, and watch the detail page reach `completed`. Confirm the transcript, summary, previous-note history, page refresh persistence, and retranscription with a manual source-language correction. API documentation is at `http://localhost:8000/docs`; readiness is at `http://localhost:8000/api/ready`. Use `localhost` rather than `127.0.0.1` in the browser so its origin matches the default CORS configuration.

Current localhost verification result: frontend and note-detail HTTP 200, API health/readiness HTTP 200, a successful CORS preflight for `http://localhost:3000`, one completed persisted note, detected language `en-IN`, non-empty transcript, non-empty summary, and no error code.

This mode is deliberately not a deployment topology: its executor stops with the API process and SQLite is not suitable for horizontally scaled workers. Switch `LOCAL_DEVELOPMENT_MODE` off and use the Docker/managed-service architecture before deployment.

## Deployment

Deploy Next.js and FastAPI separately and Celery from the backend image. Use managed PostgreSQL, Redis, and private S3-compatible storage. Run Alembic as a release step. `NEXT_PUBLIC_API_URL` is build-time public configuration; credentials belong only to API/worker environments. Provider connectivity is verified locally, but no public URL has been created.

## Known Issues / Limitations

- The local browser flow uses development adapters; the Docker-backed PostgreSQL, queue, and object-storage path still needs integrated runtime verification.
- Auto detection intentionally covers the configured Gnani catalog rather than every world language.
- No authentication or tenant isolation.
- No public deployment exists.
