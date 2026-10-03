# New Laptop Setup and Agent Handoff

This package contains the current Audio Notes Platform source code without Git history, API keys, installed dependencies, build output, caches, or local recordings.

## Read First

Before changing code, read these files in order:

1. `README.md` — installation, commands, API contracts, testing, and deployment.
2. `CODE_UNDERSTANDING.md` — application structure and processing flow.
3. `DECISIONS.md` — architectural decisions and trade-offs.
4. `TASK_STATUS.md` — completed verification and remaining work.
5. `.env.example` — complete non-secret environment-variable template.

## Required Software

- Git, if the project will later be committed or pushed to GitHub.
- Docker Desktop with Docker Compose for the production-shaped local stack.
- Node.js 22.
- Corepack and pnpm 11.19.0.
- Python 3.12 for running backend tests outside Docker.

## Restore Environment Variables

From the project root, create the untracked environment file:

```powershell
Copy-Item .env.example .env
```

Add the real credentials locally to `.env`:

```env
GNANI_API_KEY=your-real-key
GEMINI_API_KEY=your-real-key
```

Never paste secret values into an agent prompt, commit `.env`, or upload `.env` to email or cloud storage. Verify that it remains ignored:

```powershell
git check-ignore .env
git ls-files .env
```

The first command should print `.env`; the second should print nothing after Git has been initialized.

Important configuration groups are:

- `DATABASE_URL` and `POSTGRES_*` — PostgreSQL database.
- `REDIS_URL` — Celery broker.
- `STORAGE_*` — S3-compatible object storage or MinIO.
- `GNANI_*` — Gnani Prisma transcription credentials, URL, and timeout.
- `GEMINI_*` — Gemini credentials, models, and timeout.
- `MAX_UPLOAD_BYTES` and `TASK_MAX_RETRIES` — upload and retry limits.
- `CORS_ORIGINS` — allowed deployed frontend origins.
- `NEXT_PUBLIC_API_URL` — browser-visible backend API URL.
- `NEXT_PUBLIC_REPOSITORY_URL` — GitHub URL shown on the architecture page; set this after publishing the repository and rebuild the frontend.
- `LOCAL_DEVELOPMENT_MODE` and `LOCAL_STORAGE_PATH` — optional infrastructure-free localhost profile only.

For Docker Compose, keep `LOCAL_DEVELOPMENT_MODE=false` and use the container hostnames already shown in `.env.example`.

## Install and Verify Without Docker

Backend:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -e ".[dev]"
pytest
cd ..
```

Frontend:

```powershell
cd frontend
corepack enable
corepack prepare pnpm@11.19.0 --activate
pnpm install --frozen-lockfile
pnpm test
pnpm build
cd ..
```

Previous verification recorded 27 passing backend tests, 2 passing frontend tests, and a successful optimized Next.js build.

## Run the Production-Shaped Local Stack

Start Docker Desktop, then run from the project root:

```powershell
docker compose config
docker compose up --build
```

Open:

- Application: `http://localhost:3000`
- API documentation: `http://localhost:8000/docs`
- MinIO console: `http://localhost:9001`

Test a recording of at least two minutes. Confirm upload progress, language detection, Gnani transcription, Gemini summary, persistent history, refresh-safe progress, and visible retry behavior.

Stop services without deleting stored volumes:

```powershell
docker compose down
```

Do not add `-v` unless the PostgreSQL and MinIO data should be erased intentionally.

## Remaining Work

1. Verify the full PostgreSQL, Redis, MinIO, Celery, API, and frontend flow.
2. Create a GitHub repository and initialize fresh Git history if desired.
3. Set `NEXT_PUBLIC_REPOSITORY_URL` to the published repository URL.
4. Deploy all required services and configure production environment variables and CORS.
5. Verify the public URL end to end.

## Prompt for the Next Coding Agent

```text
Take over this Audio Notes Platform internship project. It was transferred without Git history; treat the current files as the verified implementation baseline.

Before making changes, read README.md, CODE_UNDERSTANDING.md, DECISIONS.md, TASK_STATUS.md, NEW_LAPTOP_SETUP.md, and .env.example completely. Inspect the full codebase and report its current status. Never reveal, print, copy, or commit secret values from .env.

The application uses Next.js, FastAPI, PostgreSQL, Redis/Celery, S3-compatible storage, Gnani Prisma transcription, and Gemini language detection and summarization. It includes upload progress, durable processing states, failure handling, retry, history, transcript, summary, and architecture pages. Previous verification recorded 27 passing backend tests, 2 passing frontend tests, a successful Next.js production build, and a successful real Gnani/Gemini localhost workflow.

First reinstall dependencies, run the automated tests and production frontend build, then verify the complete Docker Compose flow with an audio recording of at least two minutes. Preserve the existing architecture and functionality. Report concrete defects before changing code.

Later work is to create and push a GitHub repository, set NEXT_PUBLIC_REPOSITORY_URL, deploy the complete stack, configure production CORS and environment variables, and verify the public URL end to end.
```

