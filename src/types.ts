export type AppId = 'signalcatcher' | 'diarization' | 'search' | 'voice_recognition';

export interface AppTab {
  id: string; // Unique tab instance ID
  appId: AppId;
  title: string;
  icon: string;
  isPinned?: boolean;
  activeSubTab?: string;
  customData?: unknown;
}

export interface VoiceSample {
  id: string;
  speaker_id: string;
  source_type: string;
  source_id?: string | null;
  speaker_label?: string | null;
  start_time?: number | null;
  end_time?: number | null;
  duration_seconds?: number | null;
  metadata?: Record<string, unknown>;
  created_at?: string | null;
}

export interface SpeakerProfile {
  id: string;
  name: string;
  description?: string | null;
  avatar_url?: string | null;
  samples_count: number;
  created_at?: string | null;
  updated_at?: string | null;
  samples?: VoiceSample[] | null;
}

export interface VoiceRecognitionStats {
  total_profiles: number;
  total_samples: number;
  embedding_dimension: number;
  default_similarity_threshold: number;
  worker_healthy: boolean;
}

export interface SpeakerMatch {
  original_speaker_label: string;
  current_speaker_label: string;
  matched_speaker_id?: string | null;
  matched_speaker_name?: string | null;
  matched_sample_id?: string | null;
  similarity_score: number;
  segments_count: number;
  speech_duration_seconds: number;
  identified: boolean;
  applied: boolean;
}

export interface IdentifyDiarizationResponse {
  diarization_id: string;
  entity_id?: string | null;
  total_speakers: number;
  identified_count: number;
  auto_applied: boolean;
  matches: SpeakerMatch[];
}

export interface SemanticSearchResult {
  chunk_id: string;
  source_type: string;
  source_id: string;
  parent_id?: string | null;
  title?: string | null;
  subtitle?: string | null;
  thumbnail_url?: string | null;
  text: string;
  similarity_score: number;
  metadata?: Record<string, any>;
  deep_link?: string | null;

  // Audio/Video convenience fields
  diarization_id?: string;
  content_id?: string;
  video_title?: string | null;
  channel_title?: string | null;
  speaker?: string | null;
  start_time?: number | null;
  end_time?: number | null;
  formatted_start_time?: string | null;
  formatted_end_time?: string | null;
  youtube_url_with_timestamp?: string | null;
}

export interface VectorizationStatus {
  diarization_id: string;
  content_id: string | null;
  chunks_count: number;
  indexed: boolean;
}

export interface VectorizationStats {
  total_chunks: number;
  total_indexed_diarizations: number;
  tei_healthy: boolean;
}

export type ThemeMode = 'cyberpunk' | 'oled' | 'light';
export type LanguageMode = 'en' | 'pt';

// SignalCatcher Types
export interface ContentSource {
  id: string;
  name: string;
  url: string;
  channelId: string;
  channelUrl?: string;
  avatar: string;
  subscriberCount: number;
  lastCaptured: string;
  status: 'active' | 'paused' | 'error' | 'inactive';
  intervalMinutes: number;
  totalCaptured: number;
}

export interface CapturedVideo {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceAvatar: string;
  title: string;
  videoUrl: string;
  thumbnail: string;
  createdAt?: string;
  publishedAt: string;
  duration: number | string;
  views: number;
  likes: number;
  commentsCount: number;
  status: string;
  postgresRecordId: string;
  tags: string[];
  summary?: string;
  description?: string;
  sentimentScore?: number; // -1 to 1
  language?: string;
  deletionRequested?: boolean;
  attemptCount?: number;
  nextRetryAt?: string | null;
  errorInfo?: string | null;
  isDiarized?: boolean;
  diarizationStatus?: string | null;
  diarizationProgress?: number | null;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  sourceApp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  parameters?: { name: string; type: string; required: boolean; desc: string }[];
  requestBodyExample?: any;
  responseExample?: any;
}

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastNotification {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt?: number;
}
