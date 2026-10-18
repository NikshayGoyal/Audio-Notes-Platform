"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileAudio,
  Globe2,
  Languages,
  ListChecks,
  LoaderCircle,
  RefreshCw,
  Scale,
  Sparkles,
  Tag,
  TrendingUp,
  User,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { getLibraryAnalytics } from "@/lib/api";
import type { AnalyticsResponse } from "@/lib/types";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (notify = false) => {
    try {
      setRefreshing(true);
      const res = await getLibraryAnalytics();
      setData(res);
      if (notify) toast.success("Analytics metrics updated");
    } catch {
      toast.error("Could not load library analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <main className="analytics-page">
        <div className="analytics-skeleton">
          <div className="skeleton-line short" />
          <div className="skeleton-line title" />
          <div className="analytics-kpi-grid">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="analytics-kpi-card skeleton" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  const actions = data?.action_items;
  const completionRate = actions?.completion_rate_pct ?? 0;

  return (
    <main className="analytics-page">
      {/* Hero Header */}
      <header className="analytics-hero">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="eyebrow">
              <BarChart3 size={14} /> Meeting Intelligence & Analytics
            </div>
            <h1>
              Executive Audio <span>Intelligence Hub</span>
            </h1>
            <p>
              Synthesized execution velocity, strategic decisions, and speaker participation across your library.
            </p>
          </div>
          <button
            type="button"
            className="secondary-button button-small"
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? "spin" : ""} />
            <span>{refreshing ? "Updating…" : "Refresh Analytics"}</span>
          </button>
        </div>
      </header>

      {/* KPI Cards Grid */}
      <section className="analytics-kpi-grid">
        <motion.article
          className="analytics-kpi-card"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="kpi-icon-wrap violet">
            <Clock size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">TOTAL AUDIO PROCESSED</span>
            <strong className="kpi-value">{formatDuration(data?.total_duration_seconds ?? 0)}</strong>
            <small className="kpi-subtext">
              Across {data?.total_notes ?? 0} notes ({data?.completed_notes ?? 0} completed)
            </small>
          </div>
        </motion.article>

        <motion.article
          className="analytics-kpi-card"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="kpi-icon-wrap emerald">
            <ListChecks size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">EXECUTION VELOCITY</span>
            <strong className="kpi-value">{completionRate}%</strong>
            <small className="kpi-subtext">
              {actions?.completed ?? 0} of {actions?.total ?? 0} action items finished
            </small>
          </div>
        </motion.article>

        <motion.article
          className="analytics-kpi-card"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="kpi-icon-wrap blue">
            <Scale size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">STRATEGIC DECISIONS</span>
            <strong className="kpi-value">{data?.total_decisions ?? 0}</strong>
            <small className="kpi-subtext">Documented choices & explicit rationale</small>
          </div>
        </motion.article>

        <motion.article
          className="analytics-kpi-card"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="kpi-icon-wrap amber">
            <Activity size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">WORDS TRANSCRIBED</span>
            <strong className="kpi-value">{(data?.total_words ?? 0).toLocaleString()}</strong>
            <small className="kpi-subtext">
              ~{data?.avg_words_per_minute ?? 0} avg. words/minute speaking velocity
            </small>
          </div>
        </motion.article>
      </section>

      {/* Action Items Roadmap Velocity & Assignees */}
      <section className="analytics-section">
        <div className="analytics-card">
          <header className="analytics-card-header">
            <div className="flex items-center gap-2.5">
              <span className="analytics-section-icon">
                <ListChecks size={18} />
              </span>
              <div>
                <p className="step-label">ROADMAP EXECUTION</p>
                <h3>Action Items Progress & Priorities</h3>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {actions?.pending ?? 0} tasks pending
            </span>
          </header>

          <div className="analytics-progress-wrap">
            <div className="analytics-progress-bar">
              <div
                className="analytics-progress-fill"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="analytics-progress-labels">
              <span>{completionRate}% Completed</span>
              <span>100% Target</span>
            </div>
          </div>

          <div className="analytics-priority-row">
            <div className="analytics-prio-chip high">
              <span className="prio-dot high" />
              <strong>High Priority:</strong> {actions?.high_priority ?? 0}
            </div>
            <div className="analytics-prio-chip medium">
              <span className="prio-dot medium" />
              <strong>Medium Priority:</strong> {actions?.medium_priority ?? 0}
            </div>
            <div className="analytics-prio-chip low">
              <span className="prio-dot low" />
              <strong>Low Priority:</strong> {actions?.low_priority ?? 0}
            </div>
          </div>

          {actions?.by_owner && Object.keys(actions.by_owner).length > 0 && (
            <div className="analytics-owner-box">
              <span className="analytics-subheading">Tasks by Owner:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(actions.by_owner).map(([owner, count]) => (
                  <span key={owner} className="owner-stat-pill">
                    <User size={12} />
                    <strong>@{owner}:</strong> {count} task{count > 1 ? "s" : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Two-Column Grid: Strategic Decisions & Topics/Speakers */}
      <div className="analytics-two-col">
        {/* Recent Decisions Board */}
        <section className="analytics-card">
          <header className="analytics-card-header">
            <div className="flex items-center gap-2.5">
              <span className="analytics-section-icon">
                <Scale size={18} />
              </span>
              <div>
                <p className="step-label">STRATEGIC DECISIONS LOG</p>
                <h3>Key Choices Made Across Meetings</h3>
              </div>
            </div>
          </header>

          {data?.recent_decisions && data.recent_decisions.length > 0 ? (
            <div className="analytics-decisions-list">
              {data.recent_decisions.map((dec, i) => (
                <article key={i} className="analytics-decision-item">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Link
                      href={`/notes/${dec.note_id}`}
                      className="decision-note-link"
                      title="Open source note"
                    >
                      <FileAudio size={12} />
                      <span>{dec.note_title}</span>
                      <ChevronRight size={12} />
                    </Link>
                  </div>
                  <strong className="decision-text">{dec.decision}</strong>
                  {dec.rationale && (
                    <p className="decision-rationale-text">
                      <em>Rationale:</em> {dec.rationale}
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="analytics-empty-state">
              <Scale size={24} className="text-slate-300" />
              <p>No strategic decisions extracted yet.</p>
            </div>
          )}
        </section>

        {/* Right Column: Topics & Speakers & Languages */}
        <div className="analytics-stack-col">
          {/* Topics Frequency */}
          <section className="analytics-card">
            <header className="analytics-card-header">
              <div className="flex items-center gap-2.5">
                <span className="analytics-section-icon">
                  <Tag size={18} />
                </span>
                <div>
                  <p className="step-label">TOPIC CLOUD</p>
                  <h3>Key Discussion Themes</h3>
                </div>
              </div>
            </header>
            {data?.top_topics && data.top_topics.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.top_topics.map((item, i) => (
                  <span key={i} className="topic-frequency-pill">
                    <Tag size={11} />
                    <span>{item.topic}</span>
                    <strong className="topic-count">{item.count}</strong>
                  </span>
                ))}
              </div>
            ) : (
              <div className="analytics-empty-state">
                <Tag size={24} className="text-slate-300" />
                <p>No topics extracted yet.</p>
              </div>
            )}
          </section>

          {/* Speakers Participation */}
          <section className="analytics-card">
            <header className="analytics-card-header">
              <div className="flex items-center gap-2.5">
                <span className="analytics-section-icon">
                  <Users size={18} />
                </span>
                <div>
                  <p className="step-label">PARTICIPANTS & AIRTIME</p>
                  <h3>Meeting Contributors</h3>
                </div>
              </div>
            </header>
            {data?.top_speakers && data.top_speakers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.top_speakers.map((item, i) => (
                  <span key={i} className="speaker-frequency-pill">
                    <User size={12} />
                    <span>{item.speaker}</span>
                    <strong className="speaker-count">{item.count} turns</strong>
                  </span>
                ))}
              </div>
            ) : (
              <div className="analytics-empty-state">
                <Users size={24} className="text-slate-300" />
                <p>No speakers identified yet.</p>
              </div>
            )}
          </section>

          {/* Languages & Code Switching */}
          <section className="analytics-card">
            <header className="analytics-card-header">
              <div className="flex items-center gap-2.5">
                <span className="analytics-section-icon">
                  <Languages size={18} />
                </span>
                <div>
                  <p className="step-label">LINGUISTIC DIVERSITY</p>
                  <h3>Spoken Languages</h3>
                </div>
              </div>
            </header>
            <div className="flex flex-wrap items-center gap-2">
              {data?.languages && data.languages.length > 0 ? (
                data.languages.map((lang, i) => (
                  <span key={i} className="language-stat-chip">
                    <Globe2 size={12} />
                    <span>{lang.language}:</span>
                    <strong>{lang.count}</strong>
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">Auto-detected multilingual</span>
              )}
              {data && data.code_switched_notes > 0 && (
                <span className="code-switched-chip">
                  <Sparkles size={11} /> {data.code_switched_notes} Code-switched (Hinglish)
                </span>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
