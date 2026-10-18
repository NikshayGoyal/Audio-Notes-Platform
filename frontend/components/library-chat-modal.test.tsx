import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { LibraryChatModal } from "./library-chat-modal";
import * as api from "@/lib/api";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof api>("@/lib/api");
  return {
    ...actual,
    askLibraryAI: vi.fn(),
  };
});

beforeEach(() => {
  vi.mocked(api.askLibraryAI).mockResolvedValue({
    reply: "Based on your 2 sprint meetings, the team decided to adopt pgvector for semantic search.",
    sources: [
      {
        note_id: "test-note-1",
        title: "Q3 Sprint Planning",
        created_at: "2026-10-18T10:00:00Z",
      },
    ],
  });
});

test("renders title and starter prompt suggestions", () => {
  render(<LibraryChatModal isOpen={true} onClose={vi.fn()} totalNotesCount={5} />);

  expect(screen.getByText("Audio Knowledge Brain")).toBeInTheDocument();
  expect(screen.getByText("Cross-Note RAG")).toBeInTheDocument();
  expect(
    screen.getByText("What strategic decisions have we made across all meetings?"),
  ).toBeInTheDocument();
  expect(
    screen.getByText("List all high-priority action items and their owners"),
  ).toBeInTheDocument();
});

test("sends user question and displays AI reply with clickable note citation", async () => {
  render(<LibraryChatModal isOpen={true} onClose={vi.fn()} totalNotesCount={5} />);

  const input = screen.getByPlaceholderText(
    "Ask anything across your entire audio notes library…",
  );
  fireEvent.change(input, { target: { value: "What database was chosen?" } });

  const sendBtn = screen.getByRole("button", { name: "Send question" });
  fireEvent.click(sendBtn);

  expect(screen.getByText("What database was chosen?")).toBeInTheDocument();

  await waitFor(() => {
    expect(
      screen.getByText(/the team decided to adopt pgvector for semantic search/),
    ).toBeInTheDocument();
  });

  expect(screen.getByText("Q3 Sprint Planning")).toBeInTheDocument();
  expect(screen.getByText("Referenced Notes (1):")).toBeInTheDocument();
});

test("sends question when clicking a starter prompt chip", async () => {
  render(<LibraryChatModal isOpen={true} onClose={vi.fn()} totalNotesCount={5} />);

  const promptChip = screen.getByText(
    "What strategic decisions have we made across all meetings?",
  );
  fireEvent.click(promptChip);

  await waitFor(() => {
    expect(
      screen.getByText(/the team decided to adopt pgvector for semantic search/),
    ).toBeInTheDocument();
  });
});

test("calls onClose when close button is clicked", () => {
  const onClose = vi.fn();
  render(<LibraryChatModal isOpen={true} onClose={onClose} totalNotesCount={5} />);

  const closeBtn = screen.getByRole("button", { name: "Close knowledge assistant" });
  fireEvent.click(closeBtn);

  expect(onClose).toHaveBeenCalled();
});
