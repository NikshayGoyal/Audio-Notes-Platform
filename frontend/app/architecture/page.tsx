"use client";

import { useState } from "react";
import {
  Activity,
  ArrowDown,
  Bot,
  Boxes,
  CheckCircle2,
  CloudUpload,
  Code2,
  Cpu,
  Database,
  FastForward,
  GitBranch,
  Globe2,
  HardDrive,
  Headphones,
  KeyRound,
  Languages,
  Layers,
  ListChecks,
  LockKeyhole,
  Mic,
  Radio,
  RefreshCw,
  Scale,
  Search,
  ServerCog,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
  Workflow,
} from "lucide-react";

const flow = [
  { title: "Next.js 15 UI", detail: "WaveSurfer, in-browser recording, SSE subscriber", icon: Globe2, tone: "violet" },
  { title: "FastAPI Gateway", detail: "Sliding-window rate limiter & security middleware", icon: ServerCog, tone: "blue" },
  { title: "PostgreSQL Database", detail: "Multi-tenant row-level storage & Alembic migrations", icon: Database, tone: "cyan" },
  { title: "Object Storage", detail: "Private audio recordings (S3 / MinIO)", icon: HardDrive, tone: "teal" },
  { title: "Redis + Celery", detail: "Async task queue with automatic retry policies", icon: Workflow, tone: "amber" },
  { title: "Gemini 2.5 Flash", detail: "Structured intelligence, speaker diarization & RAG", icon: Sparkles, tone: "rose" },
  { title: "Gnani Prisma ASR", detail: "High-accuracy multilingual Indic speech-to-text", icon: Languages, tone: "green" },
];

interface Subsystem {
  id: string;
  name: string;
  icon: typeof Sparkles;
  headline: string;
  description: string;
  highlights: string[];
  specs: { label: string; value: string }[];
}

const subsystems: Subsystem[] = [
  {
    id: "realtime",
    name: "Real-Time SSE",
    icon: Radio,
    headline: "Server-Sent Events (SSE) Streaming Pipeline",
    description:
      "Native HTTP event stream pipeline delivering millisecond status updates as Gnani and Gemini work. Eliminates high-frequency client polling with automatic EventSource reconnection and exponential backoff fallback.",
    highlights: [
      "Endpoint: GET /api/notes/{id}/stream with text/event-stream media type",
      "Dynamic browser EventSource subscription with real-time UI stage illumination",
      "Graceful fallback: automatically degrades to 2.5s polling if SSE connection drops",
      "Zero resource waste: streaming connection closes immediately on terminal completion",
    ],
    specs: [
      { label: "Protocol", value: "HTTP/1.1 SSE (Server-Sent Events)" },
      { label: "Payload Format", value: "JSON Event Streams (note_update, complete, error)" },
      { label: "Client Reconnection", value: "Automatic with EventSource API" },
      { label: "Connection Timeout", value: "600 iterations (~10 min limit)" },
    ],
  },
  {
    id: "security",
    name: "Rate Limiting & Security",
    icon: ShieldCheck,
    headline: "Sliding-Window Rate Limiting & Security Hardening",
    description:
      "Enterprise security middleware enforcing in-memory sliding-window rate limits per client IP / tenant session, standard HTTP 429 Retry-After responses, and hardened OWASP security headers across all API endpoints.",
    highlights: [
      "SlidingWindowRateLimiter: tracks timestamped requests with precise window expiration",
      "RFC-compliant rate limit response headers (X-RateLimit-Limit, Remaining, Reset)",
      "Strict HTTP 429 Too Many Requests enforcement with Retry-After seconds header",
      "Hardened security headers: X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy",
      "Multi-method CORS preflight support (GET, POST, PATCH, DELETE, OPTIONS)",
    ],
    specs: [
      { label: "Algorithm", value: "Sliding-Window In-Memory Counter" },
      { label: "Default Limit", value: "60 requests / minute per IP/Tenant" },
      { label: "Security Headers", value: "nosniff, DENY, strict-origin-when-cross-origin" },
      { label: "Test Coverage", value: "100% verified via Pytest test_rate_limit.py" },
    ],
  },
  {
    id: "diarization",
    name: "Speaker Diarization",
    icon: Users,
    headline: "Speaker Diarization & Turn Attribution (\"Who Said What\")",
    description:
      "AI-powered conversational segmentation attributing transcript turns to identified meeting participants. Synchronized with the interactive player, highlighting active speakers in real time.",
    highlights: [
      "Gemini structured Pydantic schema extraction: SpeakerTurnResult (speaker, text)",
      "Participant avatar chips: shows all meeting participants in an executive summary badge row",
      "Per-turn speaker badges: rendered in the interactive transcript alongside audio timestamps",
      "Bidirectional playback: clicking any speaker turn seeks the audio player to that exact moment",
    ],
    specs: [
      { label: "Extraction Model", value: "Gemini 2.5 Flash Structured Outputs" },
      { label: "Diarization Schema", value: "speakers: list[str], speaker_turns: list[SpeakerTurn]" },
      { label: "UI Scrubbing", value: "Proportional sentence/turn time mapping" },
      { label: "Interactive State", value: "Glowing active highlight on player scrub" },
    ],
  },
  {
    id: "rag",
    name: "Cross-Note RAG",
    icon: Sparkles,
    headline: "Global Knowledge Brain & Cross-Note RAG Assistant",
    description:
      "Interactive conversational executive assistant capable of querying across your entire library of recordings, synthesizing decisions, action items, and transcripts with precise citations.",
    highlights: [
      "Endpoint: POST /api/chat with LibraryChatRequest and LibraryChatResponse",
      "Multi-note context synthesis: aggregates decisions, roadmaps, and transcripts across up to 25 notes",
      "Row-level tenant isolation: users can only query recordings belonging to their tenant/session",
      "Direct citations: answers reference specific notes with one-click navigation chips",
      "In-browser conversational modal with quick-start prompt chips for instant recruiter demo",
    ],
    specs: [
      { label: "RAG Strategy", value: "Multi-Note Context Aggregation & Synthesis" },
      { label: "Context Window", value: "Executive overviews, action items, decisions & transcripts" },
      { label: "Tenant Filter", value: "Strict SQL WHERE user_id = tenant.id" },
      { label: "Citations", value: "Clickable note source pills with metadata" },
    ],
  },
  {
    id: "multimedia",
    name: "Audio DSP & Player",
    icon: Headphones,
    headline: "WaveSurfer.js Waveform Player & Web Audio Recording Studio",
    description:
      "Studio-grade audio processing right in the browser. Features interactive audio peak rendering, variable playback speeds, and a live recording studio with real-time frequency analysis.",
    highlights: [
      "WaveSurfer.js waveform visualizer: custom gradient peaks, interactive scrubbing, and keyboard controls",
      "Variable playback speeds: 0.75x, 1x, 1.25x, 1.5x, 2x with pitch correction",
      "In-browser recording studio: Web Audio API AudioContext + MediaRecorder frequency analyzer bars",
      "1-Click Recruiter Demo Presets: preloaded audio clips (Architecture Sync, Product Strategy) for 3-second evaluation",
    ],
    specs: [
      { label: "Visualizer", value: "WaveSurfer.js v8 + HTML5 Canvas" },
      { label: "Audio DSP", value: "Web Audio API AnalyserNode (frequencyBinCount)" },
      { label: "Recording Codec", value: "audio/webm with Opus compression" },
      { label: "Recruiter Presets", value: "tech_architecture_sync.wav, product_strategy_sync.wav" },
    ],
  },
  {
    id: "testing",
    name: "Dual Test Suite",
    icon: Code2,
    headline: "FAANG-Grade Dual Test Suite & Automated CI/CD",
    description:
      "Comprehensive test coverage protecting every layer from regression: backend API contracts, database isolation, rate limiting, and frontend React components.",
    highlights: [
      "69 Pytest backend tests (100% passing): unit, integration, and tenant isolation tests",
      "22 Vitest frontend tests across 8 suites (100% passing): components, hooks, exports, and chat",
      "Zero build errors: Next.js 15 production build compiled cleanly with strict TypeScript & ESLint",
      "Automated GitHub Actions CI/CD: executes both test suites on every pull request and push to main",
    ],
    specs: [
      { label: "Backend Tests", value: "69 / 69 Pytest tests (100% passing)" },
      { label: "Frontend Tests", value: "22 / 22 Vitest tests in 8 suites (100% passing)" },
      { label: "CI/CD Pipeline", value: "GitHub Actions automated quality gates" },
      { label: "Deploy Targets", value: "Vercel (Frontend) + Render (FastAPI Backend)" },
    ],
  },
];

export default function ArchitecturePage() {
  const [activeSubsystem, setActiveSubsystem] = useState(subsystems[0].id);
  const currentSystem = subsystems.find((s) => s.id === activeSubsystem) ?? subsystems[0];
  const repositoryUrl = process.env.NEXT_PUBLIC_REPOSITORY_URL;

  return (
    <main className="architecture-page">
      <header className="architecture-hero">
        <div className="eyebrow"><Boxes size={14} /> System Architecture</div>
        <h1>Enterprise Multimedia Intelligence<br /><span>Engineered for Production.</span></h1>
        <p>A distributed, multi-tenant platform orchestrating real-time streaming, sliding-window rate limiting, speaker diarization, and cross-note RAG intelligence.</p>
        <div className="architecture-pills">
          <span><CheckCircle2 size={15} /> 69 Pytest + 22 Vitest Tests (100% Passing)</span>
          <span><ShieldCheck size={15} /> Sliding-Window Rate Limiting</span>
          <span><Radio size={15} /> Real-Time SSE Streaming</span>
          <span><LockKeyhole size={15} /> Multi-Tenant Row-Level Security</span>
        </div>
      </header>

      {/* System Flow Diagram */}
      <section className="architecture-board" aria-labelledby="system-flow-title">
        <div className="board-heading">
          <div>
            <p className="step-label">DISTRIBUTED SYSTEM MAP</p>
            <h2 id="system-flow-title">Seven Focused Layers Orchestrating End-to-End Processing</h2>
          </div>
          <div className="live-architecture"><i /> Production Architecture</div>
        </div>
        <div className="architecture-flow" aria-label="System architecture flow">
          {flow.map((item, index) => {
            const Icon = item.icon;
            return (
              <div className="flow-wrap" key={item.title}>
                <article className={`flow-card tone-${item.tone}`}>
                  <span className="flow-number">{String(index + 1).padStart(2, "0")}</span>
                  <div className="flow-icon"><Icon size={21} /></div>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </div>
                </article>
                {index < flow.length - 1 && <ArrowDown className="flow-arrow" size={18} />}
              </div>
            );
          })}
        </div>
      </section>

      {/* Interactive Subsystem Deep-Dive Tabs */}
      <section className="architecture-deepdive-section">
        <div className="section-heading">
          <div className="heading-with-number">
            <div className="section-number">02</div>
            <div>
              <p className="step-label">INTERACTIVE SUBSYSTEM EXPLORER</p>
              <h2>Deep-Dive into Enterprise Engineering Highlights</h2>
              <p>Click any subsystem below to inspect implementation details, protocols, and test metrics.</p>
            </div>
          </div>
        </div>

        <div className="subsystem-tabs-nav">
          {subsystems.map((sub) => {
            const Icon = sub.icon;
            const isActive = sub.id === activeSubsystem;
            return (
              <button
                key={sub.id}
                type="button"
                className={`subsystem-tab-btn ${isActive ? "active" : ""}`}
                onClick={() => setActiveSubsystem(sub.id)}
              >
                <Icon size={16} />
                <span>{sub.name}</span>
              </button>
            );
          })}
        </div>

        <article className="subsystem-detail-card">
          <div className="subsystem-detail-header">
            <div className="subsystem-icon-wrap">
              <currentSystem.icon size={24} />
            </div>
            <div>
              <p className="step-label">SUBSYSTEM SPECIFICATION</p>
              <h3>{currentSystem.headline}</h3>
            </div>
          </div>
          <p className="subsystem-description">{currentSystem.description}</p>

          <div className="subsystem-grid">
            <div className="subsystem-highlights-col">
              <h4>Architectural Highlights</h4>
              <ul className="subsystem-bullets">
                {currentSystem.highlights.map((hl, i) => (
                  <li key={i}>
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>{hl}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="subsystem-specs-col">
              <h4>Technical Specifications</h4>
              <dl className="subsystem-spec-list">
                {currentSystem.specs.map((sp, i) => (
                  <div key={i} className="spec-item">
                    <dt>{sp.label}</dt>
                    <dd>{sp.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </article>
      </section>

      {/* Request Journey */}
      <section className="journey-section">
        <div className="section-heading">
          <div className="heading-with-number">
            <div className="section-number">03</div>
            <div>
              <p className="step-label">REQUEST LIFECYCLE</p>
              <h2>What happens from audio capture to executive intelligence</h2>
              <p>Every phase is asynchronously tracked and persisted in PostgreSQL.</p>
            </div>
          </div>
        </div>
        <div className="journey-grid">
          <article>
            <div className="journey-icon"><CloudUpload size={22} /></div>
            <span>01</span>
            <h3>Accept & Rate Limit</h3>
            <p>FastAPI validates audio signatures, checks sliding-window IP limits, spools chunks to storage, and queues Celery with HTTP 202.</p>
          </article>
          <article>
            <div className="journey-icon"><Radio size={22} /></div>
            <span>02</span>
            <h3>Stream Real-Time Progress</h3>
            <p>Next.js opens an SSE event stream (`/notes/&#123;id&#125;/stream`), receiving reactive updates as language detection and transcription run.</p>
          </article>
          <article>
            <div className="journey-icon"><Bot size={22} /></div>
            <span>03</span>
            <h3>Structured AI & Diarization</h3>
            <p>Gemini 2.5 extracts structured executive summaries, action item checklists with priorities, strategic decisions, and speaker turn attributions.</p>
          </article>
        </div>
      </section>

      {/* Engineering Principles */}
      <section className="principles-grid">
        <article>
          <div className="principle-icon"><KeyRound size={20} /></div>
          <div>
            <p className="step-label">SECURITY & ISOLATION</p>
            <h3>Multi-tenant row isolation</h3>
            <p>Zero friction guest sessions (`guest_&lt;id&gt;`) and JWT authentication strictly isolated via database queries. Secrets never touch the client.</p>
          </div>
        </article>
        <article>
          <div className="principle-icon"><RefreshCw size={20} /></div>
          <div>
            <p className="step-label">RESILIENCE & RETRIES</p>
            <h3>Idempotent worker execution</h3>
            <p>Transcripts are preserved when only summarization fails, language corrections reuse stored audio, and Celery retries network hiccups.</p>
          </div>
        </article>
        <article>
          <div className="principle-icon"><ShieldAlert size={20} /></div>
          <div>
            <p className="step-label">RATE LIMITING</p>
            <h3>Token bucket / sliding window</h3>
            <p>In-memory sliding window prevents API abuse with dynamic `X-RateLimit-*` headers and HTTP 429 Retry-After protection.</p>
          </div>
        </article>
      </section>

      {/* GitHub Repository Runbook Card */}
      <section className="repo-card">
        <div className="repo-icon"><GitBranch size={24} /></div>
        <div>
          <p className="step-label">SOURCE CODE & VERIFICATION</p>
          <h2>Inspect the complete codebase on GitHub</h2>
          <p>Examine git commit history, CI/CD workflows, 69 Pytest backend tests, 22 Vitest frontend tests, and architectural decision records.</p>
        </div>
        {repositoryUrl ? (
          <a className="secondary-button" href={repositoryUrl} target="_blank" rel="noopener noreferrer">
            Open repository <GitBranch size={16} />
          </a>
        ) : (
          <a className="secondary-button" href="https://github.com/NikshayGoyal/Audio-Notes-Platform" target="_blank" rel="noopener noreferrer">
            Open repository <GitBranch size={16} />
          </a>
        )}
      </section>
    </main>
  );
}
