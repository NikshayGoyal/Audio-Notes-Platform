import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { getNote } from "@/lib/api";
import type { Note } from "@/lib/types";
import { AppProviders } from "./app-providers";
import { NoteDetail } from "./note-detail";

vi.mock("@/lib/api", () => ({
  getNote: vi.fn(),
  retryNote: vi.fn(),
}));

const completedNote: Note = {
  id: "8b441213-1b18-4664-a727-086f8eca5371",
  original_filename: "team-sync.wav",
  size_bytes: 2048,
  status: "completed",
  source_language: "auto",
  summary_language: "same",
  detected_language: "en-IN",
  detected_language_name: "English (India)",
  transcript: "The team agreed to ship the release on Friday.",
  summary: "OVERVIEW\nThe team confirmed the Friday release.",
  created_at: "2026-10-03T10:00:00Z",
  updated_at: "2026-10-03T10:01:00Z",
};

beforeEach(() => {
  vi.mocked(getNote).mockResolvedValue(completedNote);
});

test("clearly presents the completed summary and original transcript", async () => {
  render(<AppProviders><NoteDetail id={completedNote.id} /></AppProviders>);

  expect(await screen.findByRole("heading", { name: "Your recording is ready to use." })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Key ideas and next steps" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "What was said" })).toBeInTheDocument();
  expect(screen.getByText(/The team confirmed the Friday release/)).toBeInTheDocument();
  expect(screen.getByText(completedNote.transcript!)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Copy summary" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Copy transcript" })).toBeInTheDocument();
});
