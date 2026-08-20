import { ContentSource, CapturedVideo, ScheduledJob, SmartDevice, FollowerStats, CreatorMetric, SystemLog, ApiEndpoint } from '../types';

export const INITIAL_SOURCES: ContentSource[] = [];

export const INITIAL_CAPTURES: CapturedVideo[] = [];

export const INITIAL_JOBS: ScheduledJob[] = [];

export const INITIAL_DEVICES: SmartDevice[] = [];

export const INITIAL_FOLLOWER_HISTORY: FollowerStats[] = [];

export const INITIAL_CREATORS: CreatorMetric[] = [];

export const INITIAL_LOGS: SystemLog[] = [];

export const FASTAPI_ENDPOINTS: ApiEndpoint[] = [
  {
    method: 'GET',
    path: '/api/youtube/content',
    description: 'Fetch ingested videos from database with optional search and step filtering',
    parameters: [
      { name: 'page', type: 'integer', required: false, desc: 'Page number' },
      { name: 'limit', type: 'integer', required: false, desc: 'Items per page' },
      { name: 'step', type: 'string', required: false, desc: 'Filter by step status' },
      { name: 'search', type: 'string', required: false, desc: 'Search title or channel' }
    ]
  },
  {
    method: 'POST',
    path: '/api/youtube/monitored_channels',
    description: 'Register a new YouTube channel for monitoring',
    requestBodyExample: {
      name: 'Channel Name',
      url: 'https://youtube.com/@Channel'
    }
  },
  {
    method: 'GET',
    path: '/api/youtube/monitored_channels',
    description: 'List monitored YouTube channels'
  },
  {
    method: 'GET',
    path: '/api/youtube/channels',
    description: 'List saved YouTube channels'
  },
  {
    method: 'GET',
    path: '/api/diarization/list',
    description: 'Fetch paginated diarization tasks'
  }
];

