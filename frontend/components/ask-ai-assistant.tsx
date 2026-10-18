"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, Copy, Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { askNoteAI } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

interface AskAiAssistantProps {
  noteId: string;
  hasTranscript: boolean;
  disabled?: boolean;
}

const SUGGESTED_PROMPTS = [
  "Summarize key action items & owners",
  "What were the most critical decisions made?",
  "Draft a professional follow-up email",
  "List any potential risks or unanswered questions",
];

export function AskAiAssistant({ noteId, hasTranscript, disabled }: AskAiAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, asking]);

  async function handleSend(textToSend?: string) {
    const question = (textToSend ?? input).trim();
    if (!question || asking || !hasTranscript || disabled) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAsking(true);

    try {
      const response = await askNoteAI(noteId, question);
      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: "ai",
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not get an answer from AI assistant.");
    } finally {
      setAsking(false);
    }
  }

  async function copyReply(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Answer copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Could not copy answer");
    }
  }

  return (
    <section className="result-card ask-ai-card">
      <header>
        <div className="result-title">
          <span><Bot size={19} /></span>
          <div>
            <p className="step-label">INTERACTIVE INTELLIGENCE</p>
            <h3>Ask AI Assistant</h3>
          </div>
        </div>
        <span className="ask-ai-badge">
          <Sparkles size={12} /> Gemini Grounded Q&A
        </span>
      </header>

      <div className="ask-ai-body">
        <p className="ask-ai-intro">
          Ask questions, draft follow-up correspondence, or extract specific metrics. Answers are strictly grounded in this note’s audio transcript.
        </p>

        {messages.length === 0 && (
          <div className="ask-ai-suggested">
            <span className="ask-ai-suggested-label">Suggested prompts:</span>
            <div className="ask-ai-chips">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  className="ask-ai-chip"
                  disabled={asking || !hasTranscript}
                  onClick={() => void handleSend(prompt)}
                >
                  <Sparkles size={11} /> {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="ask-ai-thread">
            {messages.map((msg) => (
              <div key={msg.id} className={`ask-ai-message ${msg.sender}`}>
                <div className="ask-ai-bubble">
                  <div className="ask-ai-msg-header">
                    <span className="ask-ai-author">
                      {msg.sender === "user" ? "You" : "AI Assistant"}
                    </span>
                    <span className="ask-ai-time">{msg.timestamp}</span>
                  </div>
                  <div className="ask-ai-text">{msg.text}</div>
                  {msg.sender === "ai" && (
                    <button
                      type="button"
                      className="ask-ai-copy-btn"
                      onClick={() => void copyReply(msg.id, msg.text)}
                      title="Copy response"
                    >
                      {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {asking && (
              <div className="ask-ai-message ai">
                <div className="ask-ai-bubble thinking">
                  <LoaderCircle className="spin" size={14} />
                  <span>Analyzing transcript and generating answer…</span>
                </div>
              </div>
            )}
            <div ref={threadEndRef} />
          </div>
        )}

        <form
          className="ask-ai-input-wrap"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
        >
          <input
            type="text"
            className="ask-ai-input"
            placeholder={
              hasTranscript
                ? "Ask anything about this recording… (e.g. What were the next steps?)"
                : "Waiting for transcript to finish processing…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={asking || !hasTranscript || disabled}
          />
          <button
            type="submit"
            className="ask-ai-send-btn"
            disabled={!input.trim() || asking || !hasTranscript || disabled}
            aria-label="Send question"
          >
            {asking ? <LoaderCircle className="spin" size={15} /> : <Send size={15} />}
          </button>
        </form>
      </div>
    </section>
  );
}
