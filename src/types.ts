export type AppId = 'signalcatcher' | 'diarization';

export interface AppTab {
  id: string; // Unique tab instance ID
  appId: AppId;
  title: string;
  icon: string;
  isPinned?: boolean;
  activeSubTab?: string;
  customData?: unknown;
}

export type ThemeMode = 'cyberpunk' | 'oled' | 'light';
export type LanguageMode = 'en' | 'pt';

export type StorageMode = 'LOCAL' | 'DRIVE' | 'BOTH';
export type StorageLocation = StorageMode | 'NONE';

export interface StorageSettings {
    mode: StorageMode;
    uploads_paused: boolean;
    max_upload_mib_per_second: number | null;
    drive_ready: boolean;
    drive_info: {
        folder_id?: string; folder_name?: string; folder_url?: string; account?: string;
        shared_drive_id?: string;
        limit_bytes?: number | null; used_bytes?: number | null; free_bytes?: number | null
    };
    last_error: string | null;
    checked_at: string | null;
    catalog_error: string | null;
    catalog_updated_at: string | null;
}

export interface StorageSummary extends StorageSettings {
    locations: Record<string, number>;
    transfers: Record<string, number>;
    queued_bytes: number;
}

export interface StorageTransfer {
    id: number;
    external_id: string;
    title: string;
    origin: string;
    operation: 'UPLOAD' | 'RESTORE';
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR' | 'MISSING_FILE';
    storage_location: StorageLocation | null;
    bytes_transferred: number;
    total_bytes: number;
    attempts: number;
    error: string | null;
    next_retry_at: string | null;
    updated_at: string;
    file_path: string | null;
    drive_url: string | null;
}

export interface StorageEvent {
    id: number;
    action: string;
    details: string | null;
    previous_location: StorageLocation | null;
    new_location: StorageLocation | null;
    created_at: string;
}

export interface StoragePage<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
}

export interface YoutubeContentStats {
    status_counts: Record<string, number>;
    total_videos: number;
    total_saved_channels: number;
    total_monitored_channels: number;
}

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
    storageLocation?: StorageLocation | null;
    filePath?: string | null;
    driveUrl?: string | null;
    storageVerifiedAt?: string | null;
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
