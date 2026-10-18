export type NoteStatus = "queued" | "detecting_language" | "transcribing" | "summarizing" | "completed" | "failed";

export interface ActionItem {
  task: string;
  owner?: string | null;
  priority: "low" | "medium" | "high";
  completed?: boolean;
}

export interface KeyDecision {
  decision: string;
  rationale?: string | null;
}

export interface SpeakerTurn {
  speaker: string;
  text: string;
}

export interface StructuredData {
  title?: string | null;
  overview: string;
  key_points: string[];
  action_items: ActionItem[];
  decisions: KeyDecision[];
  topics: string[];
  speakers?: string[];
  speaker_turns?: SpeakerTurn[];
}

export type Note = {
  id: string;
  user_id: string;
  title?: string | null;
  original_filename: string;
  media_type?: string;
  size_bytes: number;
  duration_seconds?: number | null;
  status: NoteStatus;
  source_language: string;
  summary_language: string;
  detected_language?: string | null;
  detected_language_name?: string | null;
  is_code_switched?: boolean | null;
  transcript?: string | null;
  summary?: string | null;
  structured_data?: StructuredData | null;
  error_code?: string | null;
  error_message?: string | null;
  snippet?: string | null;
  attempt_count?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
};

export interface UserProfile {
  id: string;
  email: string | null;
  is_anonymous: boolean;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface LibraryChatSource {
  note_id: string;
  title: string;
  created_at: string;
}

export interface LibraryChatResponse {
  reply: string;
  sources: LibraryChatSource[];
}
