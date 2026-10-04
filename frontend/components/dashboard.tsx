"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  AudioLines,
  Check,
  ChevronRight,
  Clock3,
  FileAudio,
  Globe2,
  History,
  Languages,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { listNotes, uploadNote } from "@/lib/api";
import type { Note } from "@/lib/types";
import { LANGUAGES } from "@/lib/languages";
import { StatusBadge, statusMeta } from "@/components/status-badge";
import { IconButton } from "@/components/icon-button";

const MAX_BYTES = 100 * 1024 * 1024;
const ALLOWED = ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg", "audio/flac", "audio/x-m4a"];
const ALLOWED_EXTENSIONS = [".mp3", ".m4a", ".mp4", ".wav", ".webm", ".ogg", ".oga", ".flac"];

function sizeLabel(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function Dashboard() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [summaryLanguage, setSummaryLanguage] = useState("same");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (notify = false) => {
    try {
      setNotes(await listNotes());
      setError(null);
      if (notify) toast.success("Your note library is up to date.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load notes.";
      setError(message);
      if (notify) toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!notes.some((note) => !["completed", "failed"].includes(note.status))) return;
    const timer = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(timer);
  }, [notes, refresh]);

  function choose(candidate?: File) {
    setError(null);
    if (!candidate) return;
    const knownExtension = ALLOWED_EXTENSIONS.some((extension) => candidate.name.toLowerCase().endsWith(extension));
    let message: string | null = null;
    if (!ALLOWED.includes(candidate.type) && !knownExtension) message = "Choose an MP3, M4A, WAV, WebM, OGG, or FLAC audio file.";
    else if (candidate.size === 0) message = "That file is empty.";
    else if (candidate.size > MAX_BYTES) message = "The maximum upload size is 100 MB.";
    if (message) {
      setError(message);
      toast.error(message);
      return;
    }
    setFile(candidate);
    toast.success("Recording ready to upload.", { description: `${candidate.name} · ${sizeLabel(candidate.size)}` });
  }

  async function submit() {
    if (!file || uploading) return;
    setUploading(true);
    setProgress(0);
    setError(null);
    try {
      const note = await uploadNote(file, { sourceLanguage, summaryLanguage }, setProgress);
      setNotes((current) => [note, ...current.filter((item) => item.id !== note.id)]);
      toast.success("Upload complete — processing has started.", { description: "Opening the live progress page now." });
      router.push(`/notes/${note.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setError(message);
      toast.error("Upload did not complete", { description: message });
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="dashboard-page">
      <section className="hero-shell">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <div className="eyebrow"><Sparkles size={14} /> AI-powered audio workspace</div>
          <h1>From spoken words<br />to <span>clear next steps.</span></h1>
          <p className="lede">Upload a conversation, lecture, or voice note. Get an accurate transcript and a structured summary—without waiting on the page.</p>
          <div className="trust-row" aria-label="Product capabilities">
            <span><Globe2 size={16} /> 11 supported languages</span>
            <span><LockKeyhole size={16} /> Private audio storage</span>
            <span><History size={16} /> Durable note history</span>
          </div>
        </motion.div>
        <motion.div
          className="hero-visual"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          aria-hidden="true"
        >
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="wave-card">
            <span className="live-dot" />
            <div className="waveform">{[18, 34, 22, 52, 68, 31, 46, 76, 41, 59, 27, 50, 72, 36, 20, 44, 62, 30].map((height, index) => <i style={{ height }} key={index} />)}</div>
            <div><strong>Capture the signal</strong><small>We’ll handle the structure.</small></div>
          </div>
        </motion.div>
      </section>

      <motion.section
        className="upload-workspace"
        aria-labelledby="upload-title"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="workspace-header">
          <div className="section-number">01</div>
          <div><p className="step-label">CREATE A NOTE</p><h2 id="upload-title">Add a recording</h2><p>Three simple choices, then we’ll take it from here.</p></div>
          <div className="format-chip"><FileAudio size={15} /> MP3 · M4A · WAV · WebM · OGG · FLAC</div>
        </div>

        <div className="upload-grid">
          <div className="upload-stage file-stage">
            <div className="stage-heading"><span>1</span><div><strong>Choose your audio</strong><small>Up to 100 MB</small></div></div>
            <div
              className={`drop-zone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
              onDragOver={(event: DragEvent) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event: DragEvent) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files[0]); }}
            >
              <input ref={fileInput} type="file" accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg,.flac" onChange={(event: ChangeEvent<HTMLInputElement>) => choose(event.target.files?.[0])} />
              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div className="selected-file" key="selected" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                    <div className="file-icon"><AudioLines size={25} /></div>
                    <div><strong>{file.name}</strong><span>{sizeLabel(file.size)} · Ready to upload</span></div>
                    <IconButton label="Remove selected file" onClick={() => { setFile(null); if (fileInput.current) fileInput.current.value = ""; }}><X size={17} /></IconButton>
                  </motion.div>
                ) : (
                  <motion.button className="drop-prompt" type="button" onClick={() => fileInput.current?.click()} key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <span className="upload-symbol"><UploadCloud size={27} /></span>
                    <strong>Drop a recording here</strong>
                    <span>or <u>browse your files</u></span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="upload-stage language-stage">
            <div className="stage-heading"><span>2</span><div><strong>Set the language</strong><small>Auto-detect is recommended</small></div></div>
            <label className="field-label">
              <span><Languages size={15} /> Spoken language</span>
              <select value={sourceLanguage} onChange={(event) => setSourceLanguage(event.target.value)}>
                <option value="auto">Auto-detect language</option>
                {LANGUAGES.map((language) => <option value={language.code} key={language.code}>{language.name}</option>)}
              </select>
              <small>Know the language? Select it to skip detection and finish faster.</small>
            </label>
            <label className="field-label">
              <span><Sparkles size={15} /> Summary language</span>
              <select value={summaryLanguage} onChange={(event) => setSummaryLanguage(event.target.value)}>
                <option value="same">Same as the recording</option>
                {LANGUAGES.map((language) => <option value={language.code} key={language.code}>{language.name}</option>)}
              </select>
              <small>Your transcript always remains in the original spoken language.</small>
            </label>
          </div>
        </div>

        <div className="submit-stage">
          <div className="stage-heading"><span>3</span><div><strong>Create your note</strong><small>You’ll be taken to live processing progress.</small></div></div>
          <button className="primary-button" disabled={!file || uploading} onClick={() => void submit()}>
            {uploading ? <><LoaderCircle className="spin" size={18} /> Uploading {progress}%</> : <><Sparkles size={18} /> Create audio note <ArrowRight size={18} /></>}
          </button>
        </div>
        {uploading && <div className="upload-progress" aria-live="polite"><span style={{ width: `${progress}%` }} /><p>Securely uploading your recording… {progress}%</p></div>}
        {error && <p className="error-banner" role="alert">{error}</p>}
      </motion.section>

      <section className="notes-section" aria-labelledby="notes-title">
        <div className="section-heading">
          <div className="heading-with-number"><div className="section-number">02</div><div><p className="step-label">YOUR LIBRARY</p><h2 id="notes-title">Recent audio notes</h2><p>Reopen any transcript or follow processing in real time.</p></div></div>
          <button className="secondary-button button-small" onClick={() => void refresh(true)}><RefreshCw size={15} /> Refresh</button>
        </div>
        {loading ? (
          <div className="note-list" aria-label="Loading notes">{[0, 1, 2].map((item) => <div className="note-skeleton" key={item}><i /><div><span /><small /></div><b /></div>)}</div>
        ) : notes.length === 0 ? (
          <div className="empty-state"><div className="empty-icon"><AudioLines size={30} /></div><strong>No recordings yet.</strong><span>Your first transcript and summary will appear here.</span><button className="text-button" onClick={() => fileInput.current?.click()}>Choose your first recording <ArrowRight size={15} /></button></div>
        ) : (
          <div className="note-list">
            {notes.map((note, index) => {
              const meta = statusMeta(note.status);
              return (
                <motion.div key={note.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.04, 0.2) }}>
                  <Link className="note-row" href={`/notes/${note.id}`}>
                    <div className={`note-icon status-surface-${note.status}`}><FileAudio size={20} /></div>
                    <span className="note-main"><strong>{note.original_filename}</strong><small><Clock3 size={13} /> {dateLabel(note.created_at)} <i>·</i> {sizeLabel(note.size_bytes)}</small><em>{meta.detail}</em></span>
                    {note.detected_language_name && <span className="language-chip">{note.detected_language_name}</span>}
                    <StatusBadge status={note.status} compact />
                    <ChevronRight className="row-arrow" size={19} />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
