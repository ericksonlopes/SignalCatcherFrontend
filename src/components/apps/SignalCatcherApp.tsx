import React, {useState} from 'react';
import {
  Clock,
  Database,
  ExternalLink,
  ListVideo,
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
  Youtube
} from 'lucide-react';
import {CapturedVideo, ContentSource, LanguageMode, ScheduledJob} from '../../types';
import {getTranslation} from '../../locales';

interface SignalCatcherAppProps {
  language?: LanguageMode;
  sources: ContentSource[];
  setSources: React.Dispatch<React.SetStateAction<ContentSource[]>>;
  captures: CapturedVideo[];
  setCaptures: React.Dispatch<React.SetStateAction<CapturedVideo[]>>;
  jobs: ScheduledJob[];
  setJobs: React.Dispatch<React.SetStateAction<ScheduledJob[]>>;
  onTriggerJob: (jobId: string) => void;
  onAddLog: (sourceApp: string, level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onOpenNotifications?: () => void;
  onRefresh?: () => void;
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
  language = 'pt',
  sources,
  setSources,
  captures,
  setCaptures,
  jobs,
  setJobs,
  onTriggerJob,
  onAddLog,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onOpenNotifications,
  onRefresh
}) => {
  const { t } = getTranslation(language);
  const [subTab, setSubTab] = useState<'captures' | 'sources' | 'jobs' | 'stats'>('captures');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [isCapturingNow, setIsCapturingNow] = useState(false);

  // Modal State
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'content' | 'playlist' | 'sources'>('content');
  const [selectedVideo, setSelectedVideo] = useState<CapturedVideo | null>(null);

  // Form State for API Routes
  const [manualUrl, setManualUrl] = useState('');
  const [saveInPlaylistFolder, setSaveInPlaylistFolder] = useState(false);
  const [isProcessingManual, setIsProcessingManual] = useState(false);

  // New source form state
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');

  // Filtered captures
  const filteredCaptures = captures.filter((c) => {
    const matchesQuery = 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sourceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesQuery;
  });

  // Handler for POST /api/youtube/sources
  const handleRegisterSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceUrl) return;

    setIsProcessingManual(true);
    onAddLog('SignalCatcher', 'info', `${t('notifSendingSource')} ${newSourceUrl}`);

    try {
      const response = await fetch('http://eriberry.local:5001/api/youtube/channels', {
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
      const response = await fetch('http://eriberry.local:5001/api/youtube/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: manualUrl })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
      onAddLog('SignalCatcher', 'error', `${t('notifErrorVideo')} ${err}`);
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
      const response = await fetch('http://eriberry.local:5001/api/youtube/playlist', {
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

  const handleAddSourceFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName || !newSourceUrl) return;

    onAddLog('SignalCatcher', 'info', `Enviando POST /api/youtube/sources: { name: "${newSourceName}", url: "${newSourceUrl}" }`);

    try {
      const response = await fetch('/api/youtube/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSourceName, url: newSourceUrl })
      });

      const resData = await response.json();
      const apiSource = resData.data;

      const newSource: ContentSource = {
        id: apiSource?.id || `src-${Date.now()}`,
        name: apiSource?.name || newSourceName,
        type: 'youtube',
        url: apiSource?.url || newSourceUrl,
        channelId: apiSource?.channelId || `UC_${Math.random().toString(36).substring(2, 9)}`,
        avatar: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=150&auto=format&fit=crop&q=80',
        subscriberCount: apiSource?.subscriberCount || 25000,
        lastCaptured: new Date().toISOString(),
        status: 'active',
        intervalMinutes: newSourceInterval,
        totalCaptured: 0
      };

      setSources([newSource, ...sources]);
      onAddLog('SignalCatcher', 'success', `POST /api/youtube/sources 201 Created: Fonte ${newSource.name} registrada!`);
    } catch (err) {
      onAddLog('SignalCatcher', 'warning', `Falha ao conectar na API backend, inserido em memória.`);
    } finally {
      setNewSourceName('');
      setNewSourceUrl('');
      setIsIngestionModalOpen(false);
    }
  };

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName || !newSourceUrl) return;

    const newSource: ContentSource = {
      id: `src-${Date.now()}`,
      name: newSourceName,
      type: newSourceType,
      url: newSourceUrl,
      channelId: `UC_${Math.random().toString(36).substring(2, 9)}`,
      avatar: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=150&auto=format&fit=crop&q=80',
      subscriberCount: 15000,
      lastCaptured: new Date().toISOString(),
      status: 'active',
      intervalMinutes: newSourceInterval,
      totalCaptured: 0
    };

    setSources([newSource, ...sources]);
    onAddLog('SignalCatcher', 'success', `Nova fonte registrada: ${newSourceName} (${newSourceType.toUpperCase()})`);
    
    // Reset form
    setNewSourceName('');
    setNewSourceUrl('');
    setIsAddingSource(false);
  };

  const handleToggleSourceStatus = async (id: string) => {
    try {
      const response = await fetch(`http://eriberry.local:5001/api/youtube/channels/${id}/status`, {
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

  const handleManualCaptureTrigger = () => {
    setIsCapturingNow(true);
    onAddLog('SignalCatcher', 'info', 'Iniciando captura manual de fontes em tempo real via FastAPI...');

    setTimeout(() => {
      const mockNewVideo: CapturedVideo = {
        id: `vid-${Date.now()}`,
        sourceId: sources[0]?.id || 'src-1',
        sourceName: sources[0]?.name || 'Tech Source',
        sourceAvatar: sources[0]?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        title: `NOVO: Análise Automatizada de Fontes e FastAPI #${Math.floor(Math.random() * 100)}`,
        videoUrl: 'https://youtube.com',
        thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
        publishedAt: new Date().toISOString(),
        duration: '06:30',
        views: 1200,
        likes: 180,
        commentsCount: 24,
        status: 'ingested',
        postgresRecordId: `pg_uuid_${Math.floor(Math.random() * 8999 + 1000)}`,
        tags: ['PostgreSQL', 'FastAPI', 'Automation', 'YouTube'],
        summary: 'Vídeo recém-capturado em lote pelo SignalCatcher cron job e gravado na tabela PostgreSQL signalcatcher_captures.',
        sentimentScore: 0.91
      };

      setCaptures([mockNewVideo, ...captures]);
      setIsCapturingNow(false);
      onAddLog('SignalCatcher', 'success', `Nova captura registrada no PostgreSQL: ${mockNewVideo.postgresRecordId}`);
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-100 font-sans p-2 sm:p-4 space-y-4 overflow-y-auto">
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

        {/* Quick Stats Bento Metrics */}
        <div className="grid grid-cols-3 gap-3 w-full lg:w-auto font-mono text-xs">
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center">
            <div className="text-zinc-500 text-[10px] uppercase font-semibold tracking-wider">{t('activeSources')}</div>
            <div className="text-lg font-bold text-indigo-400 mt-0.5">{sources.filter(s => s.status === 'active').length} / {sources.length}</div>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center">
            <div className="text-zinc-500 text-[10px] uppercase font-semibold tracking-wider">{t('postgresRecords')}</div>
            <div className="text-lg font-bold text-cyan-400 mt-0.5">{captures.length}</div>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center">
            <div className="text-zinc-500 text-[10px] uppercase font-semibold tracking-wider">{t('scheduledJobs')}</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">{jobs.length}</div>
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
            <span>{t('capturedFeeds')} ({captures.length})</span>
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
            <span>{t('sources')} ({sources.length})</span>
          </button>

          <button
            onClick={() => setSubTab('jobs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
              subTab === 'jobs'
                ? 'bg-zinc-800 border-zinc-700 text-zinc-100 font-bold shadow-sm'
                : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('cronJobs')} ({jobs.length})</span>
          </button>
        </div>

        {/* Action Trigger Buttons */}
        <div className="flex items-center gap-2">
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

      {/* SUB-TAB 1: CAPTURED VIDEOS FEED */}
      {subTab === 'captures' && (
        <div className="space-y-4">
          {/* Search & Tag Filter Bar - Bento Card */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('filterPlaceholder')}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 font-mono"
              />
            </div>
          </div>

          {/* Videos Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {filteredCaptures.map((video) => (
              <div
                key={video.id}
                className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800/80 hover:bg-zinc-800/80 hover:border-zinc-700 transition-all duration-300 flex flex-col justify-between group shadow-sm hover:shadow-lg cursor-pointer hover:-translate-y-1 relative"
                onClick={() => setSelectedVideo(video)}
              >
                <div className="flex flex-col flex-1">
                  {/* Card Header: Channel Info */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-zinc-200">{video.sourceName}</span>
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
                      {video.duration}
                    </span>

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

                {/* Card Footer: Abrir Button */}
                <div className="pt-3 mt-3 border-t border-zinc-800/80 flex items-center justify-end">
                  <a
                    href={video.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-sm hover:scale-[1.02]"
                  >
                    <span>{t('openVideo')}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && onPageChange && (
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
                    <th className="p-3">{t('tableLastCapture')}</th>
                    <th className="p-3">{t('tableStatus')}</th>
                    <th className="p-3 text-right">{t('tableAction')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sources.map((source) => (
                    <tr key={source.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 flex items-center gap-2.5">
                        <img src={source.avatar} alt="" className="w-7 h-7 rounded-full border border-slate-700" />
                        <div>
                          <div className="font-semibold text-slate-200 font-sans">{source.name}</div>
                          <a href={source.url} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-400 hover:underline">
                            {source.channelId}
                          </a>
                        </div>
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

      {/* SUB-TAB 3: SCHEDULED CRON JOBS */}
      {subTab === 'jobs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between font-mono">
            <h3 className="font-bold text-sm text-slate-200">
              {t('jobsManagerTitle')}
            </h3>
            <span className="text-xs text-slate-400">
              {t('jobsManagerSubtitle')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-cyan-400 uppercase">{job.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 text-emerald-400 border border-slate-800">
                      {job.cronExpression}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-3">
                    {t('target')}: <strong className="text-slate-200">{job.targetSource}</strong>
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950 p-2.5 rounded-xl border border-slate-800/60 mb-3">
                    <div>
                      <span className="text-slate-500 block">{t('lastRun')}:</span>
                      <span className="text-slate-300">{job.lastRun.replace('T', ' ').slice(11, 19)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">{t('nextRun')}:</span>
                      <span className="text-slate-300">{job.nextRun.replace('T', ' ').slice(11, 19)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">{t('totalExecutions')}:</span>
                      <span className="text-cyan-400 font-bold">{job.executionCount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">{t('avgTime')}:</span>
                      <span className="text-emerald-400">{job.avgDurationSec}s</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-[10px] text-slate-500">{t('statusLabel')}: {job.status.toUpperCase()}</span>
                  <button
                    onClick={() => onTriggerJob(job.id)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-colors"
                  >
                    <Play className="w-3 h-3 fill-slate-950" />
                    <span>{t('triggerNow')}</span>
                  </button>
                </div>
              </div>
            ))}
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
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/80 text-white font-mono text-[10px] border border-zinc-700/50">{selectedVideo.duration}</span>
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
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800/80 flex items-center justify-end gap-3 bg-zinc-950">
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
      )}
    </div>
  );
};
