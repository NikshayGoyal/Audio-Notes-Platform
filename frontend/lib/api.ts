import type { Note } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...init, cache: "no-store" });
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

export function listNotes(): Promise<Note[]> {
  return request<Note[]>("/notes");
}

export function getNote(id: string): Promise<Note> {
  return request<Note>(`/notes/${id}`);
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
  options: { sourceLanguage: string; summaryLanguage: string },
  onProgress: (value: number) => void,
): Promise<Note> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("audio", file);
    form.append("source_language", options.sourceLanguage);
    form.append("summary_language", options.summaryLanguage);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/notes`);
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
