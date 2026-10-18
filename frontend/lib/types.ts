export type NoteStatus = "queued" | "detecting_language" | "transcribing" | "summarizing" | "completed" | "failed";

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
  error_code?: string | null;
  error_message?: string | null;
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

