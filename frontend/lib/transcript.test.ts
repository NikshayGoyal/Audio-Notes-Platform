import { expect, test } from "vitest";
import { formatTime, parseTranscriptSegments } from "./transcript";

test("formatTime formats seconds into mm:ss correctly", () => {
  expect(formatTime(0)).toBe("00:00");
  expect(formatTime(5)).toBe("00:05");
  expect(formatTime(65)).toBe("01:05");
  expect(formatTime(3600)).toBe("60:00");
});

test("parseTranscriptSegments returns empty array for empty transcript", () => {
  expect(parseTranscriptSegments("")).toEqual([]);
  expect(parseTranscriptSegments(null)).toEqual([]);
  expect(parseTranscriptSegments(undefined)).toEqual([]);
});

test("parseTranscriptSegments parses multiple sentences and computes proportional intervals", () => {
  const text = "First sentence of the meeting. Second sentence here! Third sentence closing.";
  const segments = parseTranscriptSegments(text, 30);

  expect(segments.length).toBe(3);
  expect(segments[0].start).toBe(0);
  expect(segments[0].text).toBe("First sentence of the meeting.");
  expect(segments[1].start).toBe(segments[0].end);
  expect(segments[2].end).toBeLessThanOrEqual(30);
});
