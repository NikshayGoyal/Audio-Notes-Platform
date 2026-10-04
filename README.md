# Audio Notes Platform

> **Live Demo:** [https://audio-notes-platform-ten.vercel.app](https://audio-notes-platform-ten.vercel.app)
> **API:** [https://audio-notes-platform-uiei.onrender.com/api](https://audio-notes-platform-uiei.onrender.com/api)

Audio Notes turns uploaded recordings into durable transcripts and concise summaries. Uploads are stored privately, long-running work is handled outside the HTTP request, progress remains visible, and completed or failed notes can be reopened later.

## Features

- MIME-, extension-, and signature-validated MP3, M4A, WAV, WebM, OGG, and FLAC uploads up to 100 MB
- Durable `queued → detecting language → transcribing → summarizing → completed` progress
- Automatic language detection, manual source-language override, and configurable summary language
- Gnani Prisma transcription and Gemini-generated notes
- Previous-note library, detail view, failure message, and retry action
- Next.js frontend, FastAPI API, PostgreSQL, Redis/Celery, and S3-compatible object storage
- In-app architecture explanation at `/architecture`

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

- `GET /api/health` — liveness without dependencies.
- `GET /api/ready` — verifies the database is reachable.
- `GET /api/languages` — supported manual/detected language catalog.
- `POST /api/notes` — multipart fields `audio`, `source_language`, and `summary_language`; returns HTTP 202.
- `GET /api/notes?limit=50` — newest-first note library.
- `GET /api/notes/{id}` — status, error, transcript, and summary.
- `POST /api/notes/{id}/retry` — retries failure or retranscribes with JSON language overrides.

The API has no authentication because this is a single-user assignment MVP. Add identity and owner filtering before making it a multi-user product.

## Tests and Checks

```bash
cd backend && pytest
cd frontend && pnpm test
cd frontend && pnpm build
```

GitHub Actions repeats backend tests with coverage, frontend tests/build, and Docker Compose configuration validation on every push and pull request.

## Deployment

Deploy the frontend and backend as separate web services and the Celery worker from the same backend image. Provision managed PostgreSQL, Redis, and a private S3-compatible bucket. Run `alembic upgrade head` as a release command. Set HTTPS frontend/API origins in `CORS_ORIGINS`, set the public API base URL at frontend build time, and supply all backend secrets only to the API and worker.

Suitable combinations include Vercel for Next.js plus Render/Railway/Fly.io for API and worker, with provider-managed Postgres/Redis and S3, Cloudflare R2, Backblaze B2, or another compatible bucket. A public deployment is not created by this repository alone and must be verified after provider credentials are available.

## Known Limitations

- No user authentication or tenant isolation; it is intentionally a single-user MVP.
- Uploads pass through FastAPI. Direct presigned multipart uploads would be preferable for much larger files.
- Progress is stage-level polling rather than byte/time-level transcription progress.
- Auto detection deliberately maps only the configured Gnani language catalog; unsupported languages fail with a correction prompt instead of producing a misleading transcript.
- Gnani and Gemini still depend on provider availability and account quota; transient failures are retried by the worker.
- Render free tier spins down after inactivity; the first request after idle may take ~50 seconds to cold-start.
