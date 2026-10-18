# Audio Notes Platform

[![CI Pipeline](https://github.com/NikshayGoyal/Audio-Notes-Platform/actions/workflows/ci.yml/badge.svg)](https://github.com/NikshayGoyal/Audio-Notes-Platform/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?style=flat&logo=google&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-Passing%20(25%2F25)-6E9F18?style=flat&logo=vitest&logoColor=white)
![Pytest](https://img.shields.io/badge/Pytest-Passing%20(72%2F72)-0A9EDC?style=flat&logo=pytest&logoColor=white)

> **Live Demo:** [https://audio-notes-platform-ten.vercel.app](https://audio-notes-platform-ten.vercel.app)  
> **API:** [https://audio-notes-platform-uiei.onrender.com/api](https://audio-notes-platform-uiei.onrender.com/api)  
> **Architecture Deep Dive:** [https://audio-notes-platform-ten.vercel.app/architecture](https://audio-notes-platform-ten.vercel.app/architecture)  
> **Meeting Analytics Hub:** [https://audio-notes-platform-ten.vercel.app/analytics](https://audio-notes-platform-ten.vercel.app/analytics)

Audio Notes is an enterprise-grade AI multimedia intelligence platform that turns recorded meetings, voice notes, and audio discussions into structured executive intelligence, action item roadmaps, and grounded conversational Q&A with real-time streaming updates.

## Key Engineering Highlights

- **Executive Meeting Analytics Hub (`GET /api/analytics`, `/analytics`):** Real-time aggregation of meeting KPIs, roadmap execution velocity (% completed, priority breakdown high/med/low, assignee distribution), strategic decisions audit log, topic cloud, speaker airtime, and language diversity metrics.
- **Global Knowledge Brain & Cross-Note RAG (`POST /api/chat`):** Interactive multi-note conversational assistant synthesizing decisions, roadmap priorities, and transcripts across the entire library with clickable note citation pills and tenant-isolated SQL joins.
- **Speaker Diarization & Turn Attribution ("Who Said What"):** Gemini-powered speaker segmentation attributing dialogue blocks to identified meeting participants, rendering interactive participant badge chips and per-turn speaker labels alongside playback timestamps.
- **Sliding-Window Rate Limiting & Security Hardening:** Client IP / tenant sliding-window request throttling with dynamic `X-RateLimit-*` headers, standard HTTP 429 `Retry-After` enforcement, and hardened security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`).
- **Synchronized Click-to-Seek Karaoke Transcript:** Bidirectional synchronization between WaveSurfer.js audio playback and the transcript. Clicking any timestamp pill (`[00:14]`) or sentence block jumps the audio player to that exact second, with real-time glowing segment illumination during playback.
- **Full-Text Search & Snippet Highlighting:** Real-time query matching across notes, titles, and transcripts (`GET /api/notes?q=...`) returning contextual excerpt snippets around matching keywords, paired with 1-click library status filter tabs (All, Completed, Active).
- **Real-Time Server-Sent Events (SSE) Streaming:** Native HTTP streaming pipeline (`GET /api/notes/{id}/stream`) with browser `EventSource` delivering instant status updates as Gnani and Gemini work, eliminating unnecessary HTTP polling with seamless reconnection fallback.
- **"Ask AI" Conversational Assistant (In-Browser RAG):** Interactive AI executive assistant grounded strictly in the note's transcript and structured decisions (`POST /api/notes/{id}/chat`), featuring quick-prompt starter chips, markdown reply formatting, and one-click clipboard copying.
- **In-Browser Audio Recording Studio:** Built directly into the browser with Web Audio API `AudioContext` frequency analysis, real-time waveform visualizer, pause/resume controls, and instant audio playback preview.
- **1-Click Recruiter Demo Presets:** Pre-loaded audio scenarios (`Tech Architecture Sync`, `Product Strategy Sync`) allowing recruiters to evaluate full end-to-end processing in 3 seconds without having to upload files.
- **Interactive Audio Waveform Player:** Powered by WaveSurfer.js featuring interactive audio waveform peaks, time scrubbing, playback speed adjustment (0.75x–2.0x), volume control, and keyboard navigation (Space to toggle, arrows to skip).
- **Multi-Tenant User Isolation & Guest Sessions:** Zero-friction guest sessions (`guest_<id>`) for instant recruiter evaluation with strict database row-level isolation and Supabase JWT authentication support.
- **Structured AI Intelligence Pipeline:** Powered by Gemini 2.5 with structured JSON schemas extracting:
  - **Executive Overview:** High-impact executive synthesis of discussions.
  - **Action Items Checklist:** Priority-classified (`HIGH`, `MEDIUM`, `LOW`) follow-up tasks with assignee tags (`@owner`) and interactive checkbox tracking.
  - **Strategic Decisions & Rationale:** Key decision statements paired with explicit rationale callouts.
  - **Topic Classification:** Automated categorization tags for instant organization.
- **Interactive Execution Tracking:** Check off completed action items directly in the UI with optimistic state updates and backend persistence (`PATCH /api/notes/{id}`).
- **One-Click Multi-Format Export Engine:** Export complete structured meeting notes to Markdown (`.md`), Plain Text (`.txt`), Print / PDF, or copy formatted markdown to clipboard.
- **Multilingual Transcription & Code-Switching:** 11 Indic languages supported via Gnani Prisma ASR + Gemini language family detection with automatic Hinglish/code-switch identification.
- **Comprehensive Dual Test Suite:** **72 Pytest backend tests (100% passing)** and **25 Vitest frontend tests across 9 test suites (100% passing)** with strict regression coverage.

## Architecture

```text
Browser
  | upload / poll
  v
Next.js ---------> FastAPI -------> PostgreSQL (metadata, status, results)
                       |----------> S3-compatible storage (private originals)
                       `----------> Redis queue
                                       |
                                       v
                                  Celery worker
                                  |           |
                          Gemini detection   Gnani Prisma
                                  |           |
                                  `-> Gemini summary -> PostgreSQL
```

FastAPI performs validation, private object upload, database creation, and queue submission synchronously, returning HTTP 202. Gnani and Gemini calls happen asynchronously in the Celery worker. The browser polls PostgreSQL-backed note state every 2–2.5 seconds until a terminal state, so refreshes are safe and the page never appears frozen.

## Repository Structure

- `frontend/` — Next.js App Router UI and browser API client.
- `backend/app/` — FastAPI routes, SQLAlchemy model, storage/Gnani/Gemini services, and Celery worker.
- `backend/migrations/` — Alembic database migrations.
- `backend/tests/` — focused API and domain tests.
- `docker-compose.yml` — local PostgreSQL, Redis, MinIO, API, worker, and frontend.
- `Code_Understanding.md` — detailed engineering handoff.
- `Decisions.md` — architectural decision record.
- `TASK_STATUS.md` — current progress snapshot.

## Prerequisites

- Docker Desktop with Docker Compose (recommended), or Node.js 22+, Python 3.12+, PostgreSQL, Redis, and S3-compatible storage.
- A Gnani API key from [Gnani](https://app.gnani.ai) and a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

## Environment

Copy `.env.example` to `.env`, set strong local passwords, and add `GNANI_API_KEY` plus `GEMINI_API_KEY`. Never expose secrets through a `NEXT_PUBLIC_*` variable. Set `NEXT_PUBLIC_REPOSITORY_URL` once the GitHub repository exists.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection for API, worker, and migrations |
| `REDIS_URL` | Celery broker |
| `CORS_ORIGINS` | Comma-separated trusted frontend origins |
| `LOCAL_DEVELOPMENT_MODE`, `LOCAL_STORAGE_PATH` | Optional SQLite/filesystem/in-process profile for localhost human testing only |
| `STORAGE_ENDPOINT_URL`, `STORAGE_REGION`, `STORAGE_BUCKET` | S3-compatible bucket location |
| `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` | Server-only bucket credentials |
| `STORAGE_FORCE_PATH_STYLE` | Enable path-style addressing for MinIO |
| `GEMINI_API_KEY` | Server-only Gemini credential |
| `GEMINI_DETECTION_MODEL`, `GEMINI_SUMMARY_MODEL` | Independently configurable Gemini models; the defaults favor a responsive MVP |
| `GNANI_API_KEY`, `GNANI_API_URL`, `GNANI_REQUEST_TIMEOUT_SECONDS` | Gnani transcription credentials, endpoint, and timeout |
| `GEMINI_REQUEST_TIMEOUT_MS` | Maximum duration of each Gemini SDK request |
| `MAX_UPLOAD_BYTES` | Authoritative backend upload limit |
| `TASK_MAX_RETRIES` | Automatic worker retry count |
| `NEXT_PUBLIC_API_URL` | Public browser-visible API base URL |
| `NEXT_PUBLIC_REPOSITORY_URL` | Public GitHub link shown on the architecture page |

## Run with Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:3000`. API docs are at `http://localhost:8000/docs`, MinIO console at `http://localhost:9001`, and readiness at `http://localhost:8000/api/ready`.

## Run Services Manually

Start PostgreSQL, Redis, and MinIO first, then adjust `.env` hostnames from service names to `localhost`:

```bash
docker compose up -d postgres redis minio minio-init
```

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate          # Windows; use source .venv/bin/activate on macOS/Linux
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
```

In a second backend terminal:

```bash
celery -A app.worker.celery_app worker --loglevel=INFO
```

For the frontend:

```bash
cd frontend
corepack enable
corepack prepare pnpm@11.19.0 --activate
pnpm install --frozen-lockfile
pnpm dev
```

The production UI uses Lucide icons, Radix tooltips, Motion transitions, and Sonner toasts. They are already locked in `pnpm-lock.yaml`; the exact add command used was:

```bash
pnpm add lucide-react sonner @radix-ui/react-tooltip motion
```

### Human testing without Docker

If PostgreSQL, Redis, and MinIO are unavailable, start the development-only adapters in one PowerShell terminal:

```powershell
cd backend
$env:LOCAL_DEVELOPMENT_MODE = "true"
$env:DATABASE_URL = "sqlite:///../work/local-audio-notes.db"
$env:LOCAL_STORAGE_PATH = "../work/local-storage"
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000
```

Then run `pnpm dev --hostname 127.0.0.1` from `frontend/` and open `http://localhost:3000`. This exercises the real Gnani/Gemini flow but replaces PostgreSQL, Redis/Celery delivery, and S3 storage with SQLite, an in-process executor, and a private local directory. Use the `localhost` URL so the browser matches the default CORS origin. Do not deploy with this mode enabled.

## API Overview

- `GET /api/health` — liveness check.
- `GET /api/ready` — verifies the database is reachable.
- `GET /api/auth/me` — returns current authenticated user or isolated guest session info.
- `GET /api/languages` — supported manual/detected language catalog.
- `POST /api/notes` — multipart fields `audio`, `title` (optional), `source_language`, and `summary_language`; returns HTTP 202.
- `GET /api/notes?limit=50` — user-isolated newest-first note library.
- `GET /api/notes/{id}` — status, error, transcript, and summary (owner-protected).
- `GET /api/notes/{id}/stream` — real-time Server-Sent Events (SSE) progress and update stream.
- `POST /api/notes/{id}/chat` — conversational AI assistant with grounded RAG Q&A on audio transcripts.
- `PATCH /api/notes/{id}` — updates note title and structured intelligence state (action items, decisions).
- `DELETE /api/notes/{id}` — deletes note and cleans up associated audio storage.
- `GET /api/notes/{id}/audio` — audio playback stream or S3 presigned URL redirect.
- `POST /api/notes/{id}/retry` — retries failure or retranscribes with JSON language overrides.

## Tests and Verification

```bash
# Backend unit & integration tests (58 tests, 100% passing)
cd backend
.\.venv\Scripts\python.exe -m pytest --cov=app

# Frontend component & integration tests (14 tests across 6 suites, 100% passing)
cd frontend
pnpm test
pnpm build
```

GitHub Actions repeats backend tests with coverage, frontend tests/build, and Docker Compose configuration validation on every push and pull request.

## Architecture & Production Readiness

- **Multi-Tenant User Isolation**: Every user gets an isolated workspace. Supports Supabase JWT tokens via `Authorization: Bearer <token>` and frictionless automatic guest sessions with reset capability.
- **Audio Playback Engine**: In-browser audio streaming directly from storage or via S3 presigned URLs.
- **Library Search**: Instant client-side search and filtering across titles, original filenames, and detected languages.
- **Durable Asynchronous Pipeline**: Celery/background workers process heavy ASR and LLM workloads outside the HTTP cycle.
- **Render Cold Start**: On the free tier, Render spins down after inactivity; the first request after idle may take ~50 seconds to cold-start.

