export interface TranscriptResult {
  speakers?: string[];
  segments?: { speaker?: string; start: number; end: number; text?: string }[];
}

export interface TranscriptSegment {
  id: string;
  speakerId: string;
  start: number;
  end: number;
  text: string;
  phrases: Omit<TranscriptSegment, 'phrases'>[];
}

export function buildTranscript(result?: TranscriptResult | null): TranscriptSegment[] {
  const merged: TranscriptSegment[] = [];
  if (!Array.isArray(result?.segments)) return merged;
  result.segments.forEach((segment, index) => {
    if (!Number.isFinite(segment.start) || !Number.isFinite(segment.end)) return;
    const phrase = {
      id: `segment-${index}`, speakerId: segment.speaker || 'UNKNOWN',
      start: Math.max(0, segment.start), end: Math.max(0, segment.start, segment.end),
      text: (segment.text || '').trim(),
    };
    const last = merged[merged.length - 1];
    // Keep pauses and overlapping speech visible instead of merging every same-speaker turn.
    if (last && last.speakerId === phrase.speakerId && phrase.start >= last.end && phrase.start - last.end <= 2) {
      last.end = phrase.end;
      last.text = `${last.text} ${phrase.text}`.trim();
      last.phrases.push(phrase);
    } else {
      merged.push({ ...phrase, phrases: [phrase] });
    }
  });
  return merged;
}

export function formatTime(seconds: number): string {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor(value % 3600 / 60);
  const time = `${String(minutes).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  return hours ? `${String(hours).padStart(2, '0')}:${time}` : time;
}

export function speakerStats(segments: TranscriptSegment[], speakerId: string) {
  const turns = segments.filter(segment => segment.speakerId === speakerId);
  const intervals = turns.flatMap(segment => segment.phrases).sort((a, b) => a.start - b.start);
  let seconds = 0;
  let end = 0;
  for (const interval of intervals) {
    seconds += Math.max(0, interval.end - Math.max(end, interval.start));
    end = Math.max(end, interval.end);
  }
  return { turns: turns.length, seconds };
}
