import { ContentSource, CapturedVideo, ScheduledJob, SmartDevice, FollowerStats, CreatorMetric, SystemLog, ApiEndpoint } from '../types';

export const INITIAL_SOURCES: ContentSource[] = [
  {
    id: 'src-1',
    name: 'TechLead Chronicles',
    type: 'youtube',
    url: 'https://youtube.com/@TechLeadChronicles',
    channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    subscriberCount: 1420000,
    lastCaptured: '2026-08-07T06:15:00Z',
    status: 'active',
    intervalMinutes: 60,
    totalCaptured: 342
  },
  {
    id: 'src-2',
    name: 'Fireship Code Briefs',
    type: 'youtube',
    url: 'https://youtube.com/@Fireship',
    channelId: 'UCsBjURrP6M6nKV5J_u7t_A',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    subscriberCount: 3100000,
    lastCaptured: '2026-08-07T05:40:00Z',
    status: 'active',
    intervalMinutes: 30,
    totalCaptured: 820
  },
  {
    id: 'src-3',
    name: 'Python FastAPI Mastery',
    type: 'rss',
    url: 'https://fastapi.tiangolo.com/feed.xml',
    channelId: 'RSS_FASTAPI_OFFICIAL',
    avatar: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=150&auto=format&fit=crop&q=80',
    subscriberCount: 89000,
    lastCaptured: '2026-08-06T22:10:00Z',
    status: 'active',
    intervalMinutes: 120,
    totalCaptured: 115
  },
  {
    id: 'src-4',
    name: 'Lex AI & Robotics Podcast',
    type: 'youtube',
    url: 'https://youtube.com/@LexFridman',
    channelId: 'UCSHZKyAwbN7035so8y3805g',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    subscriberCount: 4200000,
    lastCaptured: '2026-08-07T01:00:00Z',
    status: 'active',
    intervalMinutes: 180,
    totalCaptured: 450
  },
  {
    id: 'src-5',
    name: 'Marques Tech Reviews',
    type: 'youtube',
    url: 'https://youtube.com/@MKBHD',
    channelId: 'UCBJycsmduvYEL83R_U4JriQ',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    subscriberCount: 18500000,
    lastCaptured: '2026-08-05T14:20:00Z',
    status: 'paused',
    intervalMinutes: 360,
    totalCaptured: 910
  }
];

export const INITIAL_CAPTURES: CapturedVideo[] = [];

export const INITIAL_JOBS: ScheduledJob[] = [
  {
    id: 'job-1',
    name: 'YouTube Daily Video Harvester',
    targetSource: 'All Active Channels (4 sources)',
    cronExpression: '0 */1 * * *',
    lastRun: '2026-08-07T06:00:00Z',
    nextRun: '2026-08-07T07:00:00Z',
    status: 'scheduled',
    executionCount: 1420,
    avgDurationSec: 4.8
  },
  {
    id: 'job-2',
    name: 'PostgreSQL Metadata Sync & Vector Indexing',
    targetSource: 'PostgreSQL DB signalcatcher_db',
    cronExpression: '*/15 * * * *',
    lastRun: '2026-08-07T07:15:00Z',
    nextRun: '2026-08-07T07:30:00Z',
    status: 'idle',
    executionCount: 5890,
    avgDurationSec: 1.2
  },
  {
    id: 'job-3',
    name: 'AI Content Sentiment & Categorizer',
    targetSource: 'Unprocessed Ingestions Queue',
    cronExpression: '*/30 * * * *',
    lastRun: '2026-08-07T07:00:00Z',
    nextRun: '2026-08-07T07:30:00Z',
    status: 'idle',
    executionCount: 2940,
    avgDurationSec: 8.5
  },
  {
    id: 'job-4',
    name: 'FastAPI Health & Webhook Alerting',
    targetSource: 'FastAPI Engine http://localhost:8000',
    cronExpression: '*/5 * * * *',
    lastRun: '2026-08-07T07:25:00Z',
    nextRun: '2026-08-07T07:30:00Z',
    status: 'idle',
    executionCount: 18400,
    avgDurationSec: 0.3
  }
];

export const INITIAL_DEVICES: SmartDevice[] = [
  { id: 'dev-1', name: 'Server Rack Ambient LED', room: 'Server Rack', type: 'light', status: true, powerUsageWatts: 18, unit: 'Color' },
  { id: 'dev-2', name: 'Main Server Temperature', room: 'Server Rack', type: 'sensor', status: true, value: 38.5, unit: '°C', powerUsageWatts: 2.5 },
  { id: 'dev-3', name: 'Studio Neon Glow Strip', room: 'Studio', type: 'light', status: true, powerUsageWatts: 45 },
  { id: 'dev-4', name: 'Studio Air Conditioner', room: 'Studio', type: 'thermostat', status: true, value: 21.5, unit: '°C', powerUsageWatts: 850 },
  { id: 'dev-5', name: 'Smart Power Socket - GPU Workstation', room: 'Lab', type: 'power', status: true, value: 420, unit: 'W', powerUsageWatts: 420 },
  { id: 'dev-6', name: 'Lab Environment Sensor', room: 'Lab', type: 'sensor', status: true, value: 45, unit: '% Humidity', powerUsageWatts: 1.2, batteryPercent: 92 },
  { id: 'dev-7', name: 'Living Room Smart Display', room: 'Living Room', type: 'camera', status: true, powerUsageWatts: 12 },
  { id: 'dev-8', name: 'Balcony Security Node', room: 'Balcony', type: 'camera', status: true, powerUsageWatts: 5, batteryPercent: 88 }
];

export const INITIAL_FOLLOWER_HISTORY: FollowerStats[] = [
  { timestamp: '08:00', youtube: 1420100, instagram: 310200, xTwitter: 189400, tiktok: 520000, gained: 420, lost: 45, netChange: 375 },
  { timestamp: '10:00', youtube: 1420350, instagram: 310180, xTwitter: 189350, tiktok: 520400, gained: 380, lost: 120, netChange: 260, churnReason: 'Video upload topic debate' },
  { timestamp: '12:00', youtube: 1420800, instagram: 310400, xTwitter: 189500, tiktok: 521100, gained: 890, lost: 80, netChange: 810 },
  { timestamp: '14:00', youtube: 1421100, instagram: 310350, xTwitter: 189480, tiktok: 521500, gained: 410, lost: 190, netChange: 220, churnReason: 'Unfollow algorithm cleanup' },
  { timestamp: '16:00', youtube: 1421900, instagram: 310800, xTwitter: 189900, tiktok: 522800, gained: 1540, lost: 95, netChange: 1445 },
  { timestamp: '18:00', youtube: 1422400, instagram: 311100, xTwitter: 190200, tiktok: 523400, gained: 980, lost: 110, netChange: 870 },
  { timestamp: '20:00', youtube: 1422950, instagram: 311300, xTwitter: 190450, tiktok: 524100, gained: 1120, lost: 140, netChange: 980 }
];

export const INITIAL_CREATORS: CreatorMetric[] = [
  {
    id: 'cr-1',
    creatorName: 'TechLead Chronicles',
    handle: '@TechLead',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    platform: 'YouTube',
    subscribers: 1420000,
    weeklyViews: [120000, 185000, 140000, 210000, 195000, 240000, 280000],
    engagementRate: 8.4,
    growthRatePercent: 3.8,
    topVideo: 'Why I Switched Architecture',
    uploadConsistency: 92
  },
  {
    id: 'cr-2',
    creatorName: 'Fireship',
    handle: '@Fireship',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    platform: 'YouTube',
    subscribers: 3100000,
    weeklyViews: [850000, 920000, 1100000, 1050000, 1250000, 1400000, 1650000],
    engagementRate: 11.2,
    growthRatePercent: 5.4,
    topVideo: 'Python 3.14 in 100s',
    uploadConsistency: 98
  },
  {
    id: 'cr-3',
    creatorName: 'Lex Fridman',
    handle: '@LexFridman',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    platform: 'YouTube',
    subscribers: 4200000,
    weeklyViews: [1800000, 1600000, 2100000, 2400000, 2200000, 2900000, 3100000],
    engagementRate: 9.8,
    growthRatePercent: 4.1,
    topVideo: 'Sam Altman Dialogue',
    uploadConsistency: 85
  },
  {
    id: 'cr-4',
    creatorName: 'Marques Brownlee',
    handle: '@MKBHD',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    platform: 'YouTube',
    subscribers: 18500000,
    weeklyViews: [4500000, 5200000, 4800000, 6100000, 5900000, 6400000, 7200000],
    engagementRate: 7.9,
    growthRatePercent: 2.1,
    topVideo: 'Vision Pro 2 Review',
    uploadConsistency: 90
  }
];

export const INITIAL_LOGS: SystemLog[] = [
  { id: 'log-1', timestamp: '07:30:12', sourceApp: 'SignalCatcher', level: 'info', message: 'Cron Job [YouTube Daily Harvester] triggered successfully' },
  { id: 'log-2', timestamp: '07:29:45', sourceApp: 'FastAPI Backend', level: 'success', message: 'REST API GET /api/v1/captures 200 OK (12ms)' },
  { id: 'log-3', timestamp: '07:28:10', sourceApp: 'Smart Home', level: 'info', message: 'Server Rack Temperature sensor reading updated: 38.5°C' },
  { id: 'log-4', timestamp: '07:25:00', sourceApp: 'SignalCatcher', level: 'success', message: 'Captured video: Python 3.14 Features in PostgreSQL ID pg_uuid_9921' },
  { id: 'log-5', timestamp: '07:20:15', sourceApp: 'Follower Tracker', level: 'warning', message: 'Churn alert: 120 unfollows detected on X/Twitter after post #842' },
  { id: 'log-6', timestamp: '07:15:00', sourceApp: 'PostgreSQL DB', level: 'info', message: 'pg_stat_activity: 12 active client pools connected to signalcatcher_db' }
];

export const FASTAPI_ENDPOINTS: ApiEndpoint[] = [
  {
    method: 'GET',
    path: '/api/v1/sources',
    description: 'Fetch all monitored content sources (YouTube, RSS, Twitch) from PostgreSQL',
    parameters: [
      { name: 'status', type: 'string', required: false, desc: 'Filter by active/paused status' },
      { name: 'limit', type: 'integer', required: false, desc: 'Pagination size (default 20)' }
    ],
    responseExample: {
      status: 'success',
      total: 5,
      data: INITIAL_SOURCES
    }
  },
  {
    method: 'POST',
    path: '/api/v1/sources',
    description: 'Register a new YouTube channel or RSS feed source for daily capture',
    requestBodyExample: {
      name: 'Tech Insider Feed',
      type: 'youtube',
      url: 'https://youtube.com/@TechInsider',
      intervalMinutes: 60
    },
    responseExample: {
      status: 'created',
      source_id: 'src-6',
      message: 'Content source registered in PostgreSQL successfully'
    }
  },
  {
    method: 'GET',
    path: '/api/v1/captures',
    description: 'Query ingested videos with optional keyword search and source filters',
    parameters: [
      { name: 'source_id', type: 'string', required: false, desc: 'Filter by source ID' },
      { name: 'q', type: 'string', required: false, desc: 'Search title and tags' }
    ],
    responseExample: {
      status: 'success',
      count: 4,
      videos: INITIAL_CAPTURES
    }
  },
  {
    method: 'POST',
    path: '/api/v1/jobs/trigger/{job_id}',
    description: 'Trigger immediate async background task (Celery / FastAPI BackgroundTasks)',
    parameters: [
      { name: 'job_id', type: 'string', required: true, desc: 'Unique ID of scheduled job' }
    ],
    responseExample: {
      status: 'dispatched',
      task_id: 'celery-task-8821a',
      estimated_execution_ms: 1200
    }
  },
  {
    method: 'GET',
    path: '/api/v1/health',
    description: 'FastAPI & PostgreSQL async connection health check endpoint',
    responseExample: {
      status: 'healthy',
      fastapi_version: '0.115.0',
      postgresql: { connected: true, latency_ms: 1.4, db_name: 'signalcatcher_db' },
      system_uptime_seconds: 148290
    }
  }
];
