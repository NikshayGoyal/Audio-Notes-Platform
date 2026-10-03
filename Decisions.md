# Technical Decisions

This is a chronological record of meaningful decisions. It describes choices actually made; planned choices are explicitly labeled until implementation verifies them.

## Decision: Use a small monorepo

Date: 2026-09-30

### Decision

Keep the Next.js frontend, FastAPI backend/worker, infrastructure definition, and documentation in one repository.

### Alternatives Considered

- Separate repositories for the frontend, API, and worker.
- A single Next.js application with server routes and no Python service.

### Why We Chose This

The assignment explicitly requires Next.js and FastAPI. One repository keeps the take-home project easy to run, review, and explain while preserving a clear boundary between TypeScript and Python applications.

### Trade-offs

Independent deployments still require separate build contexts, and a monorepo can couple release cadence. In exchange, setup, contracts, documentation, and local infrastructure stay discoverable in one place.

### Consequences

Top-level documentation and infrastructure coordinate `frontend/` and `backend/`. Each application retains its own dependency manifest and tests.

## Decision: Target S3-compatible storage, Redis, and Celery

Date: 2026-09-30

### Decision

Use an S3-compatible object-storage interface for audio, Redis as the queue broker, and Celery as the Python background-job runner.

### Alternatives Considered

- Store audio in PostgreSQL or the API filesystem.
- FastAPI `BackgroundTasks`, which is process-local and not durable.
- A database-only queue or a managed provider-specific queue.

### Why We Chose This

S3 compatibility supports local MinIO and common hosted buckets without putting large binary data in PostgreSQL. Redis plus Celery provides a recognizable, independently scalable worker with bounded retries and is appropriate for long external-API calls.

### Trade-offs

Local development has two additional services and production needs a worker and Redis. The benefit is clear separation between request handling and durable asynchronous work.

### Consequences

The API and worker share database, storage, and service modules. Docker Compose provides PostgreSQL, Redis, and MinIO locally, while hosted equivalents can use the same interfaces.

## Decision: Add an explicit infrastructure-free human-test profile

Date: 2026-10-03

### Decision

When `LOCAL_DEVELOPMENT_MODE=true`, run the existing API and processing workflow with SQLite, private filesystem object storage, and a bounded in-process executor. Keep the flag off by default and retain PostgreSQL, S3-compatible storage, Redis, and Celery as the deployment architecture.

### Alternatives Considered

- Require Docker before any browser testing.
- Install PostgreSQL, Redis, and MinIO directly on the Windows host.
- Replace the production architecture with SQLite and synchronous request processing.
- Mock Gnani and Gemini in the browser-facing environment.

### Why We Chose This

The current machine has none of the required infrastructure executables, but the user needs to assess the real upload, provider, progress, history, and correction experience before deploying. A clearly gated adapter profile enables that evaluation without weakening or pretending to verify the production topology. It continues to call the real Gnani and Gemini services with server-side keys.

### Trade-offs

Jobs are durable only at the database level; an API shutdown interrupts in-process work. SQLite and a local directory do not model distributed locking, broker delivery, bucket permissions, or multi-instance behavior. In return, human testing needs only the already-installed Python and Node dependencies.

### Consequences

FastAPI creates the SQLite schema during local-mode startup. Uploads remain private under `work/local-storage`, and a two-thread executor runs the same Celery task body without Redis. This profile must never be used as the hosted deployment configuration; the Docker or managed-service path still requires an integrated test before release.

The profile was verified on 2026-10-03 with a real FLAC upload through `POST /api/notes`: it progressed from `queued` to `completed`, detected `en-IN`, persisted the Gnani transcript and Gemini summary, and appeared in note history. This validates the human-test profile, not Redis/Celery delivery or S3/PostgreSQL behavior.

## Decision: Poll durable note state for progress

Date: 2026-09-30

### Decision

Use short-interval HTTP polling from Next.js to read durable note status instead of WebSockets or Server-Sent Events.

### Alternatives Considered

- WebSockets.
- Server-Sent Events.
- Holding the upload request open until processing finishes.

### Why We Chose This

The progress states change only a few times per job. Polling is simple, resilient to refreshes and reconnects, and works across common serverless and container hosting environments without a persistent connection.

### Trade-offs

Polling creates a small amount of repeated traffic and updates are not instantaneous. It avoids connection-state infrastructure and is sufficient for an MVP whose jobs last seconds or minutes.

### Consequences

PostgreSQL is the source of truth for progress. The UI stops polling at terminal states and visibly maps backend states to the processing timeline.

## Decision: Upload through FastAPI with a bounded spool

Date: 2026-09-30

### Decision

Send MVP uploads through FastAPI, read in bounded chunks to a spooled temporary file, and stream that file to private storage under a UUID key.

### Alternatives Considered

- Browser-to-bucket presigned multipart upload.
- Buffer the entire file in memory.
- Persist the browser filename directly on disk.

### Why We Chose This

The 100 MB limit covers the assignment target. API mediation keeps the client simple while enforcing a server byte limit. Generated keys prevent traversal, collisions, and filename disclosure.

### Trade-offs

API bandwidth and request duration scale with file size; larger production uploads should use presigned multipart storage. The MVP gets a smaller security surface.

### Consequences

Backend validation is authoritative. Storage credentials never reach the browser, and database failure triggers best-effort object cleanup.

## Decision (superseded): Use Gemini for transcription and summary

Date: 2026-09-30

Status: Superseded on 2026-10-03 after confirming the original assignment requires Gnani ASR.

### Decision

Use the server-side `google-genai` SDK and Files API in `GeminiService`, with separate configurable transcription and summary models.

### Alternatives Considered

- Call Gemini from the browser.
- Use one combined transcript/summary prompt.
- Put SDK calls directly in the Celery task.

### Why We Chose This

Official Gemini audio guidance specifies server-side file upload and model generation. Separate stages provide honest progress and allow summary retries to reuse the transcript. The adapter contains provider churn.

This decision was retired before live-provider verification. Model selection remains environment-configurable so provider retirement does not require a code release.

### Trade-offs

Two inference calls add latency and cost versus one combined result, but provide clearer failures, reusable transcript data, and modular prompts.

### Consequences

The key stays out of Next.js, model names are environment values, Gemini files are deleted in `finally`, and empty responses fail explicitly.

## Decision: Use Gnani for transcription and Gemini for routing and summaries

Date: 2026-10-03

### Decision

Gnani Prisma is the sole transcription provider. When the user chooses Auto, Gemini identifies a language from the supported catalog; manual selection bypasses detection. Gemini then summarizes the Gnani transcript in the requested language.

### Alternatives Considered

- Continue using Gemini for transcription.
- Send a fixed language to Gnani for every recording.
- Attempt an undocumented `auto` language code in the Gnani request.
- Add full transcript translation to the MVP.

### Why We Chose This

The assignment explicitly requires Gnani ASR, while its published request example expects a language code. A constrained Gemini detection step bridges that gap without pretending Gnani documents a universal auto value. Keeping the original transcript and changing only the summary language preserves fidelity and avoids turning the MVP into a translation product.

### Trade-offs

Auto mode adds one provider call, latency, cost, and another failure boundary. Manual selection is faster and more deterministic. Detection covers the configured Gnani-supported catalog rather than every language in existence.

### Consequences

Progress includes `detecting_language`; notes persist both requested and detected language metadata. Users can correct a language and retranscribe the already stored audio. Silence and unsupported detections fail with actionable messages instead of a misleading transcript.

Live verification found that a general Gemini model can return regional codes outside Gnani's accepted catalog even when prompted otherwise. The implementation therefore constrains structured output to the supported codes and normalizes recognizable regional language names. Detection and summary models are configured separately and default to `gemini-3.5-flash-lite`, which successfully completed both live checks while keeping this routing/notes workload inexpensive.

## Decision: Persist five states with bounded retries

Date: 2026-09-30

### Decision

Persist `queued`, `detecting_language`, `transcribing`, `summarizing`, `completed`, and `failed`. Retry transient worker failures with exponential delay up to the configured limit, then expose manual retry.

### Alternatives Considered

- A boolean `processed` flag.
- Queue-only state.
- Unlimited automatic retry.

### Why We Chose This

The UI needs understandable progress and deliberate failure handling. Database states survive refreshes and queue restarts. Bounded retries absorb transient faults without an infinite cost loop.

### Trade-offs

The state machine needs careful transitions and cannot report within-call Gemini percentage. It provides sufficient stage progress without streaming infrastructure.

### Consequences

Completed tasks are idempotent no-ops, transcripts survive summary retries, and terminal failures expose a safe retry action while stack traces remain server-side.

## Decision: Use small, purpose-built frontend primitives instead of a monolithic UI kit

Date: 2026-10-03

### Decision

Keep Next.js App Router and the existing browser API/state flow, then build a project-specific token system around Lucide React, Radix Tooltip, Motion, and Sonner. Centralize status presentation and icon actions in reusable components rather than introducing a broad component framework.

### Alternatives Considered

- Retain the original CSS-only interface.
- Add a full Material UI, Ant Design, or Chakra UI system.
- Replace the frontend with another framework.
- Introduce a global state library for presentation state.

### Why We Chose This

The application has a focused surface area and already has correct local state and API boundaries. A large UI kit would increase bundle weight, impose a generic visual language, and encourage unnecessary business-logic refactoring. The selected libraries solve four concrete gaps: consistent icons, accessible tooltips, reduced-motion-aware transitions, and toast feedback. CSS design tokens keep the product identity cohesive without replacing Next.js or its route model.

### Trade-offs

The application owns more CSS than it would with a full component suite, so tokens and primitives must remain disciplined. In return, the bundle includes only capabilities the product uses, the design is distinctive, and component behavior stays close to native HTML.

### Consequences

`AppProviders`, `StatusBadge`, and `IconButton` are the reusable presentation boundary. The dashboard now explains file, language, and submission choices in sequence and routes a successful upload to live progress. The note page explicitly separates AI Summary from Original Transcript, provides accessible copy actions, and retains the existing retry/language-correction API. All backend contracts, route paths, polling intervals, and persisted note states remain unchanged.

## Decision: Validate format signatures and keep originals private

Date: 2026-09-30

### Decision

Canonicalize browser MIME values, require a recognized container/audio header, generate the object key, and never expose a public object URL.

### Alternatives Considered

- Trust the browser-provided MIME type.
- Validate only the filename extension.
- Make bucket objects public for simpler playback.

### Why We Chose This

Browser metadata is user-controlled. Lightweight signature checks reject ordinary disguised files without adding a media-processing dependency. The product only needs transcription, so public audio URLs create risk without user value.

### Trade-offs

Header checks are intentionally narrow and may reject an exotic but valid encoding. Full codec inspection would require FFmpeg or a native parser and substantially increase setup complexity.

### Consequences

The API derives canonical media type and storage suffix before upload. Gemini receives that validated MIME type explicitly. Original audio remains available only to trusted API/worker credentials.
