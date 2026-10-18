import type { SpeakerTurn, TranscriptSegment } from "./types";

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Parses a transcript into timed segments for synchronized playback and interactive click-to-seek scrubbing.
 * If speaker turns are available, segments are organized by speaker turn.
 * Otherwise, breaks sentences proportionally across duration_seconds.
 */
export function parseTranscriptSegments(
  transcript: string | null | undefined,
  durationSeconds?: number | null,
  speakerTurns?: SpeakerTurn[] | null,
): TranscriptSegment[] {
  if (!transcript || !transcript.trim()) return [];

  // When structured speaker turns are present, prioritize them
  if (speakerTurns && speakerTurns.length > 0) {
    const validTurns = speakerTurns.filter((t) => Boolean(t && (t.text || (t as unknown as Record<string, string>).quote)));
    if (validTurns.length > 0) {
      const getTurnText = (turn: SpeakerTurn) => turn.text || (turn as unknown as Record<string, string>).quote || "";
      const totalWords =
        validTurns.reduce(
          (acc, turn) => acc + getTurnText(turn).split(/\s+/).filter(Boolean).length,
          0
        ) || 1;
      const totalDuration =
        durationSeconds && durationSeconds > 1
          ? durationSeconds
          : Math.max(10, totalWords * 0.4);

      let currentStart = 0;
      const segments: TranscriptSegment[] = [];

      for (let i = 0; i < validTurns.length; i++) {
        const turn = validTurns[i];
        const text = getTurnText(turn);
        const words = text.split(/\s+/).filter(Boolean).length || 1;
        const segDuration = (words / totalWords) * totalDuration;
        const end = Math.min(totalDuration, currentStart + segDuration);

        segments.push({
          id: i,
          start: Number(currentStart.toFixed(1)),
          end: Number(end.toFixed(1)),
          text,
          speaker: turn.speaker,
        });

        currentStart = end;
      }
      return segments;
    }
  }

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
