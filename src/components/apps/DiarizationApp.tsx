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
  X
} from 'lucide-react';
import { LanguageMode } from '../../types';
import { DiarizationViewer } from './diarization/DiarizationViewer';

export interface DiarizationVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelName: string;
  duration: string;
  step: 'STARTED' | 'PENDING' | 'TRANSCRIPTION' | 'ALIGNMENT' | 'DIARIZATION' | 'COMPLETED' | 'ERROR';
  result_json?: any;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

interface DiarizationAppProps {
  language: LanguageMode;
  onAddLog: (app: string, level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}

export const DiarizationApp: React.FC<DiarizationAppProps> = ({ language, onAddLog }) => {
  const [videos, setVideos] = useState<DiarizationVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<DiarizationVideo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stepFilter, setStepFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDiarizations = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/diarization/list`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setVideos(data.diarizations || []);
      } catch (err) {
        onAddLog('Diarization', 'error', `Falha ao carregar diarizações: ${err}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDiarizations();
    const interval = setInterval(fetchDiarizations, 5000);
    return () => clearInterval(interval);
  }, [onAddLog]);

  const filteredVideos = videos.filter(v => {
    const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.channelName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStep = stepFilter === 'ALL' || v.step === stepFilter;
    return matchesSearch && matchesStep;
  });

  const getStepBadge = (step: DiarizationVideo['step']) => {
    const normalizedStep = (step || '').toUpperCase();
    switch (normalizedStep) {
      case 'STARTED':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800/80 text-zinc-300 border border-zinc-700 uppercase tracking-wider"><Play className="w-3 h-3" /> Iniciado</span>;
      case 'PENDING':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800/80 text-zinc-300 border border-zinc-700 uppercase tracking-wider"><Play className="w-3 h-3" /> Pendente</span>;
      case 'TRANSCRIPTION':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider"><RefreshCw className="w-3 h-3 animate-spin" /> Transcrevendo</span>;
      case 'ALIGNMENT':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-wider"><RefreshCw className="w-3 h-3 animate-spin" /> Alinhando</span>;
      case 'DIARIZATION':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20 uppercase tracking-wider"><RefreshCw className="w-3 h-3 animate-spin" /> Separando Vozes</span>;
      case 'COMPLETED':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider"><Check className="w-3 h-3" /> Concluído</span>;
      case 'ERROR':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wider"><X className="w-3 h-3" /> Erro</span>;
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
            Diarizações
          </h1>
          
          <div className="flex flex-col gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="text"
                placeholder="Buscar por título ou canal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStepFilter('ALL')}
                className={`py-1.5 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${stepFilter === 'ALL' ? 'bg-zinc-800 text-white shadow-sm' : 'bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800/80'}`}
              >
                Todas
              </button>
              <button
                onClick={() => setStepFilter('PENDING')}
                className={`py-1.5 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${stepFilter === 'PENDING' ? 'bg-zinc-800/80 text-zinc-300 shadow-sm border border-zinc-700' : 'bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800/80'}`}
              >
                Pendentes
              </button>
              <button
                onClick={() => setStepFilter('TRANSCRIPTION')}
                className={`py-1.5 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${stepFilter === 'TRANSCRIPTION' ? 'bg-amber-500/20 text-amber-400 shadow-sm border border-amber-500/30' : 'bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800/80'}`}
              >
                Transcrevendo
              </button>
              <button
                onClick={() => setStepFilter('DIARIZATION')}
                className={`py-1.5 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${stepFilter === 'DIARIZATION' ? 'bg-purple-500/20 text-purple-400 shadow-sm border border-purple-500/30' : 'bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800/80'}`}
              >
                Separando
              </button>
              <button
                onClick={() => setStepFilter('ERROR')}
                className={`py-1.5 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${stepFilter === 'ERROR' ? 'bg-red-500/20 text-red-400 shadow-sm border border-red-500/30' : 'bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800/80'}`}
              >
                Erro
              </button>
              <button
                onClick={() => setStepFilter('COMPLETED')}
                className={`py-1.5 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${stepFilter === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm border border-emerald-500/30' : 'bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800/80'}`}
              >
                Concluídos
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-zinc-500">
              <Mic className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">Nenhuma diarização encontrada.</p>
            </div>
          ) : (
            filteredVideos.map(video => (
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
                      {video.duration}
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
      </div>

      {/* Main Content / Detail View */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${!selectedVideo ? 'hidden lg:flex' : 'flex'}`}>
        {selectedVideo ? (
          <DiarizationViewer key={selectedVideo.id} video={selectedVideo} onClose={() => setSelectedVideo(null)} />
        ) : (

          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/10 p-8 text-center">
            <div className="w-24 h-24 mb-6 rounded-full bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-center">
              <Mic className="w-10 h-10 text-zinc-600" />
            </div>
            <h2 className="text-xl font-bold text-zinc-300 mb-2">Workspace de Diarização</h2>
            <p className="max-w-md text-sm text-zinc-500 leading-relaxed">
              Selecione uma diarização concluída na lista ao lado para visualizar a transcrição separada por locutores.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
