import type { Note, StructuredData, UserProfile } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

const AUTH_STORAGE_KEY = "audio_notes_auth_token";
const GUEST_STORAGE_KEY = "audio_notes_guest_id";

export function getAuthToken(): string {
  if (typeof window === "undefined") {
    return "guest_ssr";
  }
  const token = localStorage.getItem(AUTH_STORAGE_KEY);
  if (token) return token;

  let guestId = localStorage.getItem(GUEST_STORAGE_KEY);
  if (!guestId) {
    guestId = `guest_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem(GUEST_STORAGE_KEY, guestId);
  }
  return guestId;
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(AUTH_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${getAuthToken()}`);
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) message = payload.detail;
    } catch {}
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export function getCurrentUser(): Promise<UserProfile> {
  return request<UserProfile>("/auth/me");
}

export function listNotes(): Promise<Note[]> {
  return request<Note[]>("/notes");
}

export function getNote(id: string): Promise<Note> {
  return request<Note>(`/notes/${id}`);
}

export function updateNote(
  id: string,
  payload: { title?: string | null; structured_data?: StructuredData | null },
): Promise<Note> {
  return request<Note>(`/notes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateNoteTitle(id: string, title: string): Promise<Note> {
  return updateNote(id, { title });
}

export function deleteNote(id: string): Promise<{ status: string; id: string }> {
  return request<{ status: string; id: string }>(`/notes/${id}`, {
    method: "DELETE",
  });
}

export function getNoteAudioUrl(id: string): string {
  return `${API_URL}/notes/${id}/audio`;
}

export function retryNote(
  id: string,
  options?: { source_language?: string; summary_language?: string },
): Promise<Note> {
  return request<Note>(`/notes/${id}/retry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options ?? {}),
  });
}

export function uploadNote(
  file: File,
  options: { sourceLanguage: string; summaryLanguage: string; title?: string },
  onProgress: (value: number) => void,
): Promise<Note> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("audio", file);
    if (options.title) {
      form.append("title", options.title);
    }
    form.append("source_language", options.sourceLanguage);
    form.append("summary_language", options.summaryLanguage);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/notes`);
    xhr.setRequestHeader("Authorization", `Bearer ${getAuthToken()}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error("The upload was interrupted. Check your connection and retry."));
    xhr.onload = () => {
      let payload: unknown;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(payload as Note);
      else reject(new Error((payload as { detail?: string } | null)?.detail ?? "Upload failed. Please retry."));
    };
    xhr.send(form);
  });
}
