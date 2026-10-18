import { expect, test } from "vitest";
import { generateMarkdown, generatePlainText } from "./export";
import type { Note } from "./types";

const mockNote: Note = {
  id: "test-note-export",
  user_id: "user_test",
  title: "Cloud Infrastructure Sprint",
  original_filename: "sprint_sync.mp3",
  size_bytes: 2048,
  status: "completed",
  source_language: "en-IN",
  summary_language: "en-IN",
  detected_language_name: "English (India)",
  transcript: "We decided to migrate our caching layer to Redis cluster.",
  summary: "Migrate cache to Redis cluster.",
  structured_data: {
    title: "Cloud Infrastructure Sprint",
    overview: "Team agreed on Redis migration to reduce PostgreSQL latency.",
    key_points: [
      "Cache hit ratio target is 92%",
      "Setup automated blue-green deployment pipeline",
    ],
    action_items: [
      {
        task: "Provision Redis Enterprise cluster",
        owner: "Nikshay",
        priority: "high",
        completed: true,
      },
      {
        task: "Configure cache invalidation hooks",
        owner: null,
        priority: "medium",
        completed: false,
      },
    ],
    decisions: [
      {
        decision: "Use AWS ElastiCache for Redis",
        rationale: "Managed multi-AZ failover and 99.99% SLA",
      },
    ],
    topics: ["DevOps", "Infrastructure", "Redis"],
  },
  created_at: "2026-10-18T10:00:00Z",
  updated_at: "2026-10-18T10:05:00Z",
};

test("generateMarkdown produces structured markdown with checkboxes and metadata", () => {
  const md = generateMarkdown(mockNote);

  expect(md).toContain("# Cloud Infrastructure Sprint");
  expect(md).toContain("sprint_sync.mp3");
  expect(md).toContain("`DevOps` `Infrastructure` `Redis`");
  expect(md).toContain("## Executive Overview");
  expect(md).toContain("Team agreed on Redis migration to reduce PostgreSQL latency.");
  expect(md).toContain("## Key Highlights");
  expect(md).toContain("- Cache hit ratio target is 92%");
  expect(md).toContain("## Action Items");
  expect(md).toContain("- [x] **[HIGH]** Provision Redis Enterprise cluster (@Nikshay)");
  expect(md).toContain("- [ ] **[MEDIUM]** Configure cache invalidation hooks");
  expect(md).toContain("## Key Decisions");
  expect(md).toContain("- **Use AWS ElastiCache for Redis**");
  expect(md).toContain("- *Rationale:* Managed multi-AZ failover and 99.99% SLA");
  expect(md).toContain("## Verbatim Transcript");
  expect(md).toContain("We decided to migrate our caching layer to Redis cluster.");
});

test("generatePlainText produces clear plain text document", () => {
  const txt = generatePlainText(mockNote);

  expect(txt).toContain("Cloud Infrastructure Sprint");
  expect(txt).toContain("TOPICS: DevOps, Infrastructure, Redis");
  expect(txt).toContain("OVERVIEW:");
  expect(txt).toContain("KEY POINTS:");
  expect(txt).toContain("• Cache hit ratio target is 92%");
  expect(txt).toContain("ACTION ITEMS:");
  expect(txt).toContain("• [DONE] [HIGH] Provision Redis Enterprise cluster (Nikshay)");
  expect(txt).toContain("• [TODO] [MEDIUM] Configure cache invalidation hooks");
  expect(txt).toContain("KEY DECISIONS:");
  expect(txt).toContain("• Use AWS ElastiCache for Redis (Rationale: Managed multi-AZ failover and 99.99% SLA)");
});
