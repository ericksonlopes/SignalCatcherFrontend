export type AppId = 'signalcatcher' | 'smarthome' | 'followers' | 'creatordash' | 'fastapi' | string;

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
export type LanguageMode = 'pt' | 'en';

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
  status: 'active' | 'paused' | 'error';
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
  isDiarized?: boolean;
  diarizationStatus?: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  status_counts?: Record<string, number>;
  total_status_count?: number;
}

export interface DiarizationItem {
  id: string;
  step: 'STARTED' | 'PENDING' | 'TRANSCRIPTION' | 'ALIGNMENT' | 'DIARIZATION' | 'COMPLETED' | 'ERROR' | string;
  created_at?: string | null;
  entity_id?: string | null;
  entity_type?: string | null;
  title: string;
  channelName: string;
  thumbnail: string;
  duration: string;
  result_json?: any;
}


export interface ScheduledJob {
  id: string;
  name: string;
  targetSource: string;
  cronExpression: string;
  lastRun: string;
  nextRun: string;
  status: 'idle' | 'running' | 'failed' | 'scheduled';
  executionCount: number;
  avgDurationSec: number;
  lastErrorMessage?: string;
}

// Smart Home Types
export interface SmartDevice {
  id: string;
  name: string;
  room: 'Studio' | 'Living Room' | 'Server Rack' | 'Lab' | 'Balcony';
  type: 'light' | 'thermostat' | 'power' | 'camera' | 'sensor';
  status: boolean;
  value?: number;
  unit?: string;
  powerUsageWatts: number;
  batteryPercent?: number;
}

// Follower & Analytics Types
export interface FollowerStats {
  timestamp: string;
  youtube: number;
  instagram: number;
  xTwitter: number;
  tiktok: number;
  gained: number;
  lost: number;
  netChange: number;
  churnReason?: string;
}

export interface CreatorMetric {
  id: string;
  creatorName: string;
  handle: string;
  avatar: string;
  platform: 'YouTube' | 'Twitch' | 'Instagram';
  subscribers: number;
  weeklyViews: number[];
  engagementRate: number;
  growthRatePercent: number;
  topVideo: string;
  uploadConsistency: number; // 0 to 100
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
  responseExample: any;
}
