import {SavedChannels} from './SavedChannels';
import {buildChannelOptions, channelIdentity} from '../../channelOptions';
import {MonitoredChannels} from './MonitoredChannels';
import {CaptureSection, readCaptureSection, saveCaptureSection} from '../../navigationStorage';
import {API_BASE_URL, apiFetch} from '../../api';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Activity,
  ExternalLink,
  ListMusic,
  ListVideo,
  Loader2,
  Mic,
  MicOff,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  Trash,
  UploadCloud,
  Video,
  X,
} from 'lucide-react';

import {CapturedVideo, ContentSource, LanguageMode} from '../../types';
import {getTranslation} from '../../locales';
import { PipelineTrackingView } from './PipelineTrackingView';
import { canDiarizeVideo, canDeleteVideo, isDiarizationInProgress } from './videoActions';
export { canDiarizeVideo, canDeleteVideo, isDiarizationInProgress };


function parseTimeString(duration: string): number | string {
  if (!duration.includes(':')) {
    const parsed = Number.parseInt(duration, 10);
    return Number.isNaN(parsed) ? duration : parsed;
  }
  const parts = duration.split(':');
  if (parts.length === 2) {
    return `00:${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  if (parts.length === 3) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
  }
  return duration;
}

const formatDuration = (duration: number | string | undefined | null): string => {
  if (duration == null) return '00:00:00';
  if (typeof duration === 'string') {
    const res = parseTimeString(duration);
    if (typeof res === 'string') return res;
    duration = res;
  }

  const h = Math.floor(duration / 3600);
  const m = Math.floor((duration % 3600) / 60);
  const s = Math.floor(duration % 60);

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

async function extractResponseError(response: Response): Promise<string> {
  try {
    const errorData = await response.json();
    if (errorData?.detail) return errorData.detail;
  } catch {
    // Ignore json parse error
  }
  return `HTTP error! status: ${response.status}`;
}

function updateDiarizationVideoStatus(
  setCaptures: React.Dispatch<React.SetStateAction<CapturedVideo[]>>,
  setSelectedVideo: React.Dispatch<React.SetStateAction<CapturedVideo | null>>,
  videoId: string,
  status: string
): void {
  setCaptures((prev) =>
    prev.map((c) => (c.id === videoId ? { ...c, isDiarized: false, diarizationStatus: status } : c))
  );
  setSelectedVideo((prev) =>
    prev?.id === videoId ? { ...prev, isDiarized: false, diarizationStatus: status } : prev
  );
}

const YoutubeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

const YOUTUBE_ID_REGEX = /(?:v=|\/)([\w-]{11})(?:\?|&|$)/;

function extractExternalId(videoUrl?: string, fallbackId?: string): string {
  if (videoUrl) {
    const match = YOUTUBE_ID_REGEX.exec(videoUrl);
    if (match) return match[1];
  }
  return fallbackId || '';
}



interface SignalCatcherAppProps {
  language?: LanguageMode;
  sources: ContentSource[];
  setSources: React.Dispatch<React.SetStateAction<ContentSource[]>>;
  savedChannels?: ContentSource[];
  captures: CapturedVideo[];
  setCaptures: React.Dispatch<React.SetStateAction<CapturedVideo[]>>;



  onAddLog: (sourceApp: string, level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  hasMoreVideos?: boolean;
  isLoadingMoreVideos?: boolean;
  videoLoadError?: boolean;
  onLoadMoreVideos?: () => void;
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
    case 'COURT_ORDER':
    case 'PRIVATE_VIDEO':
    case 'AGE_RESTRICTED':
    case 'MEMBERS_ONLY':
      return 'text-rose-400';
    case 'REPROCESSING':
    case 'DOWNLOADING':
    case 'EXTRACTING_METADATA':
      return 'text-blue-400';
    case 'PENDING_DOWNLOAD':
    case 'PENDING_METADATA_EXTRACTION':
    case 'STARTED':
    case 'METADATA_EXTRACTED':
      return 'text-amber-400';
    default:
      return 'text-zinc-400';
  }
};

interface DiarizationBadgeInfo {
  className: string;
  icon: React.ReactNode;
  label: string;
}

function getDiarizationBadgeInfo(
  isDiarized: boolean | undefined,
  diarizationStatus: string | null | undefined,
  diarizationProgress: number | null | undefined,
  t: (key: any) => string
): DiarizationBadgeInfo | null {
  if (!isDiarized && !diarizationStatus) return null;

  if (isDiarized || diarizationStatus === 'COMPLETED') {
    return {
      className: 'bg-purple-950/90 text-purple-300 border-purple-500/40',
      icon: <Mic className="w-3 h-3 text-purple-400" />,
      label: t('diarized'),
    };
  }

  if (diarizationStatus === 'ERROR') {
    return {
      className: 'bg-rose-950/90 text-rose-300 border-rose-500/40',
      icon: <MicOff className="w-3 h-3 text-rose-400" />,
      label: t('diarizationError'),
    };
  }

  if (diarizationStatus === 'CANCELLED') {
    return null;
  }

  const label = diarizationProgress != null ? `${t('diarizing')} ${diarizationProgress}%` : t('diarizing');
  return {
    className: 'bg-amber-950/90 text-amber-300 border-amber-500/40',
    icon: <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />,
    label,
  };
}

interface DiarizationButtonProps {
  video: CapturedVideo;
  isHovered: boolean;
  isCancelling: boolean;
  onHover: (id: string | null) => void;
  onClick: (e: React.MouseEvent, video: CapturedVideo) => void;
  onCancel: (e: React.MouseEvent, video: CapturedVideo) => void;
  t: (key: any) => string;
}

type DiarizationBtnState = 'cancelling' | 'showCancel' | 'pending' | 'completed' | 'error' | 'default';

function getDiarizationButtonState(video: CapturedVideo, isHovered: boolean, isCancelling: boolean): DiarizationBtnState {
  if (isCancelling) return 'cancelling';
  const isPending = isDiarizationInProgress(video.diarizationStatus);
  if (isPending && isHovered) return 'showCancel';
  if (isPending) return 'pending';
  if (video.isDiarized || video.diarizationStatus === 'COMPLETED') return 'completed';
  if (video.diarizationStatus === 'ERROR') return 'error';
  return 'default';
}

function getDiarizationButtonConfig(state: DiarizationBtnState, t: (key: any) => string, progress?: number | null) {
  switch (state) {
    case 'cancelling':
      return {
        style: "bg-rose-500/10 border-rose-500/30 text-rose-300 cursor-not-allowed opacity-70",
        title: t('btnCancelDiarization'),
        text: t('btnCancelDiarization'),
        icon: <Loader2 className="w-3.5 h-3.5 text-rose-400 animate-spin" />,
        disabled: true,
      };
    case 'showCancel':
      return {
        style: "bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-300 hover:text-rose-200",
        title: t('btnCancelDiarization'),
        text: t('btnCancelDiarization'),
        icon: <X className="w-3.5 h-3.5 text-rose-400" />,
        disabled: false,
      };
    case 'pending':
      return {
        style: "bg-amber-500/10 border-amber-500/30 text-amber-300 cursor-default opacity-90",
        title: progress != null ? `${t('diarizing')} ${progress}%` : t('diarizing'),
        text: progress != null ? `${t('diarizing')} ${progress}%` : t('diarizing'),
        icon: <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />,
        disabled: false,
      };
    case 'completed':
      return {
        style: "bg-purple-500/10 border-purple-500/30 text-purple-400/80 cursor-not-allowed opacity-75",
        title: t('diarized'),
        text: t('diarized'),
        icon: <Mic className="w-3.5 h-3.5 text-purple-400/70" />,
        disabled: true,
      };
    case 'error':
      return {
        style: "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300 hover:text-rose-200",
        title: t('btnRediarize'),
        text: t('diarizationError'),
        icon: <MicOff className="w-3.5 h-3.5 text-rose-400" />,
        disabled: false,
      };
    default:
      return {
        style: "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-300 hover:text-purple-200",
        title: t('btnStartDiarization'),
        text: t('btnStartDiarization'),
        icon: <Mic className="w-3.5 h-3.5 text-purple-400" />,
        disabled: false,
      };
  }
}

const DiarizationButton: React.FC<DiarizationButtonProps> = ({
  video,
  isHovered,
  isCancelling,
  onHover,
  onClick,
  onCancel,
  t,
}) => {
  const state = getDiarizationButtonState(video, isHovered, isCancelling);
  const cfg = getDiarizationButtonConfig(state, t, video.diarizationProgress);

  const handleClick = (e: React.MouseEvent) => {
    if (state === 'showCancel') {
      void onCancel(e, video);
    } else if (state === 'default' || state === 'error') {
      onClick(e, video);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={cfg.disabled}
      onMouseEnter={() => onHover(video.id)}
      onMouseLeave={() => onHover(null)}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-medium text-xs border transition-all shadow-sm ${cfg.style}`}
      title={cfg.title}
    >
      {cfg.icon}
      <span>{cfg.text}</span>
    </button>
  );
};

interface VideoThumbnailProps {
  video: CapturedVideo;
  canDiarize: boolean;
  t: (key: any) => string;
}

const VideoThumbnail: React.FC<VideoThumbnailProps> = ({ video, canDiarize, t }) => {
  const diarBadge = canDiarize
    ? getDiarizationBadgeInfo(video.isDiarized, video.diarizationStatus, video.diarizationProgress, t)
    : null;
  const statusText = video.deletionRequested ? t('deletionPending') : video.status?.replaceAll('_', ' ');
  const statusColorClass = video.deletionRequested ? 'text-amber-400' : getStatusColor(video.status);

  return (
    <div className="relative mb-3.5 rounded-xl overflow-hidden aspect-video bg-zinc-950 border border-zinc-800">
      {video.thumbnail ? (
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-900 group-hover:bg-zinc-800 transition-colors duration-300">
          <YoutubeIcon className="w-12 h-12 text-zinc-700 opacity-50 group-hover:text-red-600 group-hover:opacity-100 transition-all duration-300" />
        </div>
      )}

      {/* Duration Badge */}
      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-white font-mono text-xs border border-zinc-700">
        {formatDuration(video.duration)}
      </span>

      {/* Diarization Badge */}
      {diarBadge && (
        <div className={`absolute bottom-2 left-2 flex items-center gap-1 text-xs font-mono font-bold uppercase px-2 py-0.5 rounded-md border backdrop-blur-md shadow-sm ${diarBadge.className}`}>
          {diarBadge.icon}
          <span>{diarBadge.label}</span>
        </div>
      )}

      {/* Status Badge */}
      {video.status && (
        <div className={`absolute top-2 left-2 flex items-center gap-1 bg-zinc-900/90 ${statusColorClass} text-xs font-mono font-bold uppercase px-2 py-0.5 rounded-md border border-zinc-700 backdrop-blur-md`}>
          <span>{statusText}</span>
        </div>
      )}
    </div>
  );
};

interface VideoCardActionsProps {
  video: CapturedVideo;
  canDelete: boolean;
  canDiarize: boolean;
  isRetrying: boolean;
  isDeleting: boolean;
  isCancellingDiar: boolean;
  isHoveredDiar: boolean;
  onRetry: (e: React.MouseEvent, video: CapturedVideo) => void;
  onDeleteRequest: (video: CapturedVideo) => void;
  onDiarizeClick: (e: React.MouseEvent, video: CapturedVideo) => void;
  onCancelDiarize: (e: React.MouseEvent, video: CapturedVideo) => void;
  onHoverDiar: (id: string | null) => void;
  t: (key: any) => string;
}

const VideoCardActions: React.FC<VideoCardActionsProps> = ({
  video,
  canDelete,
  canDiarize,
  isRetrying,
  isDeleting,
  isCancellingDiar,
  isHoveredDiar,
  onRetry,
  onDeleteRequest,
  onDiarizeClick,
  onCancelDiarize,
  onHoverDiar,
  t,
}) => (
  <div className="pt-3 border-t border-zinc-800/80 mt-auto flex items-center justify-between gap-2 min-h-[44px]">
    <div className="flex items-center gap-1">
      {video.videoUrl && (
        <a
          href={video.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          title={t('openOnYouTube')}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
      {video.status === 'ERROR' && (
        <button
          type="button"
          onClick={(e) => onRetry(e, video)}
          disabled={isRetrying}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
          title={t('retryProcessing')}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRequest(video);
          }}
          disabled={isDeleting || video.deletionRequested}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
          title={t('deleteVideo')}
        >
          <Trash className="w-3.5 h-3.5" />
        </button>
      )}
    </div>

    {canDiarize && (
      <DiarizationButton
        video={video}
        isHovered={isHoveredDiar}
        isCancelling={isCancellingDiar}
        onHover={onHoverDiar}
        onClick={onDiarizeClick}
        onCancel={onCancelDiarize}
        t={t}
      />
    )}
  </div>
);

interface VideoCardProps {
  video: CapturedVideo;
  channelDisplayName: string;
  isRetrying: boolean;
  isDeleting: boolean;
  isCancellingDiar: boolean;
  isHoveredDiar: boolean;
  onSelect: (video: CapturedVideo) => void;
  onRetry: (e: React.MouseEvent, video: CapturedVideo) => void;
  onDeleteRequest: (video: CapturedVideo) => void;
  onDiarizeClick: (e: React.MouseEvent, video: CapturedVideo) => void;
  onCancelDiarize: (e: React.MouseEvent, video: CapturedVideo) => void;
  onHoverDiar: (id: string | null) => void;
  t: (key: any) => string;
}

const VideoCard: React.FC<VideoCardProps> = ({
  video,
  channelDisplayName,
  isRetrying,
  isDeleting,
  isCancellingDiar,
  isHoveredDiar,
  onSelect,
  onRetry,
  onDeleteRequest,
  onDiarizeClick,
  onCancelDiarize,
  onHoverDiar,
  t,
}) => {
  const canDiarize = canDiarizeVideo(video);
  const canDelete = canDeleteVideo(video);

  return (
    <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800/80 hover:bg-zinc-800/80 hover:border-zinc-700 transition-all duration-300 flex flex-col justify-between group shadow-sm hover:shadow-lg hover:-translate-y-1 relative">
      <button
        type="button"
        onClick={() => onSelect(video)}
        className="flex flex-col flex-1 text-left w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
      >
        {/* Card Header: Channel Info */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-zinc-200">{channelDisplayName}</span>
        </div>

        {/* Thumbnail & Badges */}
        <VideoThumbnail video={video} canDiarize={canDiarize} t={t} />

        {/* Title */}
        <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug mb-2">
          {video.title}
        </h4>

        {/* Summary Snippet */}
        {video.summary && (
          <p className="text-xs text-zinc-400 line-clamp-2 mb-3 leading-relaxed">
            {video.summary}
          </p>
        )}
      </button>

      {/* Footer / Actions Bar */}
      <VideoCardActions
        video={video}
        canDelete={canDelete}
        canDiarize={canDiarize}
        isRetrying={isRetrying}
        isDeleting={isDeleting}
        isCancellingDiar={isCancellingDiar}
        isHoveredDiar={isHoveredDiar}
        onRetry={onRetry}
        onDeleteRequest={onDeleteRequest}
        onDiarizeClick={onDiarizeClick}
        onCancelDiarize={onCancelDiarize}
        onHoverDiar={onHoverDiar}
        t={t}
      />
    </div>
  );
};

export const SignalCatcherApp: React.FC<SignalCatcherAppProps> = ({
  language = 'en',
  sources,
  setSources,
  savedChannels = [],
  captures,
  setCaptures,



  onAddLog,
  hasMoreVideos = false,
  isLoadingMoreVideos = false,
  videoLoadError = false,
  onLoadMoreVideos,
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
  const [subTab, setSubTab] = useState<CaptureSection>(readCaptureSection);
  useEffect(() => {saveCaptureSection(subTab);}, [subTab]);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const loadMoreSentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (subTab !== 'captures' || !hasMoreVideos || isLoadingData || isLoadingMoreVideos || videoLoadError || !onLoadMoreVideos) return;
    const target = loadMoreSentinel.current;
    if (!target || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) onLoadMoreVideos();
    }, {rootMargin: '300px 0px'});
    observer.observe(target);
    return () => observer.disconnect();
  }, [subTab, hasMoreVideos, isLoadingData, isLoadingMoreVideos, videoLoadError, onLoadMoreVideos, captures.length]);



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

  const channelOptions = useMemo(
    () => buildChannelOptions(savedChannels || [], sources || [], captures || []),
    [savedChannels, sources, captures],
  );
  const channelMap = useMemo(() => new Map(
    channelOptions.map(([value, label]) => [channelIdentity(value), label]),
  ), [channelOptions]);

  // New source form state

  const [newSourceUrl, setNewSourceUrl] = useState('');

  // Filtered captures
  const [isRetryingGlobal, setIsRetryingGlobal] = useState(false);
  const [retryingVideoIds, setRetryingVideoIds] = useState<Set<string>>(new Set());
  const [deletingVideoIds, setDeletingVideoIds] = useState<Set<string>>(new Set());
  const [videoToDelete, setVideoToDelete] = useState<CapturedVideo | null>(null);
  useEffect(() => {
    setSelectedVideo(previous => previous ? captures.find(video => video.id === previous.id) || previous : null);
  }, [captures]);

  const [diarizationModalVideo, setDiarizationModalVideo] = useState<CapturedVideo | null>(null);
  const [diarizationLanguage, setDiarizationLanguage] = useState<string>('en');
  const [isDiarizing, setIsDiarizing] = useState(false);
  const [diarizationStartNow, setDiarizationStartNow] = useState(false);
  const [hoveredDiarBtnId, setHoveredDiarBtnId] = useState<string | null>(null);
  const [cancellingDiarIds, setCancellingDiarIds] = useState<Set<string>>(new Set());

  const handleGlobalRetry = async () => {
    setIsRetryingGlobal(true);
    onAddLog('SignalCatcher', 'info', t('notifGlobalRetryStart'));

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/youtube/content/retry-errors`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      await response.json();

      onAddLog('SignalCatcher', 'success', t('notifGlobalRetrySuccess'));
      onRefresh?.();
      onOpenNotifications?.();
    } catch (err) {
      onAddLog('SignalCatcher', 'error', `${t('notifGlobalRetryError')} ${err}`);
    } finally {
      setIsRetryingGlobal(false);
    }
  };

  const handleIndividualRetry = async (e: React.MouseEvent, video: CapturedVideo) => {
    e.stopPropagation();

    const externalId = extractExternalId(video.videoUrl, video.postgresRecordId || video.id);

    setRetryingVideoIds(prev => new Set(prev).add(video.id));
    onAddLog('SignalCatcher', 'info', `${t('notifIndivRetryStart')} ${externalId}...`);

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/youtube/content/${externalId}/retry`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      await response.json();

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

  const handleDeleteRequest = (video: CapturedVideo) => {
    if (!canDeleteVideo(video) || video.deletionRequested) return;
    setVideoToDelete(video);
  };

  const handleIndividualDelete = async (e: React.MouseEvent, video: CapturedVideo) => {
    e.stopPropagation();
    if (!canDeleteVideo(video) || video.deletionRequested) return;

    const externalId = extractExternalId(video.videoUrl, video.postgresRecordId || video.id);

    setDeletingVideoIds(prev => new Set(prev).add(video.id));
    onAddLog('SignalCatcher', 'info', `Excluindo vídeo e arquivo ${externalId}...`);

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/youtube/content/${externalId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      await response.json();

      onAddLog('SignalCatcher', 'info', t('deletionQueued'));

      setCaptures(prev => prev.map(v =>
        v.id === video.id
            ? {...v, deletionRequested: true}
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
    if (!canDiarizeVideo(video) || isDiarizationInProgress(video.diarizationStatus)) return;
    setDiarizationModalVideo(video);
    setDiarizationLanguage(video.language || 'en');
    setDiarizationStartNow(false);
  };

  const confirmDiarization = async () => {
    if (!diarizationModalVideo || isDiarizing) return;

    const externalId = extractExternalId(diarizationModalVideo.videoUrl, diarizationModalVideo.postgresRecordId || diarizationModalVideo.id);

    setIsDiarizing(true);

    try {
      onAddLog('SignalCatcher', 'info', `Iniciando diarização para o vídeo ${externalId}...`);
      const response = await apiFetch(`${API_BASE_URL}/api/diarization/youtube/${externalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: diarizationLanguage || 'en', start_now: diarizationStartNow }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      onAddLog('SignalCatcher', 'success', `Diarização iniciada com sucesso (Task ID: ${data.task_id})`);
      updateDiarizationVideoStatus(setCaptures, setSelectedVideo, diarizationModalVideo.id, 'PENDING');
      setDiarizationModalVideo(null);


    } catch (err: any) {
      onAddLog('SignalCatcher', 'error', `Falha ao iniciar diarização: ${err.message || err}`);
    } finally {
      setIsDiarizing(false);
    }
  };

  const handleCancelDiarization = async (e: React.MouseEvent, video: CapturedVideo) => {
    e.stopPropagation();

    const externalId = extractExternalId(video.videoUrl, video.postgresRecordId || video.id);

    setCancellingDiarIds(prev => new Set(prev).add(video.id));
    onAddLog('SignalCatcher', 'info', `Cancelando diarização para o vídeo ${externalId}...`);

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/diarization/${externalId}/cancel`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      onAddLog('SignalCatcher', 'success', t('notifCancelDiarizationSuccess'));
      updateDiarizationVideoStatus(setCaptures, setSelectedVideo, video.id, 'CANCELLED');
    } catch (err: any) {
      onAddLog('SignalCatcher', 'error', `${t('notifCancelDiarizationError')} ${err.message || err}`);
    } finally {
      setCancellingDiarIds(prev => {
        const next = new Set(prev);
        next.delete(video.id);
        return next;
      });
      setHoveredDiarBtnId(null);
    }
  };



  // Handler for POST /api/youtube/sources
  const handleRegisterSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceUrl) return;

    setIsProcessingManual(true);
    onAddLog('SignalCatcher', 'info', `${t('notifSendingSource')} ${newSourceUrl}`);

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/youtube/monitored_channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSourceUrl.split('@')[1] || 'Novo Canal', url: newSourceUrl })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const resData = await response.json();
      onAddLog('SignalCatcher', 'success', `${t('notifSuccessSource')} ${resData.id || 'OK'})`);

      onOpenNotifications?.();

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
      const response = await apiFetch(`${API_BASE_URL}/api/youtube/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: manualUrl })
      });

      if (!response.ok) {
        throw new Error(await extractResponseError(response));
      }

      const resData = await response.json();

      onAddLog('SignalCatcher', 'success', `${t('notifSuccessVideo')} ${resData.message || 'OK'})`);

      onOpenNotifications?.();

      onRefresh?.();

      setManualUrl('');
      setIsIngestionModalOpen(false);
    } catch (err) {
      onAddLog('SignalCatcher', 'error', `${t('notifErrorVideo')} ${err instanceof Error ? err.message : String(err)}`);
      onOpenNotifications?.();
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
      const response = await apiFetch(`${API_BASE_URL}/api/youtube/playlist`, {
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

      onOpenNotifications?.();

      onRefresh?.();

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
      const response = await apiFetch(`${API_BASE_URL}/api/youtube/monitored_channels/${id}/status`, {
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

  const dateLocale = language === 'pt' ? 'pt-BR' : 'en-US';

  const renderCapturesGrid = () => {
    if (isLoadingData) {
      return (
        <div className="flex flex-col items-center justify-center py-24 animate-in fade-in duration-300">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest animate-pulse">
            Carregando Dados da API...
          </p>
        </div>
      );
    }
    if (captures.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-2xl border border-zinc-800/50 border-dashed">
          <Search className="w-12 h-12 text-zinc-700 mb-4" />
          <p className="text-zinc-500 font-mono text-sm">Nenhuma captura encontrada.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
        {captures.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            channelDisplayName={channelMap.get(channelIdentity(video.sourceName)) || video.sourceName}
            isRetrying={retryingVideoIds.has(video.id)}
            isDeleting={deletingVideoIds.has(video.id)}
            isCancellingDiar={cancellingDiarIds.has(video.id)}
            isHoveredDiar={hoveredDiarBtnId === video.id}
            onSelect={setSelectedVideo}
            onRetry={handleIndividualRetry}
            onDeleteRequest={handleDeleteRequest}
            onDiarizeClick={handleDiarizationClick}
            onCancelDiarize={handleCancelDiarization}
            onHoverDiar={setHoveredDiarBtnId}
            t={t}
          />
        ))}
      </div>
    );
  };

  const renderLoadMoreStatus = () => {
    if (videoLoadError) {
      return (
        <>
          <p role="alert">{t('videosLoadError')}</p>
          <button onClick={onLoadMoreVideos} className="rounded-lg border border-zinc-700 px-3 py-2 text-indigo-400">{t('videosRetry')}</button>
        </>
      );
    }
    if (isLoadingMoreVideos) {
      return (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          {t('videosLoadingMore')}
        </span>
      );
    }
    if (hasMoreVideos && !isLoadingData) {
      return (
        <button onClick={onLoadMoreVideos} className="rounded-lg border border-zinc-800 px-3 py-2 hover:text-zinc-100">{t('videosLoadMore')}</button>
      );
    }
    if (captures.length > 0 && !isLoadingData) {
      return <p>{t('videosEnd')} · {captures.length}</p>;
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-100 font-sans p-2 sm:p-4 space-y-4 overflow-y-auto animate-in fade-in duration-500">
      {/* Top App Hero & Overview Bar - Bento Grid Card */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all hover:border-zinc-700/80">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">{t('appTitle')}</h2>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                {t('dbConnected')}
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              {t('appDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Bar */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2 text-xs overflow-x-auto pb-1 [&>button]:shrink-0">
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
            <YoutubeIcon className="w-3.5 h-3.5 text-red-500" />
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

      {/* TRACKING PIPELINE VIEW */}
      {subTab === 'tracking' && (
        <PipelineTrackingView
          language={language}
          statusCounts={statusCounts}
          onAddLog={onAddLog}
          t={t}
        />
      )}

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
                placeholder={t('filterPlaceholder')}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 font-mono"
              />
            </div>
            {onStepFilterChange && (
              <select
                value={stepFilter}
                onChange={(e) => {
                  onStepFilterChange(e.target.value);
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
                <option value="COURT_ORDER">COURT_ORDER ({statusCounts['COURT_ORDER'] || 0})</option>
                <option value="REPROCESSING">REPROCESSING ({statusCounts['REPROCESSING'] || 0})</option>
                <option value="DELETED">DELETED ({statusCounts['DELETED'] || 0})</option>
              </select>
            )}

            {onChannelFilterChange && (
              <select
                value={channelFilter}
                onChange={(e) => {
                  onChannelFilterChange(e.target.value);
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
          {renderCapturesGrid()}

          <div ref={loadMoreSentinel} className="flex flex-col items-center justify-center gap-2 py-5 text-xs text-zinc-400" aria-live="polite">
            {renderLoadMoreStatus()}
          </div>
        </div>
      )}

      {subTab === 'saved_channels' && <SavedChannels
        channels={savedChannels || []}
        language={language === 'pt' ? 'pt' : 'en'}
      />}

      {subTab === 'sources' && <MonitoredChannels
        sources={sources}
        language={language === 'pt' ? 'pt' : 'en'}
        onToggle={handleToggleSourceStatus}
        onAdd={() => {setModalMode('sources'); setIsIngestionModalOpen(true);}}
      />}

      {/* INGESTION & SOURCE CREATION MODAL */}
      {isIngestionModalOpen && (
        <dialog
          open
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 border-0 m-0 max-w-none max-h-none w-full h-full"
        >
          <button
            type="button"
            aria-label={t('cancel') || 'Fechar'}
            className="fixed inset-0 bg-transparent border-0 cursor-default"
            onClick={() => setIsIngestionModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">{t('modalIngestionTitle')}</h3>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">{t('modalIngestionSub')}</p>
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
            <div className="grid grid-cols-3 p-2 gap-1.5 bg-zinc-950/80 border-b border-zinc-800 text-xs font-mono">
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
                    <p className="text-xs text-zinc-300 font-sans leading-relaxed">{t('descVideoRoute')}</p>
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-1">
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
                    <p className="text-xs text-zinc-300 font-sans leading-relaxed">{t('descPlaylistRoute')}</p>
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-1">
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
                      <span className="block text-xs text-zinc-500 font-sans">
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
                    <p className="text-xs text-zinc-300 font-sans leading-relaxed">{t('descSourcesRoute')}</p>
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-1">
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
        </dialog>
      )}

      {/* Video Details Modal */}
      {selectedVideo && (
        <dialog
          open
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm border-0 m-0 max-w-none max-h-none w-full h-full"
        >
          <button
            type="button"
            aria-label={t('cancel') || 'Fechar'}
            className="fixed inset-0 bg-transparent border-0 cursor-default"
            onClick={() => setSelectedVideo(null)}
          />
          <div className="relative z-10 bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
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
                      <YoutubeIcon className="w-16 h-16 text-zinc-700 opacity-50" />
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/80 text-white font-mono text-xs border border-zinc-700/50">{formatDuration(selectedVideo.duration)}</span>
                </div>
                <div className="flex flex-col gap-3">
                  <h3 className="text-lg font-bold text-zinc-100 leading-tight">{selectedVideo.title}</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs uppercase font-bold border border-indigo-500/30">
                        {selectedVideo.sourceName.charAt(0)}
                      </span>
                      {selectedVideo.sourceName}
                    </span>
                    <span className={`px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-700 ${selectedVideo.deletionRequested ? 'text-amber-400' : getStatusColor(selectedVideo.status)} text-xs uppercase font-mono font-bold tracking-wider shadow-sm`}>
                      {selectedVideo.deletionRequested ? t('deletionPending') : selectedVideo.status.replaceAll('_', ' ')}
                    </span>
                    {(() => {
                    if (!canDiarizeVideo(selectedVideo)) return null;
                    const modalDiarBadge = getDiarizationBadgeInfo(selectedVideo.isDiarized, selectedVideo.diarizationStatus, selectedVideo.diarizationProgress, t);
                    if (!modalDiarBadge) return null;
                    return (
                      <span className={`px-2.5 py-1 rounded-md border text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${modalDiarBadge.className}`}>
                        {modalDiarBadge.icon}
                        <span>{modalDiarBadge.label}</span>
                      </span>
                    );
                  })()}
                    {selectedVideo.publishedAt && (
                      <span className="text-xs font-mono text-zinc-400 flex items-center gap-1.5 ml-2 bg-zinc-900/50 px-2 py-1 rounded-md border border-zinc-800/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                        {t('publishedAt')}: {new Date(selectedVideo.publishedAt).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <h4 className="text-xs font-bold text-zinc-500 uppercase font-mono tracking-widest flex items-center gap-2">
                  <span className="w-1 h-3 bg-indigo-500 rounded-full"></span>
                  {t('fullDescription')}
                </h4>
                <div className="text-sm text-zinc-300 bg-zinc-900/60 p-5 rounded-xl border border-zinc-800/80 whitespace-pre-wrap font-sans leading-relaxed shadow-inner">
                  {selectedVideo.description || selectedVideo.summary || t('noDescriptionAvailable')}
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <h4 className="text-xs font-bold text-zinc-500 uppercase font-mono tracking-widest flex items-center gap-2">
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
                  <span className="text-xs font-bold text-zinc-500 uppercase font-mono tracking-widest flex items-center gap-2">
                    <span className="w-1 h-3 bg-indigo-500 rounded-full"></span>
                    {t('createdAt')}
                  </span>
                  <span className="text-sm text-zinc-300 font-mono ml-3">
                    {selectedVideo.createdAt ? new Date(selectedVideo.createdAt).toLocaleString(dateLocale) : '-'}
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800/80 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2">
                {canDeleteVideo(selectedVideo) && (
                  <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVideo(null);
                    setVideoToDelete(selectedVideo);
                  }}
                  disabled={deletingVideoIds.has(selectedVideo.id) || selectedVideo.deletionRequested}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-bold transition-all disabled:opacity-50"
                >
                  <Trash className={`w-4 h-4 ${deletingVideoIds.has(selectedVideo.id) ? 'animate-pulse' : ''}`} />
                  <span>{selectedVideo.deletionRequested ? t('deletionPending') : t('btnConfirmDelete')}</span>
                </button>
                )}
                {canDiarizeVideo(selectedVideo) && (
                  isDiarizationInProgress(selectedVideo.diarizationStatus) ? (
                    <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 text-xs font-bold flex items-center gap-1.5 border border-amber-500/20 cursor-default">
                      <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      {selectedVideo.diarizationProgress != null ? `${t('diarizing')} ${selectedVideo.diarizationProgress}%` : t('diarizing')}
                    </span>
                  ) : (
                    <button
                      onClick={(e) => handleDiarizationClick(e, selectedVideo)}
                      className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-bold shadow-sm shadow-purple-500/10 transition-colors flex items-center gap-1.5 border border-purple-500/20"
                    >
                      <ListMusic className="w-3.5 h-3.5" />
                      {selectedVideo.isDiarized || selectedVideo.diarizationStatus === 'COMPLETED' ? 'Refazer Diarização' : 'Diarização'}
                    </button>
                  )
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
        </dialog>
      )}

      {/* Delete Confirmation Modal */}
      {videoToDelete && (
        <dialog
          open
          aria-modal="true"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 border-0 m-0 max-w-none max-h-none w-full h-full"
        >
          <button
            type="button"
            aria-label={t('btnCancelDelete')}
            className="fixed inset-0 bg-transparent border-0 cursor-default"
            onClick={() => setVideoToDelete(null)}
          />
          <div className="relative z-10 bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
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
        </dialog>
      )}

      {/* Diarization Config Modal */}
      {diarizationModalVideo && (
        <dialog
          open
          aria-modal="true"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 border-0 m-0 max-w-none max-h-none w-full h-full"
        >
          <button
            type="button"
            aria-label={t('cancel') || 'Fechar'}
            className="fixed inset-0 bg-transparent border-0 cursor-default"
            onClick={() => setDiarizationModalVideo(null)}
          />
          <div className="relative z-10 bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
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
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  {t('diarizationModalLangDesc')}
                </p>
                <label className="mt-3 flex items-start gap-3 rounded-lg border border-zinc-700 p-3 text-sm text-zinc-200">
                  <input type="checkbox" checked={diarizationStartNow} onChange={event => setDiarizationStartNow(event.target.checked)} disabled={isDiarizing} className="mt-1 accent-purple-500" />
                  <span>{t('diarizationStartNow')}<span className="mt-1 block text-xs leading-relaxed text-zinc-400">{t('diarizationStartNowHint')}</span></span>
                </label>
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
        </dialog>
      )}
    </div>
  );
};
