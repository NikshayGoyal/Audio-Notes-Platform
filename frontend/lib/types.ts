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

export interface ChapterMarker {
  timestamp_seconds: number;
  title: string;
  summary?: string | null;
}

export interface AudioBookmark {
  id: string;
  timestamp_seconds: number;
  label: string;
  note?: string | null;
  created_at?: string | null;
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
  chapters?: ChapterMarker[];
  bookmarks?: AudioBookmark[];
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

export interface ActionItemsAnalytics {
  total: number;
  completed: number;
  pending: number;
  completion_rate_pct: number;
  high_priority: number;
  medium_priority: number;
  low_priority: number;
  by_owner: Record<string, number>;
}

export interface TopicFrequency {
  topic: string;
  count: number;
}

export interface SpeakerFrequency {
  speaker: string;
  count: number;
}

export interface LanguageDistribution {
  language: string;
  count: number;
}

export interface RecentDecision {
  note_id: string;
  note_title: string;
  decision: string;
  rationale?: string | null;
}

export interface AnalyticsResponse {
  total_notes: number;
  completed_notes: number;
  failed_notes: number;
  active_notes: number;
  total_duration_seconds: number;
  total_words: number;
  avg_words_per_minute: number;
  action_items: ActionItemsAnalytics;
  total_decisions: number;
  recent_decisions: RecentDecision[];
  top_topics: TopicFrequency[];
  top_speakers: SpeakerFrequency[];
  languages: LanguageDistribution[];
  code_switched_notes: number;
}

export interface DatabasePoolMetrics {
  size: number;
  checked_in: number;
  checked_out: number;
  overflow: number;
}

export interface TelemetryResponse {
  status: string;
  uptime_seconds: number;
  system_memory_mb: number;
  database_connected: boolean;
  database_pool: DatabasePoolMetrics;
  rate_limiter_active_clients: number;
  total_notes_processed: number;
  completed_notes: number;
  total_audio_bytes: number;
  total_audio_duration_seconds: number;
  services_health: Record<string, string>;
}

