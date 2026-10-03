import { AlertCircle, CheckCircle2, Clock3, Languages, Sparkles, TextSearch } from "lucide-react";
import type { NoteStatus } from "@/lib/types";

const STATUS_META: Record<NoteStatus, { label: string; detail: string; icon: typeof Clock3 }> = {
  queued: { label: "Queued", detail: "Waiting to begin", icon: Clock3 },
  detecting_language: { label: "Detecting language", detail: "Listening for the spoken language", icon: Languages },
  transcribing: { label: "Transcribing", detail: "Gnani is turning speech into text", icon: TextSearch },
  summarizing: { label: "Summarizing", detail: "Gemini is shaping the key ideas", icon: Sparkles },
  completed: { label: "Ready", detail: "Transcript and summary are ready", icon: CheckCircle2 },
  failed: { label: "Needs attention", detail: "Processing did not finish", icon: AlertCircle },
};

export function statusMeta(status: NoteStatus) {
  return STATUS_META[status];
}

export function StatusBadge({ status, compact = false }: { status: NoteStatus; compact?: boolean }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={`status-badge status-${status} ${compact ? "status-compact" : ""}`}>
      <Icon size={compact ? 13 : 15} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
