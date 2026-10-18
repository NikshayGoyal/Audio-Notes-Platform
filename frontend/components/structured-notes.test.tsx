import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
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
    getNote: vi.fn(),
    updateNote: vi.fn(),
    updateNoteTitle: vi.fn(),
    deleteNote: vi.fn(),
    getNoteAudioUrl: vi.fn((id: string) => `http://localhost:8000/api/notes/${id}/audio`),
  };
});

const structuredNote: Note = {
  id: "structured-note-1",
  user_id: "user_pro",
  title: "Q3 Sprint Planning",
  original_filename: "planning.mp3",
  size_bytes: 4096,
  status: "completed",
  source_language: "en-IN",
  summary_language: "en-IN",
  detected_language_name: "English (India)",
  transcript: "We will migrate to PostgreSQL and setup pgvector for semantic search.",
  summary: "Migrate database and add vector search.",
  structured_data: {
    title: "Q3 Sprint Planning",
    overview: "Engineering roadmap aligned on pgvector and Redis caching.",
    key_points: [
      "Migrate to pgvector for semantic search",
      "Deploy Redis cluster for real-time pub/sub",
    ],
    action_items: [
      {
        task: "Set up pgvector migration",
        owner: "Nikshay",
        priority: "high",
        completed: false,
      },
      {
        task: "Benchmark Redis caching",
        owner: "DevTeam",
        priority: "medium",
        completed: true,
      },
    ],
    decisions: [
      {
        decision: "Adopt PostgreSQL with pgvector extension",
        rationale: "Keeps operational complexity low without external vector databases",
      },
    ],
    topics: ["Architecture", "Database", "Search"],
  },
  created_at: "2026-10-18T12:00:00Z",
  updated_at: "2026-10-18T12:05:00Z",
};

beforeEach(() => {
  vi.mocked(api.getNote).mockImplementation(async () => JSON.parse(JSON.stringify(structuredNote)));
  vi.mocked(api.updateNote).mockImplementation(async () => JSON.parse(JSON.stringify(structuredNote)));
});

test("renders topics, executive overview, key highlights, and decisions", async () => {
  render(
    <AppProviders>
      <NoteDetail id="structured-note-1" />
    </AppProviders>,
  );

  expect(await screen.findByRole("heading", { name: "Your recording is ready to use." })).toBeInTheDocument();
  expect(screen.getByText("Architecture")).toBeInTheDocument();
  expect(screen.getByText("Database")).toBeInTheDocument();
  expect(screen.getByText("Search")).toBeInTheDocument();
  expect(
    screen.getByText("Engineering roadmap aligned on pgvector and Redis caching."),
  ).toBeInTheDocument();
  expect(screen.getByText("Migrate to pgvector for semantic search")).toBeInTheDocument();
  expect(
    screen.getByText("Adopt PostgreSQL with pgvector extension"),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Keeps operational complexity low without external vector databases/),
  ).toBeInTheDocument();
});

test("renders action items and allows toggling task completion", async () => {
  render(
    <AppProviders>
      <NoteDetail id="structured-note-1" />
    </AppProviders>,
  );

  expect(await screen.findByRole("heading", { name: "Your recording is ready to use." })).toBeInTheDocument();
  expect(screen.getByText("Set up pgvector migration")).toBeInTheDocument();
  expect(screen.getByText(/1 of 2 completed/)).toBeInTheDocument();

  const toggleBtn = screen.getByRole("button", {
    name: "Toggle task: Set up pgvector migration",
  });
  fireEvent.click(toggleBtn);

  await waitFor(() => {
    expect(api.updateNote).toHaveBeenCalledWith("structured-note-1", expect.any(Object));
  });
});

test("renders export buttons for Markdown, Text, and PDF", async () => {
  render(
    <AppProviders>
      <NoteDetail id="structured-note-1" />
    </AppProviders>,
  );

  expect(await screen.findByRole("heading", { name: "Your recording is ready to use." })).toBeInTheDocument();
  expect(screen.getByText("Markdown")).toBeInTheDocument();
  expect(screen.getByText("Text")).toBeInTheDocument();
  expect(screen.getByText("Print / PDF")).toBeInTheDocument();
  expect(screen.getByText("Copy Note")).toBeInTheDocument();
});
