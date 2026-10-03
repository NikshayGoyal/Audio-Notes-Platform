"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  Clipboard,
  FileAudio,
  Languages,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  TextQuote,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import { getNote, retryNote } from "@/lib/api";
import type { Note, NoteStatus } from "@/lib/types";
import { LANGUAGES } from "@/lib/languages";
import { IconButton } from "@/components/icon-button";
import { StatusBadge, statusMeta } from "@/components/status-badge";

function progressSteps(note: Note): { key: NoteStatus; label: string; detail: string }[] {
  return [
    { key: "queued", label: "Queued", detail: "Your recording is safely stored" },
    ...(note.source_language === "auto"
      ? [{ key: "detecting_language" as NoteStatus, label: "Language", detail: "Identifying the spoken language" }]
      : []),
    { key: "transcribing", label: "Transcript", detail: "Gnani is converting speech to text" },
    { key: "summarizing", label: "Summary", detail: "Gemini is organizing the key ideas" },
    { key: "completed", label: "Ready", detail: "Your audio note is complete" },
  ];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NoteDetail({ id }: { id: string }) {
  const [note, setNote] = useState<Note | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retrySource, setRetrySource] = useState("auto");
  const [retrySummary, setRetrySummary] = useState("same");

  const load = useCallback(async () => {
    try {
      setNote(await getNote(id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this note.");
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!note) return;
    setRetrySource(note.detected_language ?? note.source_language ?? "auto");
    setRetrySummary(note.summary_language ?? "same");
  }, [note?.id, note?.detected_language, note?.source_language, note?.summary_language]);
  useEffect(() => {
    if (!note || ["completed", "failed"].includes(note.status)) return;
    const timer = window.setInterval(() => void load(), 2000);
    return () => window.clearInterval(timer);
  }, [note, load]);

  async function retry(options?: { source_language?: string; summary_language?: string }) {
    setRetrying(true);
    try {
      const updated = await retryNote(id, options);
      setNote(updated);
      setError(null);
      toast.success(options ? "Retranscription queued" : "Processing queued again", { description: "This page will update automatically." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not retry.";
      setError(message);
      toast.error("Could not queue the note", { description: message });
    } finally {
      setRetrying(false);
    }
  }

  async function copyText(label: string, value?: string | null) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied to clipboard.`);
    } catch {
      toast.error(`Could not copy the ${label.toLowerCase()}.`);
    }
  }

  if (error && !note) {
    return <main className="detail-page"><Link className="back-link" href="/"><ArrowLeft size={16} /> All notes</Link><div className="error-panel"><AlertTriangle size={28} /><p className="step-label">NOTE UNAVAILABLE</p><h1>We couldn’t open this note.</h1><p>{error}</p><button className="primary-button" onClick={() => void load()}><RotateCcw size={17} /> Try again</button></div></main>;
  }

  if (!note) {
    return <main className="detail-page"><div className="detail-skeleton"><div className="skeleton-line short" /><div className="skeleton-line title" /><div className="skeleton-card" /></div></main>;
  }

  const steps = progressSteps(note);
  const current = steps.findIndex((step) => step.key === note.status);
  const meta = statusMeta(note.status);

  return (
    <main className="detail-page">
      <div className="breadcrumb"><Link href="/"><ArrowLeft size={15} /> Notes</Link><ChevronRight size={14} /><span>{note.original_filename}</span></div>

      <motion.header className="note-header" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <div className={`note-hero-icon status-surface-${note.status}`}><FileAudio size={28} /></div>
        <div className="note-title-block">
          <div className="note-kicker"><span>Audio note</span><i>·</i><time>{formatDate(note.created_at)}</time></div>
          <h1>{note.original_filename}</h1>
          <p>{meta.detail}</p>
          <div className="note-meta-row">
            <StatusBadge status={note.status} />
            {note.detected_language_name && <span className="meta-chip"><Languages size={14} /> {note.detected_language_name}{note.is_code_switched ? " · Code-switched" : ""}</span>}
          </div>
        </div>
      </motion.header>

      <AnimatePresence mode="wait">
        {note.status === "failed" ? (
          <motion.section className="error-panel" role="alert" key="failed" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="panel-icon danger"><AlertTriangle size={24} /></div>
            <div><p className="step-label">PROCESSING NEEDS ATTENTION</p><h2>This recording needs another try.</h2><p>{note.error_message ?? "We could not process this audio."}</p></div>
            <button className="primary-button" onClick={() => void retry()} disabled={retrying}>{retrying ? <LoaderCircle className="spin" size={17} /> : <RotateCcw size={17} />}{retrying ? "Queueing…" : "Retry processing"}</button>
          </motion.section>
        ) : note.status !== "completed" ? (
          <motion.section className="processing-panel" key="processing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="processing-heading"><div><div className="eyebrow"><LoaderCircle className="spin" size={14} /> Processing in the background</div><h2>Your note is taking shape.</h2><p>You can leave this page safely. We’ll keep working and your result will stay in the library.</p></div><StatusBadge status={note.status} /></div>
            <div className="progress-steps" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
              {steps.map((step, index) => {
                const finished = current > index || note.status === "completed";
                const active = current === index;
                return <div className={`progress-step ${finished ? "finished" : ""} ${active ? "active" : ""}`} key={step.key}><div className="step-marker">{finished ? <Check size={15} /> : active ? <LoaderCircle className="spin" size={15} /> : index + 1}</div><strong>{step.label}</strong><small>{step.detail}</small></div>;
              })}
            </div>
          </motion.section>
        ) : (
          <motion.div className="results-shell" key="results" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="results-intro"><div><div className="eyebrow"><Check size={14} /> Processing complete</div><h2>Your recording is ready to use.</h2><p>Start with the summary, then refer to the original transcript for exact wording.</p></div></div>
            <div className="result-grid">
              <section className="result-card summary-card">
                <header><div className="result-title"><span><Sparkles size={19} /></span><div><p className="step-label">AI SUMMARY</p><h3>Key ideas and next steps</h3></div></div><IconButton label="Copy summary" onClick={() => void copyText("Summary", note.summary)}><Clipboard size={16} /></IconButton></header>
                <div className="prose">{note.summary}</div>
              </section>
              <section className="result-card transcript-card">
                <header><div className="result-title"><span><TextQuote size={19} /></span><div><p className="step-label">ORIGINAL TRANSCRIPT</p><h3>What was said</h3></div></div><IconButton label="Copy transcript" onClick={() => void copyText("Transcript", note.transcript)}><Clipboard size={16} /></IconButton></header>
                <div className="transcript">{note.transcript}</div>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {["completed", "failed"].includes(note.status) && (
        <section className="language-correction">
          <div className="correction-copy"><div className="panel-icon"><WandSparkles size={22} /></div><div><p className="step-label">FINE-TUNE THE RESULT</p><h2>Wrong language or output?</h2><p>Choose the spoken language and summary language, then reuse the audio already stored—no upload required.</p></div></div>
          <div className="correction-fields">
            <label className="field-label"><span>Spoken language</span><select value={retrySource} onChange={(event) => setRetrySource(event.target.value)}><option value="auto">Auto-detect language</option>{LANGUAGES.map((language) => <option value={language.code} key={language.code}>{language.name}</option>)}</select></label>
            <label className="field-label"><span>Summary language</span><select value={retrySummary} onChange={(event) => setRetrySummary(event.target.value)}><option value="same">Same as recording</option>{LANGUAGES.map((language) => <option value={language.code} key={language.code}>{language.name}</option>)}</select></label>
            <button className="secondary-button" disabled={retrying} onClick={() => void retry({ source_language: retrySource, summary_language: retrySummary })}>{retrying ? <LoaderCircle className="spin" size={17} /> : <RotateCcw size={17} />}{retrying ? "Queueing…" : "Retranscribe note"}</button>
          </div>
        </section>
      )}
      {error && <p className="error-banner" role="alert">{error}</p>}
    </main>
  );
}
