import React, {useState, useEffect, useMemo} from 'react';
import {
  Clock,
  Database,
  ExternalLink,
  ListVideo,
  Loader2,
  PauseCircle,
  Play,
  PlayCircle,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  UploadCloud,
  Video,
  X,
  ChevronLeft,
  ChevronRight,
  Youtube,
  Trash,
  Activity,
  AlertCircle,
  CheckCircle2,
  ServerCrash,
  ListMusic,
  Mic,
  MicOff
} from 'lucide-react';

import {CapturedVideo, ContentSource, LanguageMode, ScheduledJob} from '../../types';
import {getTranslation} from '../../locales';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const formatDuration = (duration: number | string | undefined | null): string => {
  if (duration == null) return '00:00:00';
  if (typeof duration === 'string') {
    if (duration.includes(':')) {
      const parts = duration.split(':');
      if (parts.length === 2) {
        return `00:${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      }
      if (parts.length === 3) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
      }
      return duration;
    }
    const parsed = parseInt(duration, 10);
    if (isNaN(parsed)) return duration;
    duration = parsed;
  }
  
  const h = Math.floor(duration / 3600);
  const m = Math.floor((duration % 3600) / 60);
  const s = Math.floor(duration % 60);
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};



interface SignalCatcherAppProps {
  language?: LanguageMode;
  sources: ContentSource[];
  setSources: React.Dispatch<React.SetStateAction<ContentSource[]>>;
  savedChannels?: ContentSource[];
  captures: CapturedVideo[];
  setCaptures: React.Dispatch<React.SetStateAction<CapturedVideo[]>>;
  jobs: ScheduledJob[];
  setJobs: React.Dispatch<React.SetStateAction<ScheduledJob[]>>;
  onTriggerJob: (jobId: string) => void;
  onAddLog: (sourceApp: string, level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  limit?: number;
  onLimitChange?: (limit: number) => void;
  stepFilter?: string;
  onStepFilterChange?: (step: string) => void;
  channelFilter?: string;
  onChannelFilterChange?: (channel: string) => void;
  searchQuery?: string;

  onSearchQueryChange?: (search: string) => void;
  onOpenNotifications?: () => void;
  onRefresh?: () => void;
  isLoadingData?: boolean;
  statusCounts?: Record<string, number>;
  totalStatusCount?: number;
  totalSavedCount?: number;
  totalMonitoredCount?: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED': return 'text-emerald-400';
    case 'ERROR':
    case 'COPYRIGHT_REMOVED':
    case 'ACCOUNT_TERMINATED':
    case 'VIDEO_REMOVED':
    case 'PRIVATE_VIDEO':
    case 'AGE_RESTRICTED':
    case 'MEMBERS_ONLY':
      return 'text-rose-400';
    case 'REPROCESSING':
      return 'text-cyan-400';
    case 'PENDING_DOWNLOAD':
    case 'DOWNLOADING':
    case 'PENDING_METADATA_EXTRACTION':
    case 'EXTRACTING_METADATA':
      return 'text-amber-400';
    default:
      return 'text-zinc-400';
  }
};

export const SignalCatcherApp: React.FC<SignalCatcherAppProps> = ({
  language = 'en',
  sources,
  setSources,
  savedChannels = [],
  captures,
  setCaptures,
  jobs,
  setJobs,
  onTriggerJob,
  onAddLog,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  limit,
  onLimitChange,
  stepFilter = '',
  onStepFilterChange,
  channelFilter = '',
  onChannelFilterChange,
  searchQuery = '',

  onSearchQueryChange,
  onOpenNotifications,
  onRefresh,
  isLoadingData = false,
  statusCounts = {},
  totalStatusCount = 0,
  totalSavedCount = 0,
  totalMonitoredCount = 0
}) => {
  const { t } = getTranslation(language);
  const [subTab, setSubTab] = useState<'captures' | 'saved_channels' | 'sources' | 'jobs' | 'tracking'>('captures');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  
  const [isTriggeringMetadata, setIsTriggeringMetadata] = useState(false);
  const [isTriggeringDownload, setIsTriggeringDownload] = useState(false);
  
  const query = onSearchQueryChange ? searchQuery : localSearchQuery;
  const handleSearchChange = (val: string) => {
    if (onSearchQueryChange) onSearchQueryChange(val);
    else setLocalSearchQuery(val);
  };

  // Modal State
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'content' | 'playlist' | 'sources'>('content');
  const [selectedVideo, setSelectedVideo] = useState<CapturedVideo | null>(null);

  // Form State for API Routes
  const [manualUrl, setManualUrl] = useState('');
  const [saveInPlaylistFolder, setSaveInPlaylistFolder] = useState(false);
  const [isProcessingManual, setIsProcessingManual] = useState(false);

  // Map channel external_id -> display title/name for select filter and display
  const channelOptions = useMemo(() => {
    const map = new Map<string, string>(); // external_id -> display_name

    // 1. Saved channels
    (savedChannels || []).forEach((c) => {
      if (c.channelId) {
        map.set(c.channelId, c.name || c.channelId);
      }
    });

    // 2. Monitored sources
    (sources || []).forEach((s) => {
      if (s.channelId) {
        if (!map.has(s.channelId) || map.get(s.channelId) === s.channelId) {
          map.set(s.channelId, s.name || s.channelId);
        }
      }
    });

    // 3. Captures (for any external_id not in saved/monitored channels)
    (captures || []).forEach((c) => {
      if (c.sourceName && !map.has(c.sourceName)) {
        map.set(c.sourceName, c.sourceName);
      }
    });

    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], undefined, { sensitivity: 'base' })
    );
  }, [savedChannels, sources, captures]);

  const channelMap = useMemo(() => {
    return new Map(channelOptions);
  }, [channelOptions]);

  // New source form state
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');

  // Filtered captures
  const [isRetryingGlobal, setIsRetryingGlobal] = useState(false);
  const [retryingVideoIds, setRetryingVideoIds] = useState<Set<string>>(new Set());
  const [deletingVideoIds, setDeletingVideoIds] = useState<Set<string>>(new Set());
  const [videoToDelete, setVideoToDelete] = useState<CapturedVideo | null>(null);

  const [diarizationModalVideo, setDiarizationModalVideo] = useState<CapturedVideo | null>(null);
  const [diarizationLanguage, setDiarizationLanguage] = useState<string>('en');
  const [isDiarizing, setIsDiarizing] = useState(false);

  const handleGlobalRetry = async () => {
    setIsRetryingGlobal(true);
    onAddLog('SignalCatcher', 'info', t('notifGlobalRetryStart'));
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/content/retry-errors`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      onAddLog('SignalCatcher', 'success', t('notifGlobalRetrySuccess'));
      if (onRefresh) onRefresh();
      if (onOpenNotifications) onOpenNotifications();
    } catch (err) {
      onAddLog('SignalCatcher', 'error', `${t('notifGlobalRetryError')} ${err}`);
    } finally {
      setIsRetryingGlobal(false);
    }
  };

  const handleIndividualRetry = async (e: React.MouseEvent, video: CapturedVideo) => {
    e.stopPropagation();
    
    let externalId = video.postgresRecordId || video.id;
    if (video.videoUrl) {
      const match = video.videoUrl.match(/(?:v=|\/)([\w-]{11})(?:\?|&|$)/);
      if (match) externalId = match[1];
    }

    setRetryingVideoIds(prev => new Set(prev).add(video.id));
    onAddLog('SignalCatcher', 'info', `${t('notifIndivRetryStart')} ${externalId}...`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/content/${externalId}/retry`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      onAddLog('SignalCatcher', 'success', t('notifIndivRetrySuccess'));
      
      setCaptures(prev => prev.map(v => 
        v.id === video.id 
          ? { ...v, status: 'REPROCESSING' } 
          : v
      ));
      
    } catch (err) {
      onAddLog('SignalCatcher', 'error', `${t('notifIndivRetryError')} ${err}`);
    } finally {
      setRetryingVideoIds(prev => {
        const next = new Set(prev);
        next.delete(video.id);
        return next;
      });
    }
  };

  const handleIndividualDelete = async (e: React.MouseEvent, video: CapturedVideo) => {
    e.stopPropagation();
    
    let externalId = video.postgresRecordId || video.id;
    if (video.videoUrl) {
      const match = video.videoUrl.match(/(?:v=|\/)([\w-]{11})(?:\?|&|$)/);
      if (match) externalId = match[1];
    }

    setDeletingVideoIds(prev => new Set(prev).add(video.id));
    onAddLog('SignalCatcher', 'info', `Excluindo vídeo e arquivo ${externalId}...`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/content/${externalId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      onAddLog('SignalCatcher', 'success', `Vídeo ${externalId} excluído com sucesso!`);
      
      setCaptures(prev => prev.map(v => 
        v.id === video.id 
          ? { ...v, status: 'DELETED' } 
          : v
      ));
      
    } catch (err) {
      onAddLog('SignalCatcher', 'error', `Falha ao excluir vídeo: ${err}`);
    } finally {
      setDeletingVideoIds(prev => {
        const next = new Set(prev);
        next.delete(video.id);
        return next;
      });
    }
  };

  const handleDiarizationClick = (e: React.MouseEvent, video: CapturedVideo) => {
    e.stopPropagation();
    setDiarizationModalVideo(video);
    setDiarizationLanguage(video.language || 'en');
  };

  const confirmDiarization = async () => {
    if (!diarizationModalVideo) return;
    
    let externalId = diarizationModalVideo.postgresRecordId || diarizationModalVideo.id;
    if (diarizationModalVideo.videoUrl) {
      const match = diarizationModalVideo.videoUrl.match(/(?:v=|\/)([\w-]{11})(?:\?|&|$)/);
      if (match) externalId = match[1];
    }

    onAddLog('SignalCatcher', 'info', `Iniciando diarização para o vídeo ${externalId}...`);
    setIsDiarizing(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/diarization/youtube/${externalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: diarizationLanguage || 'en' }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      onAddLog('SignalCatcher', 'success', `Diarização iniciada com sucesso (Task ID: ${data.task_id})`);
      setCaptures((prevCaptures) =>
        prevCaptures.map((c) =>
          c.id === diarizationModalVideo.id
            ? { ...c, isDiarized: false, diarizationStatus: 'PENDING' }
            : c
        )
      );
      if (selectedVideo && selectedVideo.id === diarizationModalVideo.id) {
        setSelectedVideo((prev) =>
          prev ? { ...prev, isDiarized: false, diarizationStatus: 'PENDING' } : null
        );
      }
      setDiarizationModalVideo(null);

      
    } catch (err: any) {
      onAddLog('SignalCatcher', 'error', `Falha ao iniciar diarização: ${err.message || err}`);
    } finally {
      setIsDiarizing(false);
    }
  };

  // Filtered captures (sources only, captures are pre-filtered by backend)
  const filteredSources = sources.filter((s) => {
    const q = query.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.channelId.toLowerCase().includes(q);
  });

  // Handler for POST /api/youtube/sources
  const handleRegisterSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceUrl) return;

    setIsProcessingManual(true);
    onAddLog('SignalCatcher', 'info', `${t('notifSendingSource')} ${newSourceUrl}`);

    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/monitored_channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSourceUrl.split('@')[1] || 'Novo Canal', url: newSourceUrl })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const resData = await response.json();
      onAddLog('SignalCatcher', 'success', `${t('notifSuccessSource')} ${resData.id || 'OK'})`);
      
      if (onOpenNotifications) {
        onOpenNotifications();
      }

      setNewSourceUrl('');
      setIsIngestionModalOpen(false);
    } catch (err) {
      onAddLog('SignalCatcher', 'error', `${t('notifErrorSource')} ${err}`);
    } finally {
      setIsProcessingManual(false);
    }
  };

  // Handler for POST /api/youtube/content
  const handleIngestContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl) return;

    setIsProcessingManual(true);
    onAddLog('SignalCatcher', 'info', `${t('notifSendingVideo')} ${manualUrl}`);

    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: manualUrl })
      });

      if (!response.ok) {
        let errorDetail = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.detail) {
            errorDetail = errorData.detail;
          }
        } catch (e) {
          // Ignore json parse error
        }
        throw new Error(errorDetail);
      }

      const resData = await response.json();
      
      onAddLog('SignalCatcher', 'success', `${t('notifSuccessVideo')} ${resData.message || 'OK'})`);
      
      if (onOpenNotifications) {
        onOpenNotifications();
      }

      if (onRefresh) {
        onRefresh();
      }

      setManualUrl('');
      setIsIngestionModalOpen(false);
    } catch (err) {
      onAddLog('SignalCatcher', 'error', `${t('notifErrorVideo')} ${err instanceof Error ? err.message : String(err)}`);
      if (onOpenNotifications) {
        onOpenNotifications();
      }
    } finally {
      setIsProcessingManual(false);
    }
  };

  // Handler for POST /api/youtube/playlist
  const handleIngestPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl) return;

    setIsProcessingManual(true);
    onAddLog('SignalCatcher', 'info', `${t('notifSendingPlaylist')} ${manualUrl}`);

    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/playlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: manualUrl, 
          save_in_playlist_folder: saveInPlaylistFolder 
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const resData = await response.json();
      
      onAddLog('SignalCatcher', 'success', `${t('notifSuccessPlaylist')} (${resData.message || 'OK'})`);
      
      if (onOpenNotifications) {
        onOpenNotifications();
      }

      if (onRefresh) {
        onRefresh();
      }

      setManualUrl('');
      setIsIngestionModalOpen(false);
    } catch (err) {
      onAddLog('SignalCatcher', 'error', `${t('notifErrorPlaylist')} ${err}`);
    } finally {
      setIsProcessingManual(false);
    }
  };

  const handleToggleSourceStatus = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/monitored_channels/${id}/status`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      setSources(sources.map(s => {
        if (s.id === id) {
          const nextStatus = data.active ? 'active' : 'paused';
          onAddLog('SignalCatcher', 'info', `Status da fonte ${s.name} alterado para ${nextStatus}`);
          return { ...s, status: nextStatus };
        }
        return s;
      }));
    } catch (err) {
      onAddLog('SignalCatcher', 'error', `Erro ao alternar status do canal: ${err}`);
    }
  };

  const handleTriggerMetadata = async () => {
    setIsTriggeringMetadata(true);
    onAddLog('SignalCatcher', 'info', 'Iniciando extração de metadados em lote...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/content/trigger-metadata-extraction`, { method: 'POST' });
      if (!response.ok) throw new Error('Falha ao acionar job de metadados');
      onAddLog('SignalCatcher', 'success', 'Job de extração de metadados enfileirado com sucesso.');
      onRefresh?.();
    } catch (err) {
      onAddLog('SignalCatcher', 'error', `Erro ao acionar job de metadados: ${err}`);
    } finally {
      setIsTriggeringMetadata(false);
    }
  };

  const handleTriggerDownload = async () => {
    setIsTriggeringDownload(true);
    onAddLog('SignalCatcher', 'info', 'Iniciando download de vídeos em lote...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/content/trigger-downloads`, { method: 'POST' });
      if (!response.ok) throw new Error('Falha ao acionar job de downloads');
      onAddLog('SignalCatcher', 'success', 'Job de download de vídeos enfileirado com sucesso.');
      onRefresh?.();
    } catch (err) {
      onAddLog('SignalCatcher', 'error', `Erro ao acionar job de downloads: ${err}`);
    } finally {
      setIsTriggeringDownload(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-100 font-sans p-2 sm:p-4 space-y-4 overflow-y-auto animate-in fade-in duration-500">
      {/* Top App Hero & Overview Bar - Bento Grid Card */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all hover:border-zinc-700/80">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">{t('appTitle')}</h2>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                {t('dbConnected')}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              {t('appDescription')}
            </p>
          </div>
        </div>
      </div>
      
      {/* Sub-Navigation Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            onClick={() => setSubTab('captures')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
              subTab === 'captures'
                ? 'bg-zinc-800 border-zinc-700 text-zinc-100 font-bold shadow-sm'
                : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t('capturedFeeds')} ({totalStatusCount || captures.length})</span>
          </button>

          <button
            onClick={() => setSubTab('saved_channels')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
              subTab === 'saved_channels'
                ? 'bg-zinc-800 border-zinc-700 text-zinc-100 font-bold shadow-sm'
                : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Youtube className="w-3.5 h-3.5 text-red-500" />
            <span>{t('savedChannels')} ({totalSavedCount || savedChannels.length})</span>
          </button>

          <button
            onClick={() => setSubTab('sources')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
              subTab === 'sources'
                ? 'bg-zinc-800 border-zinc-700 text-zinc-100 font-bold shadow-sm'
                : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('monitoredSources')} ({totalMonitoredCount || sources.length})</span>
          </button>

          <button
            onClick={() => setSubTab('tracking')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
              subTab === 'tracking'
                ? 'bg-zinc-800 border-zinc-700 text-zinc-100 font-bold shadow-sm'
                : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>{t('tabTracking' as any) || 'Tracking'}</span>
          </button>
        </div>

        {/* Action Trigger Buttons */}
        <div className="flex items-center gap-2">
          {subTab === 'captures' && (
            <button
              onClick={handleGlobalRetry}
              disabled={isRetryingGlobal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium text-xs transition-all shadow-sm disabled:opacity-50"
              title={t('titleReprocessFailures')}
            >
              <RefreshCw className={`w-4 h-4 ${isRetryingGlobal ? 'animate-spin text-indigo-400' : 'text-zinc-400'}`} />
              <span className="hidden sm:inline">{t('btnReprocessFailures')}</span>
            </button>
          )}
          <button
            onClick={() => {
              setModalMode('content');
              setIsIngestionModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-md shadow-indigo-600/20 hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('btnNewIngestionOrSource')}</span>
          </button>
        </div>
      </div>
      
      {/* CONSTANTES PARA O TRACKING */}
      {(() => {
        if (subTab !== 'tracking') return null;
        
        const PIPELINE_MAIN_FLOW = [
          { id: 'STARTED', label: 'STARTED', icon: PlayCircle, color: 'text-zinc-400', bg: 'bg-zinc-400/10', border: 'border-zinc-400/20', action: 'metadata' },
          { id: 'PENDING_METADATA_EXTRACTION', label: 'PENDING METADATA EXTRACTION', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', action: 'metadata' },
          { id: 'EXTRACTING_METADATA', label: 'EXTRACTING METADATA', icon: Loader2, color: 'text-amber-300', bg: 'bg-amber-300/10', border: 'border-amber-300/20', action: 'metadata' },
          { id: 'METADATA_EXTRACTED', label: 'METADATA EXTRACTED', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', action: 'download' },
          { id: 'PENDING_DOWNLOAD', label: 'PENDING DOWNLOAD', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', action: 'download' },
          { id: 'DOWNLOADING', label: 'DOWNLOADING', icon: Loader2, color: 'text-blue-300', bg: 'bg-blue-300/10', border: 'border-blue-300/20', action: 'download' },
          { id: 'DOWNLOADED', label: 'DOWNLOADED', icon: CheckCircle2, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20', action: 'download' },
          { id: 'COMPLETED', label: 'COMPLETED', icon: Sparkles, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', action: 'completed' },
        ];

        const PIPELINE_EXCEPTIONS = [
          { id: 'MEMBERS_ONLY', label: 'MEMBERS ONLY', icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
          { id: 'AGE_RESTRICTED', label: 'AGE RESTRICTED', icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
          { id: 'PRIVATE_VIDEO', label: 'PRIVATE VIDEO', icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
          { id: 'COPYRIGHT_REMOVED', label: 'COPYRIGHT REMOVED', icon: ServerCrash, color: 'text-red-600', bg: 'bg-red-600/10', border: 'border-red-600/20' },
          { id: 'ACCOUNT_TERMINATED', label: 'ACCOUNT TERMINATED', icon: ServerCrash, color: 'text-red-600', bg: 'bg-red-600/10', border: 'border-red-600/20' },
          { id: 'VIDEO_REMOVED', label: 'VIDEO REMOVED', icon: ServerCrash, color: 'text-red-600', bg: 'bg-red-600/10', border: 'border-red-600/20' },
        ];
        
        const PIPELINE_OTHER = [
          { id: 'ERROR', label: 'ERROR', icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20', action: 'retry' },
          { id: 'REPROCESSING', label: 'REPROCESSING', icon: RefreshCw, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', action: 'retry' },
          { id: 'DELETED', label: 'DELETED', icon: Trash, color: 'text-zinc-600', bg: 'bg-zinc-600/10', border: 'border-zinc-600/20', action: 'none' },
        ];
        
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl shadow-sm gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-fuchsia-500/10 rounded-xl border border-fuchsia-500/20 text-fuchsia-400">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-100">{t('trackingPipelineTitle' as any) || 'Tracking de Pipeline'}</h3>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">{t('trackingPipelineDesc' as any) || 'Visão geral do processamento do YouTube Catcher Engine'}</p>
                </div>
              </div>
              
              <button
                onClick={handleGlobalRetry}
                disabled={isRetryingGlobal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 font-medium text-xs transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRetryingGlobal ? 'animate-spin' : ''}`} />
                <span>Reprocessar Todas as Falhas</span>
              </button>
            </div>

            <div className="flex flex-col gap-6">
              {/* FLUXO PRINCIPAL */}
              <div className="bg-zinc-950/40 p-4 rounded-3xl border border-zinc-800/60">
                <h4 className="text-[11px] font-bold text-zinc-500 mb-4 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  {t('trackingMainFlow' as any) || 'Fluxo Principal de Captura'}
                </h4>
                
                <div className="flex items-center justify-between w-full gap-2 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900/50">
                  {PIPELINE_MAIN_FLOW.map((step, idx) => {
                    const count = statusCounts[step.id] || 0;
                    const hasNext = idx < PIPELINE_MAIN_FLOW.length - 1;
                    
                    return (
                      <React.Fragment key={step.id}>
                        <div className="flex-1 min-w-[155px] bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 flex flex-col gap-2.5 hover:border-zinc-700 transition-all shadow-sm shrink-0 relative">
                          <div className="flex items-start justify-between">
                            <div className={`p-2.5 rounded-xl border ${step.bg} ${step.border} ${step.color}`}>
                              <step.icon className={`w-4 h-4 ${step.animate ? 'animate-spin' : ''}`} />
                            </div>
                            
                            {step.action === 'metadata' && (
                              <button 
                                onClick={handleTriggerMetadata} 
                                disabled={isTriggeringMetadata || count === 0}
                                className="text-[10px] uppercase font-bold tracking-wider px-2 py-1.5 bg-amber-500/20 text-amber-400 rounded-md border border-amber-500/30 hover:bg-amber-500/30 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isTriggeringMetadata ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                                {t('btnExtract' as any) || 'Extrair'}
                              </button>
                            )}
                            {step.action === 'download' && (
                              <button 
                                onClick={handleTriggerDownload} 
                                disabled={isTriggeringDownload || count === 0}
                                className="text-[10px] uppercase font-bold tracking-wider px-2 py-1.5 bg-blue-500/20 text-blue-400 rounded-md border border-blue-500/30 hover:bg-blue-500/30 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isTriggeringDownload ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                                {t('btnDownload' as any) || 'Baixar'}
                              </button>
                            )}
                            {step.action === 'completed' && (
                              <button 
                                disabled
                                className="text-[10px] uppercase font-bold tracking-wider px-2 py-1.5 bg-emerald-500/10 text-emerald-500/50 rounded-md border border-emerald-500/20 transition-colors flex items-center gap-1 cursor-not-allowed"
                              >
                                {t('btnCompleted' as any) || 'Finalizado'}
                              </button>
                            )}
                          </div>
                          
                          <div>
                            <div className="text-3xl font-black text-zinc-100 tracking-tight">{count}</div>
                            <div className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-wider leading-tight h-8 flex items-center">{step.label}</div>
                          </div>
                        </div>
                        
                        {hasNext && (
                          <div className="flex shrink-0 text-zinc-700 mx-1">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* CONTROLE E MANUTENÇÃO */}
              <div className="bg-zinc-950/40 p-4 rounded-3xl border border-zinc-800/60">
                <h4 className="text-[11px] font-bold text-zinc-500 mb-4 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                  {t('trackingMaintenance' as any) || 'Manutenção e Ciclo de Vida'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {PIPELINE_OTHER.map((step) => {
                    const count = statusCounts[step.id] || 0;
                    return (
                      <div key={step.id} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-zinc-700 transition-all shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className={`p-2.5 rounded-xl border ${step.bg} ${step.border} ${step.color}`}>
                            <step.icon className={`w-5 h-5 ${step.animate ? 'animate-spin' : ''}`} />
                          </div>
                          {step.action === 'retry' && (
                            <button 
                              onClick={handleGlobalRetry} 
                              disabled={isRetryingGlobal || count === 0}
                              className="text-[10px] uppercase font-bold tracking-wider px-2 py-1.5 bg-rose-500/20 text-rose-400 rounded-md border border-rose-500/30 hover:bg-rose-500/30 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isRetryingGlobal ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                              {t('btnExecute' as any) || 'Executar'}
                            </button>
                          )}
                          {step.action === 'none' && (
                            <button 
                              disabled
                              className="text-[10px] uppercase font-bold tracking-wider px-2 py-1.5 bg-zinc-500/10 text-zinc-500/50 rounded-md border border-zinc-500/20 transition-colors flex items-center gap-1 cursor-not-allowed"
                            >
                              {t('btnInactive' as any) || 'Inativo'}
                            </button>
                          )}
                        </div>
                        
                        <div>
                          <div className="text-2xl font-black text-zinc-100 tracking-tight">{count}</div>
                          <div className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-wider h-6 flex items-center">{step.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* EXCEÇÕES E ESTADOS TERMINAIS */}
              <div className="bg-zinc-950/40 p-4 rounded-3xl border border-zinc-800/60">
                <h4 className="text-[11px] font-bold text-zinc-500 mb-4 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                  {t('trackingExceptions' as any) || 'Exceções e Estados Terminais'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {PIPELINE_EXCEPTIONS.map((step) => {
                    const count = statusCounts[step.id] || 0;
                    return (
                      <div key={step.id} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-zinc-700 transition-all shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className={`p-2.5 rounded-xl border ${step.bg} ${step.border} ${step.color}`}>
                            <step.icon className={`w-5 h-5 ${step.animate ? 'animate-spin' : ''}`} />
                          </div>
                          {step.action === 'retry' && (
                            <button 
                              onClick={handleGlobalRetry} 
                              disabled={isRetryingGlobal || count === 0}
                              className="text-[10px] uppercase font-bold tracking-wider px-2 py-1.5 bg-rose-500/20 text-rose-400 rounded-md border border-rose-500/30 hover:bg-rose-500/30 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isRetryingGlobal ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                              {t('btnExecute' as any) || 'Executar'}
                            </button>
                          )}
                        </div>
                        
                        <div>
                          <div className="text-2xl font-black text-zinc-100 tracking-tight">{count}</div>
                          <div className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-wider h-6 flex items-center">{step.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SUB-TAB 1: CAPTURED VIDEOS FEED */}
      {subTab === 'captures' && (
        <div className="space-y-4">
          {/* Search & Tag Filter Bar - Bento Card */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t('filterPlaceholder', 'Filtrar capturas por título...')}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 font-mono"
              />
            </div>
            {onStepFilterChange && (
              <select
                value={stepFilter}
                onChange={(e) => {
                  onStepFilterChange(e.target.value);
                  if (onPageChange) onPageChange(1); // Reset page on filter change
                }}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/50 font-mono min-w-[160px]"
              >
                <option value="">Todos os Status ({totalStatusCount})</option>
                <option value="STARTED">STARTED ({statusCounts['STARTED'] || 0})</option>
                <option value="PENDING_METADATA_EXTRACTION">PENDING_METADATA_EXTRACTION ({statusCounts['PENDING_METADATA_EXTRACTION'] || 0})</option>
                <option value="EXTRACTING_METADATA">EXTRACTING_METADATA ({statusCounts['EXTRACTING_METADATA'] || 0})</option>
                <option value="METADATA_EXTRACTED">METADATA_EXTRACTED ({statusCounts['METADATA_EXTRACTED'] || 0})</option>
                <option value="PENDING_DOWNLOAD">PENDING_DOWNLOAD ({statusCounts['PENDING_DOWNLOAD'] || 0})</option>
                <option value="DOWNLOADING">DOWNLOADING ({statusCounts['DOWNLOADING'] || 0})</option>
                <option value="DOWNLOADED">DOWNLOADED ({statusCounts['DOWNLOADED'] || 0})</option>
                <option value="COMPLETED">COMPLETED ({statusCounts['COMPLETED'] || 0})</option>
                <option value="ERROR">ERROR ({statusCounts['ERROR'] || 0})</option>
                <option value="MEMBERS_ONLY">MEMBERS_ONLY ({statusCounts['MEMBERS_ONLY'] || 0})</option>
                <option value="AGE_RESTRICTED">AGE_RESTRICTED ({statusCounts['AGE_RESTRICTED'] || 0})</option>
                <option value="PRIVATE_VIDEO">PRIVATE_VIDEO ({statusCounts['PRIVATE_VIDEO'] || 0})</option>
                <option value="COPYRIGHT_REMOVED">COPYRIGHT_REMOVED ({statusCounts['COPYRIGHT_REMOVED'] || 0})</option>
                <option value="ACCOUNT_TERMINATED">ACCOUNT_TERMINATED ({statusCounts['ACCOUNT_TERMINATED'] || 0})</option>
                <option value="VIDEO_REMOVED">VIDEO_REMOVED ({statusCounts['VIDEO_REMOVED'] || 0})</option>
                <option value="REPROCESSING">REPROCESSING ({statusCounts['REPROCESSING'] || 0})</option>
                <option value="DELETED">DELETED ({statusCounts['DELETED'] || 0})</option>
              </select>
            )}

            {onChannelFilterChange && (
              <select
                value={channelFilter}
                onChange={(e) => {
                  onChannelFilterChange(e.target.value);
                  if (onPageChange) onPageChange(1); // Reset page on filter change
                }}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/50 font-mono min-w-[160px]"
              >
                <option value="">Todos os Canais</option>
                {channelOptions.map(([externalId, displayName]) => (
                  <option key={externalId} value={externalId}>
                    {displayName}
                  </option>
                ))}
              </select>
            )}
          </div>


          {/* Videos Bento Grid */}
          {isLoadingData ? (
            <div className="flex flex-col items-center justify-center py-24 animate-in fade-in duration-300">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
              <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                Carregando Dados da API...
              </p>
            </div>
          ) : captures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-2xl border border-zinc-800/50 border-dashed">
              <Search className="w-12 h-12 text-zinc-700 mb-4" />
              <p className="text-zinc-500 font-mono text-sm">Nenhuma captura encontrada.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {captures.map((video) => (
              <div 
                key={video.id}
                className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800/80 hover:bg-zinc-800/80 hover:border-zinc-700 transition-all duration-300 flex flex-col justify-between group shadow-sm hover:shadow-lg cursor-pointer hover:-translate-y-1 relative"
                onClick={() => setSelectedVideo(video)}
              >
                <div className="flex flex-col flex-1">
                  {/* Card Header: Channel Info */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-zinc-200">{channelMap.get(video.sourceName) || video.sourceName}</span>
                  </div>

                  {/* Thumbnail & Badges */}
                  <div className="relative mb-3.5 rounded-xl overflow-hidden aspect-video bg-zinc-950 border border-zinc-800">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900 group-hover:bg-zinc-800 transition-colors duration-300">
                        <Youtube className="w-12 h-12 text-zinc-700 opacity-50 group-hover:text-red-600 group-hover:opacity-100 transition-all duration-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />
                    
                    {/* Duration Badge */}
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-zinc-950/90 text-white font-mono text-[10px] border border-zinc-700">
                      {formatDuration(video.duration)}
                    </span>

                    {/* Diarization Badge */}
                    {(video.isDiarized || video.diarizationStatus) && (
                      <div className={`absolute bottom-2 left-2 flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border backdrop-blur-md shadow-sm ${
                        video.isDiarized || video.diarizationStatus === 'COMPLETED'
                          ? 'bg-purple-950/90 text-purple-300 border-purple-500/40'
                          : video.diarizationStatus === 'ERROR'
                          ? 'bg-rose-950/90 text-rose-300 border-rose-500/40'
                          : 'bg-amber-950/90 text-amber-300 border-amber-500/40'
                      }`}>
                        {video.isDiarized || video.diarizationStatus === 'COMPLETED' ? (
                          <>
                            <Mic className="w-3 h-3 text-purple-400" />
                            <span>{t('diarized')}</span>
                          </>
                        ) : video.diarizationStatus === 'ERROR' ? (
                          <>
                            <MicOff className="w-3 h-3 text-rose-400" />
                            <span>{t('diarizationError')}</span>
                          </>
                        ) : (
                          <>
                            <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                            <span>{t('diarizing')}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Step Badge */}

                    {video.status && (
                      <div className={`absolute top-2 left-2 flex items-center gap-1 bg-zinc-900/90 ${getStatusColor(video.status)} text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border border-zinc-700 backdrop-blur-md`}>
                        <span>{video.status.replace(/_/g, ' ')}</span>
                      </div>
                    )}

                    {/* PostgreSQL Record ID Badge */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-indigo-500/10 text-indigo-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-indigo-500/20 backdrop-blur-md">
                      <Database className="w-3 h-3 text-indigo-400" />
                      <span>{video.postgresRecordId}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-sm text-zinc-100 group-hover:text-indigo-300 transition-colors duration-300 line-clamp-2 mb-2 h-[40px]">
                    {video.title}
                  </h3>

                  <div className="mt-auto pt-2 flex flex-col gap-3">
                    {/* Description Box - Fixed height for perfect alignment */}
                    <div className="h-[52px] w-full">
                      {video.description ? (
                        <p className="text-xs text-zinc-400 line-clamp-2 font-sans bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/60 h-full">
                          {video.description}
                        </p>
                      ) : (
                        <div className="h-full bg-zinc-950/30 rounded-xl border border-zinc-800/30 border-dashed flex items-center justify-center">
                          <span className="text-[10px] text-zinc-600 font-mono">{t('noDescription')}</span>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-nowrap overflow-hidden items-center gap-1.5 h-[22px]">
                      {video.tags.slice(0, 3).map((tItem) => (
                        <span 
                          key={tItem} 
                          className="text-[10px] shrink truncate max-w-[90px] font-mono px-2.5 py-0.5 rounded-full bg-zinc-950 text-indigo-400 border border-zinc-800"
                          title={tItem}
                        >
                          #{tItem}
                        </span>
                      ))}
                      {video.tags.length > 3 && (
                        <span 
                          className="text-[10px] shrink-0 font-mono px-2 py-0.5 rounded-full bg-zinc-800/50 text-zinc-400 border border-zinc-700/50" 
                          title={video.tags.slice(3).join(', ')}
                        >
                          +{video.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Buttons */}
                <div className="pt-3 mt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {['ERROR', 'DELETED'].includes(video.status) && (
                      <button
                        onClick={(e) => handleIndividualRetry(e, video)}
                        disabled={retryingVideoIds.has(video.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-medium text-[11px] transition-all disabled:opacity-50 shadow-sm bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 hover:shadow-rose-500/10`}
                        title={t('titleReprocessVideo')}
                      >
                        <RefreshCw className={`w-3 h-3 ${retryingVideoIds.has(video.id) ? 'animate-spin' : ''}`} />
                        <span className="hidden xl:inline">{t('btnReprocess')}</span>
                      </button>
                    )}

                    {video.status === 'COMPLETED' && (() => {
                      const isPending = ['PENDING', 'STARTED', 'TRANSCRIPTION', 'ALIGNMENT', 'DIARIZATION', 'IN_PROGRESS', 'PROCESSING'].includes(video.diarizationStatus || '') || (isDiarizing && diarizationModalVideo?.id === video.id);
                      const isCompleted = video.isDiarized || video.diarizationStatus === 'COMPLETED';
                      const isError = video.diarizationStatus === 'ERROR';

                      let btnStyle = "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-300 hover:text-purple-200";
                      let btnTitle = t('btnStartDiarization');
                      let btnText = t('btnStartDiarization');
                      let btnIcon = <Mic className="w-3.5 h-3.5 text-purple-400" />;

                      if (isPending) {
                        btnStyle = "bg-amber-500/10 border-amber-500/30 text-amber-300 cursor-not-allowed opacity-90";
                        btnTitle = t('diarizing');
                        btnText = t('diarizing');
                        btnIcon = <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />;
                      } else if (isCompleted) {
                        btnStyle = "bg-purple-500/10 border-purple-500/30 text-purple-400/80 cursor-not-allowed opacity-75";
                        btnTitle = t('diarized');
                        btnText = t('diarized');
                        btnIcon = <Mic className="w-3.5 h-3.5 text-purple-400/70" />;
                      } else if (isError) {
                        btnStyle = "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300 hover:text-rose-200";
                        btnTitle = t('btnRediarize');
                        btnText = t('diarizationError');
                        btnIcon = <MicOff className="w-3.5 h-3.5 text-rose-400" />;
                      }

                      return (
                        <button
                          onClick={(e) => handleDiarizationClick(e, video)}
                          disabled={isPending || isCompleted}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-medium text-[11px] border transition-all shadow-sm ${btnStyle}`}
                          title={btnTitle}
                        >
                          {btnIcon}
                          <span>{btnText}</span>
                        </button>
                      );
                    })()}
                  </div>
                  <a
                    href={video.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-sm hover:scale-[1.02] shrink-0"
                  >
                    <span>{t('openVideo')}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 0 && onPageChange && (
            <div className="flex items-center justify-center gap-4 mt-8 mb-4">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-mono text-zinc-300">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Items per page selector */}
              {onLimitChange && limit && (
                <div className="ml-4 flex items-center gap-2">
                  <label className="text-xs text-zinc-400 font-mono">Vídeos por página:</label>
                  <select 
                    value={limit}
                    onChange={(e) => {
                      onLimitChange(Number(e.target.value));
                      onPageChange(1);
                    }}
                    className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2 py-1 outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 1.5: SAVED CHANNELS */}
      {subTab === 'saved_channels' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder={t('filterPlaceholder')}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500/50 font-mono"
              />
            </div>
          </div>
          
          {savedChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-2xl border border-zinc-800/50 border-dashed">
              <Youtube className="w-12 h-12 text-zinc-700 mb-4" />
              <p className="text-zinc-500 font-mono text-sm">Nenhum canal salvo.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xl font-mono text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 text-[11px] uppercase">
                      <th className="p-3">{t('tableChannelName')}</th>
                      <th className="p-3">External ID</th>
                      <th className="p-3">{t('vidsSaved')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {savedChannels.map((channel) => (
                      <tr key={channel.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <img src={channel.avatar} alt="" className="w-9 h-9 rounded-full border border-zinc-700" />
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-zinc-200 font-sans">{channel.name}</span>
                              <a href={channel.channelUrl || channel.url} target="_blank" rel="noreferrer" className="text-[10px] text-zinc-500 hover:text-zinc-300 hover:underline truncate max-w-[300px]" title={channel.channelUrl || channel.url}>
                                {channel.channelUrl || channel.url}
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-[11px] text-red-400 font-bold">{channel.channelId}</span>
                        </td>
                        <td className="p-3 text-zinc-400 text-[11px] font-mono">
                          {channel.totalCaptured}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: SOURCES MANAGER */}
      {subTab === 'sources' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-200 font-mono">
              {t('monitoredSources')} ({sources.length})
            </h3>
          </div>

          {/* Sources List Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl font-mono text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                    <th className="p-3">{t('tableChannelSource')}</th>
                    <th className="p-3">{t('tableChannelName')}</th>
                    <th className="p-3">{t('tableLastCapture')}</th>
                    <th className="p-3">{t('tableStatus')}</th>
                    <th className="p-3 text-right">{t('tableAction')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSources.map((source) => (
                    <tr key={source.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 flex items-center gap-2.5">
                        <img src={source.avatar} alt="" className="w-7 h-7 rounded-full border border-slate-700" />
                        <div>
                          <a href={source.url} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-400 hover:underline">
                            {source.channelId}
                          </a>
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-slate-200 font-sans">
                        {source.name}
                      </td>
                      <td className="p-3 text-slate-400 text-[11px]">
                        {source.lastCaptured.replace('T', ' ').slice(0, 16)}
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          source.status === 'active' 
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {source.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleToggleSourceStatus(source.id)}
                          className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-400 transition-colors"
                          title="Alternar Ativo/Pausado"
                        >
                          {source.status === 'active' ? <PauseCircle className="w-4 h-4 text-amber-400" /> : <PlayCircle className="w-4 h-4 text-emerald-400" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* INGESTION & SOURCE CREATION MODAL */}
      {isIngestionModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsIngestionModalOpen(false)}
        >
          <div 
            className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">{t('modalIngestionTitle')}</h3>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{t('modalIngestionSub')}</p>
                </div>
              </div>
              <button
                onClick={() => setIsIngestionModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs Selector (3 API Routes: /video, /playlist, /canal or /channel) */}
            <div className="grid grid-cols-3 p-2 gap-1.5 bg-zinc-950/80 border-b border-zinc-800 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setModalMode('content')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all ${
                  modalMode === 'content'
                    ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300 font-bold shadow-sm'
                    : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Video className="w-3.5 h-3.5 mb-1 text-indigo-400" />
                <span>{t('tabVideoRoute')}</span>
              </button>

              <button
                type="button"
                onClick={() => setModalMode('sources')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all ${
                  modalMode === 'sources'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-bold shadow-sm'
                    : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Radio className="w-3.5 h-3.5 mb-1 text-emerald-400" />
                <span>{t('tabCanalRoute')}</span>
              </button>

              <button
                type="button"
                onClick={() => setModalMode('playlist')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all ${
                  modalMode === 'playlist'
                    ? 'bg-purple-500/15 border-purple-500/50 text-purple-300 font-bold shadow-sm'
                    : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <ListVideo className="w-3.5 h-3.5 mb-1 text-purple-400" />
                <span>{t('tabPlaylistRoute')}</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 font-mono text-xs">
              {/* TAB 1: /video */}
              {modalMode === 'content' && (
                <form onSubmit={handleIngestContent} className="space-y-4">
                  <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs">
                    <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">{t('descVideoRoute')}</p>
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-[11px] uppercase tracking-wider mb-1">
                      {t('fieldUrlVideo')} *
                    </label>
                    <input
                      type="url"
                      required
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      placeholder={t('fieldUrlVideoPlaceholder')}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/60 font-sans"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsIngestionModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold font-sans"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessingManual}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all hover:scale-[1.02] font-sans"
                    >
                      {isProcessingManual ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{t('ingestingLoader')}</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>{t('btnSubmitEndpoint')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: /playlist */}
              {modalMode === 'playlist' && (
                <form onSubmit={handleIngestPlaylist} className="space-y-4">
                  <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs">
                    <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">{t('descPlaylistRoute')}</p>
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-[11px] uppercase tracking-wider mb-1">
                      {t('fieldUrlPlaylist')} *
                    </label>
                    <input
                      type="url"
                      required
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      placeholder={t('fieldUrlPlaylistPlaceholder')}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500/60 font-sans"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <div>
                      <span className="block text-xs font-bold text-zinc-200 font-sans">
                        {t('fieldSaveInPlaylistFolder')}
                      </span>
                      <span className="block text-[10px] text-zinc-500 font-sans">
                        {t('fieldSaveInPlaylistFolderDesc')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSaveInPlaylistFolder(!saveInPlaylistFolder)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        saveInPlaylistFolder ? 'bg-purple-600' : 'bg-zinc-800'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          saveInPlaylistFolder ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsIngestionModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold font-sans"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessingManual}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 disabled:opacity-50 transition-all hover:scale-[1.02] font-sans"
                    >
                      {isProcessingManual ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{t('ingestingLoader')}</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>{t('btnSubmitEndpoint')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: /canal */}
              {modalMode === 'sources' && (
                <form onSubmit={handleRegisterSource} className="space-y-4">
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs">
                    <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">{t('descSourcesRoute')}</p>
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-[11px] uppercase tracking-wider mb-1">
                      {t('fieldUrlCanal')} *
                    </label>
                    <input
                      type="url"
                      required
                      value={newSourceUrl}
                      onChange={(e) => setNewSourceUrl(e.target.value)}
                      placeholder={t('fieldUrlSourcePlaceholder')}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 font-sans"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsIngestionModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold font-sans"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessingManual}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all hover:scale-[1.02] font-sans"
                    >
                      {isProcessingManual ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{t('ingestingLoader')}</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>{t('btnSubmitEndpoint')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video Details Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedVideo(null)}>
          <div 
            className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800/80 bg-zinc-900/30">
              <div className="flex items-center gap-3">
                <Video className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-bold text-zinc-100 font-mono uppercase">{t('videoDetails')}</h2>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto scrollbar-none flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="w-full sm:w-56 shrink-0 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 relative shadow-md aspect-video">
                  {selectedVideo.thumbnail ? (
                    <img src={selectedVideo.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <Youtube className="w-16 h-16 text-zinc-700 opacity-50" />
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/80 text-white font-mono text-[10px] border border-zinc-700/50">{formatDuration(selectedVideo.duration)}</span>
                </div>
                <div className="flex flex-col gap-3">
                  <h3 className="text-lg font-bold text-zinc-100 leading-tight">{selectedVideo.title}</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px] uppercase font-bold border border-indigo-500/30">
                        {selectedVideo.sourceName.charAt(0)}
                      </span>
                      {selectedVideo.sourceName}
                    </span>
                    <span className={`px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-700 ${getStatusColor(selectedVideo.status)} text-[10px] uppercase font-mono font-bold tracking-wider shadow-sm`}>
                      {selectedVideo.status.replace(/_/g, ' ')}
                    </span>
                    {(selectedVideo.isDiarized || selectedVideo.diarizationStatus) && (
                      <span className={`px-2.5 py-1 rounded-md border text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${
                        selectedVideo.isDiarized || selectedVideo.diarizationStatus === 'COMPLETED'
                          ? 'bg-purple-950/90 border-purple-500/40 text-purple-300'
                          : selectedVideo.diarizationStatus === 'ERROR'
                          ? 'bg-rose-950/90 border-rose-500/40 text-rose-300'
                          : 'bg-amber-950/90 border-amber-500/40 text-amber-300'
                      }`}>
                        {selectedVideo.isDiarized || selectedVideo.diarizationStatus === 'COMPLETED' ? (
                          <>
                            <Mic className="w-3 h-3 text-purple-400" />
                            <span>{t('diarized')}</span>
                          </>
                        ) : selectedVideo.diarizationStatus === 'ERROR' ? (
                          <>
                            <MicOff className="w-3 h-3 text-rose-400" />
                            <span>{t('diarizationError')}</span>
                          </>
                        ) : (
                          <>
                            <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                            <span>{t('diarizing')}</span>
                          </>
                        )}
                      </span>
                    )}
                    {selectedVideo.publishedAt && (
                      <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1.5 ml-2 bg-zinc-900/50 px-2 py-1 rounded-md border border-zinc-800/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                        {t('publishedAt')}: {new Date(selectedVideo.publishedAt).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
  
              <div className="flex flex-col gap-2.5">
                <h4 className="text-[11px] font-bold text-zinc-500 uppercase font-mono tracking-widest flex items-center gap-2">
                  <span className="w-1 h-3 bg-indigo-500 rounded-full"></span>
                  {t('fullDescription')}
                </h4>
                <div className="text-sm text-zinc-300 bg-zinc-900/60 p-5 rounded-xl border border-zinc-800/80 whitespace-pre-wrap font-sans leading-relaxed shadow-inner">
                  {selectedVideo.description || selectedVideo.summary || t('noDescriptionAvailable')}
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <h4 className="text-[11px] font-bold text-zinc-500 uppercase font-mono tracking-widest flex items-center gap-2">
                  <span className="w-1 h-3 bg-indigo-500 rounded-full"></span>
                  {t('tagsLabel')} ({selectedVideo.tags.length})
                </h4>
                <div className="flex flex-wrap gap-2 bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50">
                  {selectedVideo.tags.length > 0 ? selectedVideo.tags.map(tItem => (
                    <span key={tItem} className="text-xs font-mono px-3 py-1.5 rounded-full bg-zinc-950 text-indigo-400 border border-zinc-800 shadow-sm hover:border-indigo-500/50 hover:text-indigo-300 transition-colors cursor-default">
                      #{tItem}
                    </span>
                  )) : (
                    <span className="text-xs text-zinc-500 font-mono">{t('noTags')}</span>
                  )}
                </div>
              </div>

              {/* Timestamps */}
              <div className="flex flex-col sm:flex-row gap-4 bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50">
                <div className="flex flex-col gap-1 w-full">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase font-mono tracking-widest flex items-center gap-2">
                    <span className="w-1 h-3 bg-indigo-500 rounded-full"></span>
                    {t('createdAt')}
                  </span>
                  <span className="text-sm text-zinc-300 font-mono ml-3">
                    {selectedVideo.createdAt ? new Date(selectedVideo.createdAt).toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US') : '-'}
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800/80 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVideo(null);
                    setVideoToDelete(selectedVideo);
                  }}
                  disabled={deletingVideoIds.has(selectedVideo.id)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-bold transition-all disabled:opacity-50"
                >
                  <Trash className={`w-4 h-4 ${deletingVideoIds.has(selectedVideo.id) ? 'animate-pulse' : ''}`} />
                  <span>Excluir</span>
                </button>
                {selectedVideo.status === 'COMPLETED' && (
                  <button 
                      onClick={(e) => handleDiarizationClick(e, selectedVideo)}
                      className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-bold shadow-sm shadow-purple-500/10 transition-colors flex items-center gap-1.5 border border-purple-500/20"
                    >
                      <ListMusic className="w-3.5 h-3.5" />
                      {selectedVideo.isDiarized || selectedVideo.diarizationStatus === 'COMPLETED' ? 'Refazer Diarização' : 'Diarização'}
                    </button>
                )}

              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs font-bold transition-all"
                >
                  {t('closeDetails')}
                </button>
                <a
                  href={selectedVideo.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 hover:scale-[1.02] hover:shadow-indigo-600/40"
                >
                  <span>{t('watchOnYouTube')}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {videoToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setVideoToDelete(null)}>
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-zinc-800/80 bg-zinc-900/50">
              <h3 className="text-zinc-100 font-bold flex items-center gap-2">
                <Trash className="w-5 h-5 text-red-400" />
                {t('titleConfirmDelete')}
              </h3>
              <button
                onClick={() => setVideoToDelete(null)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-zinc-400 mb-4">
                {t('descConfirmDelete')}
              </p>
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <p className="text-sm text-zinc-200 font-bold line-clamp-1">{videoToDelete.title}</p>
                <p className="text-xs text-zinc-500 mt-1">{videoToDelete.sourceName}</p>
              </div>
            </div>

            <div className="p-4 bg-zinc-900/30 border-t border-zinc-800/80 flex justify-end gap-3">
              <button
                onClick={() => setVideoToDelete(null)}
                className="px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700/80 transition-colors"
              >
                {t('btnCancelDelete')}
              </button>
              <button
                onClick={(e) => {
                  handleIndividualDelete(e, videoToDelete);
                  setVideoToDelete(null);
                }}
                disabled={deletingVideoIds.has(videoToDelete.id)}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-md shadow-red-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {deletingVideoIds.has(videoToDelete.id) ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash className="w-4 h-4" />
                )}
                {t('btnConfirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diarization Config Modal */}
      {diarizationModalVideo && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setDiarizationModalVideo(null)}>
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-zinc-800/80 bg-zinc-900/50">
              <h3 className="text-zinc-100 font-bold flex items-center gap-2">
                <ListMusic className="w-5 h-5 text-purple-400" />
                Configurar Diarização
              </h3>
              <button
                onClick={() => setDiarizationModalVideo(null)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-zinc-400 mb-4">
                {t('diarizationModalSubtitle')}
              </p>
              
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 mb-4">
                <p className="text-sm text-zinc-200 font-bold line-clamp-1">{diarizationModalVideo.title}</p>
                <p className="text-xs text-zinc-500 mt-1">{diarizationModalVideo.sourceName}</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  {t('diarizationModalLangLabel')}
                </label>
                <input
                  type="text"
                  value={diarizationLanguage}
                  onChange={(e) => setDiarizationLanguage(e.target.value)}
                  placeholder="en, pt, es, etc."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  {t('diarizationModalLangDesc')}
                </p>
              </div>
            </div>

            <div className="p-4 bg-zinc-900/30 border-t border-zinc-800/80 flex justify-end gap-3">
              <button
                onClick={() => setDiarizationModalVideo(null)}
                className="px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700/80 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmDiarization}
                disabled={isDiarizing}
                className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isDiarizing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ListMusic className="w-4 h-4" />
                )}
                {t('confirmDiarizationBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
