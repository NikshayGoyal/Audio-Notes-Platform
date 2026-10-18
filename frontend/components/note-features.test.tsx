import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { Dashboard } from "./dashboard";
import { NoteDetail } from "./note-detail";
import { AppProviders } from "./app-providers";
import * as api from "@/lib/api";
import type { Note } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof api>("@/lib/api");
  return {
    ...actual,
    listNotes: vi.fn(),
    getNote: vi.fn(),
    updateNoteTitle: vi.fn(),
    deleteNote: vi.fn(),
    getNoteAudioUrl: vi.fn((id: string) => `http://localhost:8000/api/notes/${id}/audio`),
  };
});

const sampleNotes: Note[] = [
  {
    id: "note-1",
    user_id: "user_test",
    title: "System Architecture Sync",
    original_filename: "sync.mp3",
    size_bytes: 512000,
    status: "completed",
    source_language: "en-IN",
    summary_language: "en-IN",
    detected_language_name: "English (India)",
    transcript: "We will migrate to PostgreSQL and pgvector for our audio storage.",
    summary: "PostgreSQL migration planned.",
    created_at: "2026-10-18T10:00:00Z",
    updated_at: "2026-10-18T10:05:00Z",
  },
  {
    id: "note-2",
    user_id: "user_test",
    title: null,
    original_filename: "interview.wav",
    size_bytes: 1024000,
    status: "completed",
    source_language: "hi-IN",
    summary_language: "hi-IN",
    detected_language_name: "Hindi",
    transcript: "Yeh ek test transcript hai.",
    summary: "Parikshan saransh.",
    created_at: "2026-10-18T11:00:00Z",
    updated_at: "2026-10-18T11:05:00Z",
  },
];

beforeEach(() => {
  vi.mocked(api.listNotes).mockResolvedValue(sampleNotes);
  vi.mocked(api.getNote).mockResolvedValue(sampleNotes[0]);
});

test("dashboard filters notes by search query", async () => {
  render(<Dashboard />);
  expect(await screen.findByText("System Architecture Sync")).toBeInTheDocument();
  expect(screen.getByText("interview.wav")).toBeInTheDocument();

  const searchInput = screen.getByPlaceholderText("Filter notes…");
  fireEvent.change(searchInput, { target: { value: "Architecture" } });

  expect(screen.getByText("System Architecture Sync")).toBeInTheDocument();
  expect(screen.queryByText("interview.wav")).not.toBeInTheDocument();
});

test("note detail displays audio player element with source URL", async () => {
  render(<AppProviders><NoteDetail id="note-1" /></AppProviders>);
  expect(await screen.findByText("Audio Playback")).toBeInTheDocument();
  const audioElement = document.querySelector("audio");
  expect(audioElement).toBeInTheDocument();
  expect(audioElement?.getAttribute("src")).toContain("/api/notes/note-1/audio");
});
