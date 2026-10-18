import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import AnalyticsPage from "@/app/analytics/page";
import * as api from "@/lib/api";
import type { AnalyticsResponse } from "@/lib/types";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof api>("@/lib/api");
  return {
    ...actual,
    getLibraryAnalytics: vi.fn(),
  };
});

const mockAnalytics: AnalyticsResponse = {
  total_notes: 3,
  completed_notes: 2,
  failed_notes: 0,
  active_notes: 1,
  total_duration_seconds: 180,
  total_words: 1450,
  avg_words_per_minute: 145,
  action_items: {
    total: 6,
    completed: 4,
    pending: 2,
    completion_rate_pct: 67,
    high_priority: 2,
    medium_priority: 3,
    low_priority: 1,
    by_owner: {
      Nikshay: 3,
      DevTeam: 2,
    },
  },
  total_decisions: 2,
  recent_decisions: [
    {
      note_id: "note-1",
      note_title: "Architecture Planning",
      decision: "Adopt PostgreSQL with pgvector",
      rationale: "Keeps operational complexity low without external vector databases",
    },
  ],
  top_topics: [
    { topic: "Database", count: 2 },
    { topic: "Architecture", count: 1 },
  ],
  top_speakers: [
    { speaker: "Nikshay (Lead)", count: 8 },
    { speaker: "Alex (DevOps)", count: 4 },
  ],
  languages: [
    { language: "English (India)", count: 2 },
  ],
  code_switched_notes: 1,
};

beforeEach(() => {
  vi.mocked(api.getLibraryAnalytics).mockResolvedValue(mockAnalytics);
});

test("renders executive KPI stat cards", async () => {
  render(<AnalyticsPage />);

  await waitFor(() => {
    expect(screen.getByText("TOTAL AUDIO PROCESSED")).toBeInTheDocument();
  });

  expect(screen.getByText("3m 0s")).toBeInTheDocument();
  expect(screen.getByText("EXECUTION VELOCITY")).toBeInTheDocument();
  expect(screen.getByText("67%")).toBeInTheDocument();
  expect(screen.getByText("STRATEGIC DECISIONS")).toBeInTheDocument();
  expect(screen.getByText("WORDS TRANSCRIBED")).toBeInTheDocument();
  expect(screen.getByText("1,450")).toBeInTheDocument();
});

test("renders action items priorities and owners", async () => {
  render(<AnalyticsPage />);

  await waitFor(() => {
    expect(screen.getByText("ROADMAP EXECUTION")).toBeInTheDocument();
  });

  expect(screen.getByText("2 tasks pending")).toBeInTheDocument();
  expect(screen.getByText("High Priority:")).toBeInTheDocument();
  expect(screen.getByText("Medium Priority:")).toBeInTheDocument();
  expect(screen.getByText("Low Priority:")).toBeInTheDocument();
  expect(screen.getByText("@Nikshay:")).toBeInTheDocument();
});

test("renders decisions log, topic cloud, and speaker airtime", async () => {
  render(<AnalyticsPage />);

  await waitFor(() => {
    expect(screen.getByText("STRATEGIC DECISIONS LOG")).toBeInTheDocument();
  });

  expect(screen.getByText("Adopt PostgreSQL with pgvector")).toBeInTheDocument();
  expect(
    screen.getByText(/Keeps operational complexity low without external vector databases/),
  ).toBeInTheDocument();
  expect(screen.getByText("Database")).toBeInTheDocument();
  expect(screen.getByText("Nikshay (Lead)")).toBeInTheDocument();
  expect(screen.getByText("8 turns")).toBeInTheDocument();
});
