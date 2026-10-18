import type { TranscriptSegment } from "./types";

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Parses a transcript into timed segments for synchronized playback and interactive click-to-seek scrubbing.
 * Breaks sentences proportionally across duration_seconds or an adaptive speech rate.
 */
export function parseTranscriptSegments(
  transcript: string | null | undefined,
  durationSeconds?: number | null,
): TranscriptSegment[] {
  if (!transcript || !transcript.trim()) return [];

  const text = transcript.trim();
  const rawSentences = text
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (rawSentences.length === 0) return [];

  const sentenceWordCounts = rawSentences.map(
    (s) => s.split(/\s+/).filter(Boolean).length
  );
  const totalWords = sentenceWordCounts.reduce((acc, c) => acc + c, 0) || 1;

  const totalDuration =
    durationSeconds && durationSeconds > 1
      ? durationSeconds
      : Math.max(10, totalWords * 0.4);

  let currentStart = 0;
  const segments: TranscriptSegment[] = [];

  for (let i = 0; i < rawSentences.length; i++) {
    const s = rawSentences[i];
    const words = sentenceWordCounts[i];
    const segDuration = (words / totalWords) * totalDuration;
    const end = Math.min(totalDuration, currentStart + segDuration);

    segments.push({
      id: i,
      start: Number(currentStart.toFixed(1)),
      end: Number(end.toFixed(1)),
      text: s,
    });

    currentStart = end;
  }

  return segments;
}
