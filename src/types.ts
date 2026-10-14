export type AppId = 'signalcatcher' | 'diarization';

export interface AppTab {
  id: string; // Unique tab instance ID
  appId: AppId;
  title: string;
  icon: string;
  isPinned?: boolean;
  activeSubTab?: string;
  customData?: any;
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
