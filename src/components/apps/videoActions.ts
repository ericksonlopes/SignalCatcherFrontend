import type { CapturedVideo } from '../../types';

export const IN_PROGRESS_DIARIZATION_STEPS = new Set([
  'PENDING',
  'STARTED',
  'PROCESSING',
  'TRANSCRIPTION',
  'ALIGNMENT',
  'DIARIZATION',
  'DIARIZED',
]);

/**
 * Determines whether a diarization status indicates active processing.
 */
export function isDiarizationInProgress(status: string | null | undefined): boolean {
  if (!status) return false;
  return IN_PROGRESS_DIARIZATION_STEPS.has(status.toUpperCase());
}

/**
 * Determines whether a video is eligible for diarization.
 * Only videos that have completed download and are not pending deletion can be diarized.
 * Inaccessible videos (e.g. MEMBERS_ONLY, PRIVATE_VIDEO, DELETED, ERROR) cannot be diarized.
 */
export function canDiarizeVideo(
  video: Pick<CapturedVideo, 'status' | 'deletionRequested'> | null | undefined
): boolean {
  if (!video) return false;
  return video.status === 'COMPLETED' && !video.deletionRequested;
}

/**
 * Determines whether the delete action should be available for a video.
 * Videos that have already been deleted from disk/database (DELETED) do not have a delete action.
 */
export function canDeleteVideo(
  video: Pick<CapturedVideo, 'status' | 'deletionRequested'> | null | undefined
): boolean {
  if (!video) return false;
  return video.status !== 'DELETED';
}
