"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckSquare,
  ChevronRight,
  Clipboard,
  Copy,
  Download,
  Edit2,
  FileAudio,
  FileText,
  Languages,
  ListChecks,
  LoaderCircle,
  Play,
  Printer,
  Radio,
  RotateCcw,
  Scale,
  Sparkles,
  Square,
  Tag,
  TextQuote,
  Trash2,
  Volume2,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteNote,
  getNote,
  getNoteAudioUrl,
  getNoteStreamUrl,
  retryNote,
  updateNote,
  updateNoteTitle,
} from "@/lib/api";
import type { Note, NoteStatus } from "@/lib/types";
import { LANGUAGES } from "@/lib/languages";
import { downloadFile, generateMarkdown, generatePlainText } from "@/lib/export";
import { formatTime, parseTranscriptSegments } from "@/lib/transcript";
import { AskAiAssistant } from "@/components/ask-ai-assistant";
import { IconButton } from "@/components/icon-button";
import { StatusBadge, statusMeta } from "@/components/status-badge";
import { WaveformPlayer } from "@/components/waveform-player";

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
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [retrySource, setRetrySource] = useState("auto");
  const [retrySummary, setRetrySummary] = useState("same");
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0);
  const [targetSeekTime, setTargetSeekTime] = useState<number | null>(null);
  const [transcriptMode, setTranscriptMode] = useState<"karaoke" | "plain">("karaoke");

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

    let eventSource: EventSource | null = null;
    let fallbackTimer: number | null = null;

    try {
      const streamUrl = getNoteStreamUrl(id);
      eventSource = new EventSource(streamUrl);

      eventSource.addEventListener("note_update", (e) => {
        try {
          const updatedNote = JSON.parse(e.data) as Note;
          setNote(updatedNote);
          setError(null);
        } catch {
          void load();
        }
      });

      eventSource.addEventListener("complete", () => {
        eventSource?.close();
        void load();
      });

      eventSource.onerror = () => {
        eventSource?.close();
        if (!fallbackTimer) {
          fallbackTimer = window.setInterval(() => void load(), 2500);
        }
      };
    } catch {
      fallbackTimer = window.setInterval(() => void load(), 2500);
    }

    return () => {
      eventSource?.close();
      if (fallbackTimer) window.clearInterval(fallbackTimer);
    };
  }, [id, note?.status, load]);


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

  async function handleSaveTitle() {
    if (!note || !titleInput.trim()) {
      setEditingTitle(false);
      return;
    }
    try {
      const updated = await updateNoteTitle(note.id, titleInput.trim());
      setNote(updated);
      toast.success("Note title updated");
    } catch {
      toast.error("Could not update title");
    } finally {
      setEditingTitle(false);
    }
  }

  async function handleDeleteNote() {
    if (!window.confirm("Are you sure you want to delete this recording and its transcript?")) return;
    setDeleting(true);
    try {
      await deleteNote(id);
      toast.success("Note deleted");
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete note");
      setDeleting(false);
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

  async function toggleActionItem(index: number) {
    if (!note || !note.structured_data || !note.structured_data.action_items) return;
    const currentItems = [...note.structured_data.action_items];
    const target = currentItems[index];
    if (!target) return;

    currentItems[index] = { ...target, completed: !target.completed };
    const updatedStructured = {
      ...note.structured_data,
      action_items: currentItems,
    };

    setNote({ ...note, structured_data: updatedStructured });
    try {
      await updateNote(note.id, { structured_data: updatedStructured });
      toast.success(target.completed ? "Marked task incomplete" : "Action item completed!");
    } catch {
      toast.error("Could not sync task status");
    }
  }

  function handleExportMarkdown() {
    if (!note) return;
    const md = generateMarkdown(note);
    const safeTitle = (note.title || note.original_filename).replace(/[^a-z0-9_-]/gi, "_");
    downloadFile(md, `${safeTitle}.md`, "text/markdown");
    toast.success("Downloaded Markdown notes");
  }

  function handleExportText() {
    if (!note) return;
    const txt = generatePlainText(note);
    const safeTitle = (note.title || note.original_filename).replace(/[^a-z0-9_-]/gi, "_");
    downloadFile(txt, `${safeTitle}.txt`, "text/plain");
    toast.success("Downloaded Plain Text notes");
  }

  function handlePrintPDF() {
    window.print();
  }

  async function handleCopyMarkdown() {
    if (!note) return;
    const md = generateMarkdown(note);
    await navigator.clipboard.writeText(md);
    toast.success("Copied full structured notes to clipboard!");
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
      <div className="breadcrumb"><Link href="/"><ArrowLeft size={15} /> Notes</Link><ChevronRight size={14} /><span>{note.title || note.original_filename}</span></div>

      <motion.header className="note-header" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <div className={`note-hero-icon status-surface-${note.status}`}><FileAudio size={28} /></div>
        <div className="note-title-block">
          <div className="note-kicker"><span>Audio note</span><i>·</i><time>{formatDate(note.created_at)}</time></div>
          <div className="flex items-center gap-3">
            {editingTitle ? (
              <form onSubmit={(e) => { e.preventDefault(); void handleSaveTitle(); }} className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  autoFocus
                  onBlur={() => void handleSaveTitle()}
                  className="px-2 py-1 text-xl font-bold border border-slate-300 rounded bg-white text-slate-800"
                />
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h1>{note.title || note.original_filename}</h1>
                <button
                  type="button"
                  onClick={() => { setTitleInput(note.title || note.original_filename); setEditingTitle(true); }}
                  className="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                  title="Rename note"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}
          </div>
          <p>{meta.detail}</p>
          <div className="note-meta-row">
            <StatusBadge status={note.status} />
            {note.detected_language_name && <span className="meta-chip"><Languages size={14} /> {note.detected_language_name}{note.is_code_switched ? " · Code-switched" : ""}</span>}
            <button
              onClick={() => void handleDeleteNote()}
              disabled={deleting}
              className="meta-chip text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 transition cursor-pointer flex items-center gap-1 ml-auto"
              title="Delete this note"
            >
              <Trash2 size={13} />
              <span>{deleting ? "Deleting…" : "Delete note"}</span>
            </button>
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
            <div className="results-intro">
              <div>
                <div className="eyebrow"><Check size={14} /> Processing complete</div>
                <h2>Your recording is ready to use.</h2>
                <p>Listen to playback, review action items, or examine strategic takeaways.</p>
              </div>
            </div>

            <WaveformPlayer
              audioUrl={getNoteAudioUrl(note.id)}
              filename={note.original_filename}
              onTimeUpdate={setPlayerCurrentTime}
              seekToTime={targetSeekTime}
            />

            {(() => {
              const structured = note.structured_data;
              const actionItems = structured?.action_items ?? [];
              const completedTasks = actionItems.filter((item) => item.completed).length;
              const totalTasks = actionItems.length;
              const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
              const decisions = structured?.decisions ?? [];
              const topics = structured?.topics ?? [];
              const wordCount = note.transcript ? note.transcript.trim().split(/\s+/).filter(Boolean).length : 0;
              const readTimeMinutes = Math.max(1, Math.round(wordCount / 180));

              return (
                <>
                  <div className="intelligence-toolbar">
                    <div className="topic-pills-row">
                      {topics.length > 0 ? (
                        topics.map((topic, i) => (
                          <span key={i} className="topic-pill">
                            <Tag size={12} /> {topic}
                          </span>
                        ))
                      ) : (
                        <span className="topic-pill">
                          <Sparkles size={12} /> AI Intelligence Studio
                        </span>
                      )}
                    </div>
                    <div className="export-actions-row">
                      <button
                        type="button"
                        onClick={handleExportMarkdown}
                        className="export-btn"
                        title="Export Markdown notes (.md)"
                      >
                        <Download size={13} /> Markdown
                      </button>
                      <button
                        type="button"
                        onClick={handleExportText}
                        className="export-btn"
                        title="Export Plain Text (.txt)"
                      >
                        <FileText size={13} /> Text
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintPDF}
                        className="export-btn"
                        title="Print or Save PDF"
                      >
                        <Printer size={13} /> Print / PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCopyMarkdown()}
                        className="export-btn primary"
                        title="Copy formatted markdown to clipboard"
                      >
                        <Copy size={13} /> Copy Note
                      </button>
                    </div>
                  </div>

                  <div className="result-grid">
                    <section className="result-card summary-card">
                      <header>
                        <div className="result-title">
                          <span><Sparkles size={19} /></span>
                          <div>
                            <p className="step-label">AI EXECUTIVE SUMMARY</p>
                            <h3>Key ideas and next steps</h3>
                          </div>
                        </div>
                        <IconButton label="Copy summary" onClick={() => void copyText("Summary", note.summary)}>
                          <Clipboard size={16} />
                        </IconButton>
                      </header>
                      {structured ? (
                        <div className="prose">
                          <p style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 16 }}>
                            {structured.overview}
                          </p>
                          {structured.key_points && structured.key_points.length > 0 && (
                            <div>
                              <strong style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--violet-dark)" }}>
                                Key Highlights
                              </strong>
                              <ul className="key-points-list">
                                {structured.key_points.map((pt, i) => (
                                  <li key={i} className="key-point-item">
                                    <span className="key-point-bullet" />
                                    <span>{pt}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="prose">{note.summary}</div>
                      )}
                    </section>

                    {structured && actionItems.length > 0 && (
                      <section className="result-card action-items-card">
                        <header>
                          <div className="result-title" style={{ width: "100%" }}>
                            <span><ListChecks size={19} /></span>
                            <div className="action-progress-wrap">
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <p className="step-label" style={{ margin: 0 }}>EXECUTION ROADMAP</p>
                                <small style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)" }}>
                                  {completedTasks} of {totalTasks} completed ({progressPct}%)
                                </small>
                              </div>
                              <h3 style={{ margin: "2px 0 4px" }}>Action Items Checklist</h3>
                              <div className="action-progress-bar">
                                <div className="action-progress-fill" style={{ width: `${progressPct}%` }} />
                              </div>
                            </div>
                          </div>
                        </header>
                        <div className="action-items-list">
                          {actionItems.map((item, index) => {
                            const isDone = Boolean(item.completed);
                            return (
                              <div
                                key={index}
                                className={`action-item-row ${isDone ? "completed" : ""}`}
                                onClick={() => void toggleActionItem(index)}
                              >
                                <button
                                  type="button"
                                  className="action-item-checkbox"
                                  aria-label={`Toggle task: ${item.task}`}
                                >
                                  {isDone ? <CheckSquare size={18} /> : <Square size={18} />}
                                </button>
                                <div className="action-item-body">
                                  <div className="action-item-text">{item.task}</div>
                                  <div className="action-item-meta">
                                    <span className={`priority-pill priority-${item.priority || "medium"}`}>
                                      {item.priority || "medium"}
                                    </span>
                                    {item.owner && (
                                      <span className="owner-pill">@{item.owner}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {structured && decisions.length > 0 && (
                      <section className="result-card">
                        <header>
                          <div className="result-title">
                            <span><Scale size={19} /></span>
                            <div>
                              <p className="step-label">STRATEGIC CHOICES</p>
                              <h3>Key Decisions & Rationale</h3>
                            </div>
                          </div>
                        </header>
                        <div className="decisions-list">
                          {decisions.map((dec, i) => (
                            <div key={i} className="decision-item-card">
                              <div className="decision-statement">{dec.decision}</div>
                              {dec.rationale && (
                                <div className="decision-rationale">Rationale: {dec.rationale}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    <section className="result-card transcript-card">
                      <header>
                        <div className="result-title">
                          <span><TextQuote size={19} /></span>
                          <div>
                            <p className="step-label">INTERACTIVE TRANSCRIPT</p>
                            <h3>What was said</h3>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="transcript-mode-switch">
                            <button
                              type="button"
                              className={`transcript-mode-pill ${transcriptMode === "karaoke" ? "active" : ""}`}
                              onClick={() => setTranscriptMode("karaoke")}
                              title="Click any segment to jump audio playback"
                            >
                              <Play size={10} /> Sync Scrub
                            </button>
                            <button
                              type="button"
                              className={`transcript-mode-pill ${transcriptMode === "plain" ? "active" : ""}`}
                              onClick={() => setTranscriptMode("plain")}
                              title="Plain text view"
                            >
                              Plain
                            </button>
                          </div>
                          {wordCount > 0 && (
                            <span className="transcript-meta-info">
                              {wordCount} words · ~{readTimeMinutes} min read
                            </span>
                          )}
                          <IconButton label="Copy transcript" onClick={() => void copyText("Transcript", note.transcript)}>
                            <Clipboard size={16} />
                          </IconButton>
                        </div>
                      </header>
                      {transcriptMode === "karaoke" ? (
                        <div className="karaoke-segments-list">
                          {parseTranscriptSegments(note.transcript, note.duration_seconds).map((seg) => {
                            const isActive = playerCurrentTime >= seg.start && playerCurrentTime < seg.end;
                            return (
                              <div
                                key={seg.id}
                                className={`karaoke-segment-row ${isActive ? "active" : ""}`}
                                onClick={() => setTargetSeekTime(seg.start)}
                              >
                                <button
                                  type="button"
                                  className={`karaoke-time-badge ${isActive ? "active" : ""}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTargetSeekTime(seg.start);
                                  }}
                                  title={`Seek to ${formatTime(seg.start)}`}
                                >
                                  <Play size={10} />
                                  <span>{formatTime(seg.start)}</span>
                                </button>
                                <p className="karaoke-segment-text">
                                  {seg.text}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="transcript">{note.transcript}</div>
                      )}
                    </section>

                    <AskAiAssistant noteId={note.id} hasTranscript={Boolean(note.transcript)} />
                  </div>
                </>
              );
            })()}
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
