import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canDiarizeVideo, canDeleteVideo, isDiarizationInProgress } from './videoActions.ts';

test('isDiarizationInProgress recognizes all active pipeline steps', () => {
  assert.equal(isDiarizationInProgress('PENDING'), true);
  assert.equal(isDiarizationInProgress('STARTED'), true);
  assert.equal(isDiarizationInProgress('PROCESSING'), true);
  assert.equal(isDiarizationInProgress('TRANSCRIPTION'), true);
  assert.equal(isDiarizationInProgress('ALIGNMENT'), true);
  assert.equal(isDiarizationInProgress('DIARIZATION'), true);
  assert.equal(isDiarizationInProgress('DIARIZED'), true);
  assert.equal(isDiarizationInProgress('diarization'), true); // case-insensitive

  // Terminal or idle states
  assert.equal(isDiarizationInProgress('COMPLETED'), false);
  assert.equal(isDiarizationInProgress('ERROR'), false);
  assert.equal(isDiarizationInProgress('CANCELLED'), false);
  assert.equal(isDiarizationInProgress(null), false);
  assert.equal(isDiarizationInProgress(undefined), false);
  assert.equal(isDiarizationInProgress(''), false);
});

test('canDiarizeVideo allows diarization only for COMPLETED videos without pending deletion', () => {
  assert.equal(canDiarizeVideo({ status: 'COMPLETED' }), true);
  assert.equal(canDiarizeVideo({ status: 'COMPLETED', deletionRequested: false }), true);

  // Members-only video cannot be diarized
  assert.equal(canDiarizeVideo({ status: 'MEMBERS_ONLY' }), false);

  // Deleted video cannot be diarized
  assert.equal(canDiarizeVideo({ status: 'DELETED' }), false);

  // Pipeline in progress or failed cannot be diarized
  assert.equal(canDiarizeVideo({ status: 'DOWNLOADING' }), false);
  assert.equal(canDiarizeVideo({ status: 'PENDING_DOWNLOAD' }), false);
  assert.equal(canDiarizeVideo({ status: 'EXTRACTING_METADATA' }), false);
  assert.equal(canDiarizeVideo({ status: 'ERROR' }), false);
  assert.equal(canDiarizeVideo({ status: 'PRIVATE_VIDEO' }), false);
  assert.equal(canDiarizeVideo({ status: 'AGE_RESTRICTED' }), false);

  // Completed video with deletion pending cannot be diarized
  assert.equal(canDiarizeVideo({ status: 'COMPLETED', deletionRequested: true }), false);

  // Null / undefined safety
  assert.equal(canDiarizeVideo(null), false);
  assert.equal(canDiarizeVideo(undefined), false);
  assert.equal(canDiarizeVideo({ status: undefined }), false);
});

test('canDeleteVideo hides delete action for already DELETED videos', () => {
  assert.equal(canDeleteVideo({ status: 'DELETED' }), false);

  // Active videos and other error statuses can be deleted
  assert.equal(canDeleteVideo({ status: 'COMPLETED' }), true);
  assert.equal(canDeleteVideo({ status: 'MEMBERS_ONLY' }), true);
  assert.equal(canDeleteVideo({ status: 'ERROR' }), true);
  assert.equal(canDeleteVideo({ status: 'DOWNLOADING' }), true);

  // Null / undefined safety
  assert.equal(canDeleteVideo(null), false);
  assert.equal(canDeleteVideo(undefined), false);
});
