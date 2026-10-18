"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  Bot,
  Check,
  ChevronRight,
  Clipboard,
  FileAudio,
  LoaderCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { askLibraryAI } from "@/lib/api";
import type { LibraryChatSource } from "@/lib/types";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  sources?: LibraryChatSource[];
  timestamp: string;
}

interface LibraryChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalNotesCount?: number;
}

const STARTER_PROMPTS = [
  "What strategic decisions have we made across all meetings?",
  "List all high-priority action items and their owners",
  "Summarize key technical architecture and engineering topics",
  "What issues or roadblocks were mentioned in recent syncs?",
];

export function LibraryChatModal({ isOpen, onClose, totalNotesCount = 0 }: LibraryChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      sender: "ai",
      text: `Hello! I am your Audio Knowledge Brain. I analyze transcripts, decisions, and action items across your entire library (${totalNotesCount} notes). Ask me anything!`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  async function handleSend(textToSend?: string) {
    const query = (textToSend ?? input).trim();
    if (!query || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await askLibraryAI(query);
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: response.reply,
        sources: response.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const errorText = err instanceof Error ? err.message : "Could not retrieve answer. Please try again.";
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-error-${Date.now()}`,
          sender: "ai",
          text: `⚠️ ${errorText}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      toast.error("Could not query library knowledge base");
    } finally {
      setLoading(false);
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="library-chat-overlay" onClick={onClose}>
        <motion.div
          className="library-chat-modal"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="library-chat-header">
            <div className="flex items-center gap-3">
              <div className="library-chat-hero-icon">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="library-chat-title">Audio Knowledge Brain</h3>
                  <span className="library-chat-badge">Cross-Note RAG</span>
                </div>
                <p className="library-chat-subtitle">
                  Synthesized intelligence across your recordings and decisions
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="library-chat-close-btn"
              aria-label="Close knowledge assistant"
            >
              <X size={18} />
            </button>
          </div>

          {/* Starter Chips */}
          <div className="library-chat-prompts">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Suggested Questions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {STARTER_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  className="library-prompt-chip"
                  onClick={() => void handleSend(prompt)}
                  disabled={loading}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Area */}
          <div className="library-chat-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`library-chat-bubble-wrap ${msg.sender === "user" ? "user" : "ai"}`}
              >
                <div className="library-chat-avatar">
                  {msg.sender === "user" ? "👤" : <Bot size={15} />}
                </div>
                <div className="library-chat-bubble">
                  <div className="library-bubble-header">
                    <span className="font-bold text-xs">
                      {msg.sender === "user" ? "You" : "Audio Brain"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                      {msg.sender === "ai" && (
                        <button
                          type="button"
                          onClick={() => void copyReply(msg.id, msg.text)}
                          className="text-slate-400 hover:text-slate-600 transition"
                          title="Copy answer"
                        >
                          {copiedId === msg.id ? <Check size={12} /> : <Clipboard size={12} />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="library-bubble-text whitespace-pre-wrap">{msg.text}</div>

                  {/* Sources Chips */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="library-sources-box">
                      <span className="library-sources-label">
                        Referenced Notes ({msg.sources.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {msg.sources.map((src) => (
                          <Link
                            key={src.note_id}
                            href={`/notes/${src.note_id}`}
                            className="library-source-chip"
                            onClick={onClose}
                            title="Open note detail"
                          >
                            <FileAudio size={11} />
                            <span>{src.title}</span>
                            <ChevronRight size={10} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="library-chat-bubble-wrap ai">
                <div className="library-chat-avatar">
                  <Bot size={15} />
                </div>
                <div className="library-chat-bubble thinking">
                  <LoaderCircle className="spin" size={15} />
                  <span className="text-xs text-slate-500 font-medium">
                    Scanning library and synthesizing intelligence…
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            className="library-chat-footer"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything across your entire audio notes library…"
              className="library-chat-input"
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="library-chat-send-btn"
              aria-label="Send question"
            >
              {loading ? <LoaderCircle className="spin" size={15} /> : <Send size={15} />}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
