import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { askNoteAI } from "@/lib/api";
import { AskAiAssistant } from "./ask-ai-assistant";

vi.mock("@/lib/api", () => ({
  askNoteAI: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("renders Ask AI Assistant with suggested prompt chips", () => {
  render(<AskAiAssistant noteId="test-note-1" hasTranscript={true} />);

  expect(screen.getByRole("heading", { name: "Ask AI Assistant" })).toBeInTheDocument();
  expect(screen.getByText("Gemini Grounded Q&A")).toBeInTheDocument();
  expect(screen.getByText("Suggested prompts:")).toBeInTheDocument();
  expect(screen.getByText(/Summarize key action items & owners/)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Ask anything about this recording/)).toBeInTheDocument();
});

test("disables input when transcript is not ready", () => {
  render(<AskAiAssistant noteId="test-note-2" hasTranscript={false} />);

  const input = screen.getByPlaceholderText("Waiting for transcript to finish processing…");
  expect(input).toBeDisabled();
});

test("sends message and displays AI reply when user clicks a suggested chip", async () => {
  vi.mocked(askNoteAI).mockResolvedValueOnce({
    reply: "The next steps are completing the frontend test suite and verifying CI.",
  });

  render(<AskAiAssistant noteId="test-note-3" hasTranscript={true} />);

  const chip = screen.getByText(/Summarize key action items & owners/);
  fireEvent.click(chip);

  expect(await screen.findByText("The next steps are completing the frontend test suite and verifying CI.")).toBeInTheDocument();
  expect(screen.getByText("AI Assistant")).toBeInTheDocument();
  expect(screen.getByText("You")).toBeInTheDocument();
});

test("submits custom typed question and displays AI response", async () => {
  vi.mocked(askNoteAI).mockResolvedValueOnce({
    reply: "The team agreed on PostgreSQL and FastAPI.",
  });

  render(<AskAiAssistant noteId="test-note-4" hasTranscript={true} />);

  const input = screen.getByPlaceholderText(/Ask anything about this recording/);
  fireEvent.change(input, { target: { value: "What database was chosen?" } });

  const sendBtn = screen.getByRole("button", { name: "Send question" });
  fireEvent.click(sendBtn);

  expect(await screen.findByText("The team agreed on PostgreSQL and FastAPI.")).toBeInTheDocument();
  expect(askNoteAI).toHaveBeenCalledWith("test-note-4", "What database was chosen?");
});
