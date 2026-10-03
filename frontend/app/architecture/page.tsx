import {
  ArrowDown,
  Bot,
  Boxes,
  CheckCircle2,
  CloudUpload,
  Code2,
  Construction,
  Database,
  GitBranch,
  Globe2,
  HardDrive,
  KeyRound,
  Languages,
  ListChecks,
  LockKeyhole,
  RefreshCw,
  ServerCog,
  Sparkles,
  Timer,
  Workflow,
} from "lucide-react";

const flow = [
  { title: "Next.js", detail: "Upload, history and live progress", icon: Globe2, tone: "violet" },
  { title: "FastAPI", detail: "Validation and orchestration", icon: ServerCog, tone: "blue" },
  { title: "PostgreSQL", detail: "Durable status and note results", icon: Database, tone: "cyan" },
  { title: "Object storage", detail: "Private original recordings", icon: HardDrive, tone: "teal" },
  { title: "Redis + Celery", detail: "Reliable background delivery", icon: Workflow, tone: "amber" },
  { title: "Gemini", detail: "Language detection and summaries", icon: Sparkles, tone: "rose" },
  { title: "Gnani Prisma", detail: "Original-language transcription", icon: Languages, tone: "green" },
];

export default function ArchitecturePage() {
  const repositoryUrl = process.env.NEXT_PUBLIC_REPOSITORY_URL;
  return (
    <main className="architecture-page">
      <header className="architecture-hero">
        <div className="eyebrow"><Boxes size={14} /> Architecture</div>
        <h1>Built to stay responsive<br /><span>while the hard work runs.</span></h1>
        <p>Every layer has one clear responsibility—from secure upload to durable processing and a result that survives refreshes.</p>
        <div className="architecture-pills"><span><CheckCircle2 size={15} /> Asynchronous by design</span><span><LockKeyhole size={15} /> Server-side secrets</span><span><RefreshCw size={15} /> Refresh-safe progress</span></div>
      </header>

      <section className="architecture-board" aria-labelledby="system-flow-title">
        <div className="board-heading"><div><p className="step-label">SYSTEM MAP</p><h2 id="system-flow-title">One recording, seven focused layers</h2></div><div className="live-architecture"><i /> Production-shaped MVP</div></div>
        <div className="architecture-flow" aria-label="System architecture flow">
          {flow.map((item, index) => {
            const Icon = item.icon;
            return <div className="flow-wrap" key={item.title}><article className={`flow-card tone-${item.tone}`}><span className="flow-number">{String(index + 1).padStart(2, "0")}</span><div className="flow-icon"><Icon size={21} /></div><div><strong>{item.title}</strong><small>{item.detail}</small></div></article>{index < flow.length - 1 && <ArrowDown className="flow-arrow" size={18} />}</div>;
          })}
        </div>
      </section>

      <section className="journey-section">
        <div className="section-heading"><div className="heading-with-number"><div className="section-number">02</div><div><p className="step-label">REQUEST JOURNEY</p><h2>What happens after “Create audio note”</h2><p>The interface exposes the same stages the backend persists.</p></div></div></div>
        <div className="journey-grid">
          <article><div className="journey-icon"><CloudUpload size={22} /></div><span>01</span><h3>Accept securely</h3><p>FastAPI checks size, media type, and file signature before private storage. A queued database record returns immediately.</p></article>
          <article><div className="journey-icon"><Bot size={22} /></div><span>02</span><h3>Process off-request</h3><p>Gemini detects an unknown source language, Gnani transcribes, and Gemini creates the requested summary.</p></article>
          <article><div className="journey-icon"><ListChecks size={22} /></div><span>03</span><h3>Show honest progress</h3><p>The UI polls durable state, explains each stage, and stops only when the note is ready or needs attention.</p></article>
        </div>
      </section>

      <section className="principles-grid">
        <article><div className="principle-icon"><KeyRound size={20} /></div><div><p className="step-label">SECURITY</p><h3>Credentials never enter the browser</h3><p>Gnani, Gemini, database, queue, and storage secrets remain in server and worker environments.</p></div></article>
        <article><div className="principle-icon"><RefreshCw size={20} /></div><div><p className="step-label">RESILIENCE</p><h3>Retries preserve useful work</h3><p>A saved transcript is reused when only summarization fails, and language corrections reuse the original audio.</p></div></article>
        <article><div className="principle-icon"><Code2 size={20} /></div><div><p className="step-label">LOCAL TESTING</p><h3>Real providers, lighter infrastructure</h3><p>The explicit local profile swaps in SQLite and private filesystem storage without mocking Gnani or Gemini.</p></div></article>
      </section>

      <section className="principles-grid" aria-label="Long recordings and future improvements">
        <article><div className="principle-icon"><Timer size={20} /></div><div><p className="step-label">LONG RECORDINGS</p><h3>Large files stay out of application memory</h3><p>The API reads uploads in bounded chunks, spools them to disk, and streams them into private object storage. After the durable note is queued, Celery performs language detection, transcription, and summarization outside the request while the UI polls persisted progress. The MVP accepts files up to 100 MB, comfortably covering recordings longer than two minutes.</p></div></article>
        <article><div className="principle-icon"><Construction size={20} /></div><div><p className="step-label">WITH MORE TIME</p><h3>Move uploads directly to storage and deepen operations</h3><p>I would add presigned multipart browser uploads for files beyond 100 MB, provider-aware audio chunking for very long recordings, authentication and per-user ownership, plus structured monitoring and dead-letter handling for production support.</p></div></article>
      </section>

      <section className="repo-card"><div className="repo-icon"><GitBranch size={24} /></div><div><p className="step-label">SOURCE & RUNBOOK</p><h2>Inspect the implementation</h2><p>Setup, API contracts, verification evidence, and architectural decisions live with the code.</p></div>{repositoryUrl ? <a className="secondary-button" href={repositoryUrl}>Open repository <GitBranch size={16} /></a> : <span className="repo-unavailable"><Code2 size={16} /> Add <code>NEXT_PUBLIC_REPOSITORY_URL</code> after publishing</span>}</section>
    </main>
  );
}
