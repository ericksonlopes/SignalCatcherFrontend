import React, { useState, useEffect } from 'react';
import {
  Mic,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Filter,
  RefreshCw,
  Check,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { LanguageMode } from '../../types';
import { getTranslation } from '../../locales';
import { DiarizationViewer } from './diarization/DiarizationViewer';

export interface DiarizationVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelName: string;
  duration: string;
  step: 'STARTED' | 'PENDING' | 'TRANSCRIPTION' | 'ALIGNMENT' | 'DIARIZATION' | 'COMPLETED' | 'ERROR' | string;
  result_json?: any;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

interface DiarizationAppProps {
  language?: LanguageMode;
  onAddLog: (app: string, level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}

const formatDuration = (duration: number | string | undefined | null): string => {
  if (duration == null) return '00:00';
  if (typeof duration === 'string') {
    if (duration.includes(':')) {
      const parts = duration.split(':');
      if (parts.length === 3 && parts[0] === '00') {
        return `${parts[1]}:${parts[2]}`;
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

  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const DiarizationApp: React.FC<DiarizationAppProps> = ({ language = 'en', onAddLog }) => {
  const { t } = getTranslation(language);
  const [videos, setVideos] = useState<DiarizationVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<DiarizationVideo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stepFilter, setStepFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const fetchDiarizations = async () => {
      try {
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('limit', limit.toString());
        if (stepFilter && stepFilter !== 'ALL') {
          params.append('step', stepFilter);
        }
        if (searchQuery.trim()) {
          params.append('search', searchQuery.trim());
        }

        const res = await fetch(`${API_BASE_URL}/api/diarization/list?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        
        if (isMounted) {
          setVideos(data.items || data.diarizations || []);
          if (data.total_pages !== undefined) setTotalPages(data.total_pages);
          if (data.total !== undefined) setTotalItems(data.total);
        }
      } catch (err) {
        if (isMounted) {
          onAddLog('Diarization', 'error', `${t('loadDiarizationsError')} ${err}`);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDiarizations();
    const interval = setInterval(fetchDiarizations, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentPage, limit, stepFilter, searchQuery, onAddLog]);

  const handleStepFilterChange = (newStep: string) => {
    setStepFilter(newStep);
    setCurrentPage(1);
  };

  const handleSearchChange = (newSearch: string) => {
    setSearchQuery(newSearch);
    setCurrentPage(1);
  };

  const getStepBadge = (step: DiarizationVideo['step']) => {
    const normalizedStep = (step || '').toUpperCase();
    switch (normalizedStep) {
      case 'STARTED':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800/80 text-zinc-300 border border-zinc-700 uppercase tracking-wider"><Play className="w-3 h-3" /> {t('stepStarted')}</span>;
      case 'PENDING':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800/80 text-zinc-300 border border-zinc-700 uppercase tracking-wider"><Play className="w-3 h-3" /> {t('stepPending')}</span>;
      case 'PROCESSING':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider"><RefreshCw className="w-3 h-3 animate-spin" /> {t('stepProcessing')}</span>;
      case 'TRANSCRIPTION':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider"><RefreshCw className="w-3 h-3 animate-spin" /> {t('stepTranscription')}</span>;
      case 'ALIGNMENT':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-wider"><RefreshCw className="w-3 h-3 animate-spin" /> {t('stepAlignment')}</span>;
      case 'DIARIZATION':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20 uppercase tracking-wider"><RefreshCw className="w-3 h-3 animate-spin" /> {t('stepDiarization')}</span>;
      case 'COMPLETED':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider"><Check className="w-3 h-3" /> {t('stepCompleted')}</span>;
      case 'ERROR':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wider"><X className="w-3 h-3" /> {t('stepError')}</span>;
      default:
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800/80 text-zinc-400 border border-zinc-700 uppercase tracking-wider">{normalizedStep}</span>;
    }
  };

  return (
    <div className="flex h-full bg-zinc-950 overflow-hidden">
      
      {/* Sidebar / Master List */}
      <div className={`flex flex-col border-r border-zinc-800/80 bg-zinc-950/50 transition-all duration-300 ${selectedVideo ? 'w-0 lg:w-[380px] opacity-0 lg:opacity-100 overflow-hidden' : 'w-full lg:w-[450px]'}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-800/80 bg-zinc-900/30">
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2 mb-4">
            <Mic className="w-5 h-5 text-indigo-500" />
            {t('diarizationAppTitle')}
          </h1>
          
          <div className="flex flex-col gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="text"
                placeholder={t('searchDiarizationsPlaceholder')}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStepFilterChange('ALL')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider text-center transition-all ${stepFilter === 'ALL' ? 'bg-zinc-800 text-white shadow-sm' : 'bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800/80'}`}
                >
                  {t('stepAll')}
                </button>
                <button
                  onClick={() => handleStepFilterChange('PENDING')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider text-center transition-all ${stepFilter === 'PENDING' ? 'bg-zinc-800/80 text-zinc-300 shadow-sm border border-zinc-700' : 'bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800/80'}`}
                >
                  {t('stepPendingPlural')}
                </button>
                <button
                  onClick={() => handleStepFilterChange('PROCESSING')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider text-center transition-all ${stepFilter === 'PROCESSING' ? 'bg-amber-500/20 text-amber-400 shadow-sm border border-amber-500/30' : 'bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800/80'}`}
                >
                  {t('stepProcessing')}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStepFilterChange('ERROR')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider text-center transition-all ${stepFilter === 'ERROR' ? 'bg-red-500/20 text-red-400 shadow-sm border border-red-500/30' : 'bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800/80'}`}
                >
                  {t('stepErrorsPlural')}
                </button>
                <button
                  onClick={() => handleStepFilterChange('COMPLETED')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider text-center transition-all ${stepFilter === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm border border-emerald-500/30' : 'bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800/80'}`}
                >
                  {t('stepCompletedPlural')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-zinc-500">
              <Mic className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">{t('noDiarizationsFound')}</p>
            </div>
          ) : (
            videos.map(video => (
              <div 
                key={video.id}
                onClick={() => video.step === 'COMPLETED' ? setSelectedVideo(video) : null}
                className={`p-3 rounded-2xl border transition-all ${
                  selectedVideo?.id === video.id 
                    ? 'bg-indigo-500/10 border-indigo-500/30 shadow-sm' 
                    : video.step === 'COMPLETED'
                      ? 'bg-zinc-900/40 border-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-700 cursor-pointer'
                      : 'bg-zinc-900/20 border-transparent opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex gap-3">
                  <div className="relative w-24 h-14 shrink-0 rounded-lg overflow-hidden bg-zinc-800 shadow-inner">
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[9px] font-mono font-bold text-zinc-300">
                      {formatDuration(video.duration)}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col min-w-0 justify-center">
                    <h3 className={`text-sm font-bold truncate ${selectedVideo?.id === video.id ? 'text-indigo-100' : 'text-zinc-200'}`}>
                      {video.title}
                    </h3>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">
                      {video.channelName}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      {getStepBadge(video.step)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 0 && (
          <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span>{totalItems} total</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || isLoading}
                className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title={t('prevPage')}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-[11px] text-zinc-300">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || isLoading}
                className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title={t('nextPage')}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] rounded px-1.5 py-0.5 outline-none focus:border-indigo-500 font-mono ml-1"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Content / Detail View */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${!selectedVideo ? 'hidden lg:flex' : 'flex'}`}>
        {selectedVideo ? (
          <DiarizationViewer key={selectedVideo.id} video={selectedVideo} language={language} onClose={() => setSelectedVideo(null)} />
        ) : (

          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/10 p-8 text-center">
            <div className="w-24 h-24 mb-6 rounded-full bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-center">
              <Mic className="w-10 h-10 text-zinc-600" />
            </div>
            <h2 className="text-xl font-bold text-zinc-300 mb-2">{t('diarizationWorkspaceTitle')}</h2>
            <p className="max-w-md text-sm text-zinc-500 leading-relaxed">
              {t('diarizationWorkspaceDesc')}
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
