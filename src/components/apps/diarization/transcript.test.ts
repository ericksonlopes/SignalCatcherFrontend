import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildTranscript, formatTime, speakerStats } from './transcript.ts';

test('groups adjacent speech without swallowing pauses or overlaps', () => {
  const segments = buildTranscript({ segments: [
    { speaker: 'A', start: 0, end: 2, text: 'Hello' },
    { speaker: 'A', start: 3, end: 5, text: 'again' },
    { speaker: 'A', start: 10, end: 12, text: 'After a pause' },
    { speaker: 'A', start: 11, end: 13, text: 'Overlap' },
    { speaker: 'B', start: 13, end: 15, text: 'Reply' },
  ] });
  assert.equal(segments.length, 4);
  assert.equal(segments[0].text, 'Hello again');
  assert.equal(segments[0].phrases.length, 2);
  assert.deepEqual(speakerStats(segments, 'A'), { turns: 3, seconds: 7 });
});

test('handles missing speakers, absent results and invalid timestamps', () => {
  assert.deepEqual(buildTranscript(null), []);
  const segments = buildTranscript({ segments: [
    { start: 1, end: 3, text: 'Unknown voice' },
    { start: NaN, end: 4, text: 'Invalid' },
    { speaker: 'B', start: 6, end: 5, text: 'Reversed' },
  ] });
  assert.equal(segments[0].speakerId, 'UNKNOWN');
  assert.equal(segments.length, 2);
  assert.equal(segments[1].end, 6);
});

test('formats long recordings and invalid duration safely', () => {
  assert.equal(formatTime(3661.8), '01:01:01');
  assert.equal(formatTime(65), '01:05');
  assert.equal(formatTime(-1), '00:00');
  assert.equal(formatTime(NaN), '00:00');
});
