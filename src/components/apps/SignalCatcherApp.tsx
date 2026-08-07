import React, { useState } from 'react';
import { 
  Radio, 
  Database, 
  Video, 
  Clock, 
  Play, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  Tag, 
  ThumbsUp, 
  MessageSquare, 
  Eye, 
  Zap, 
  Sliders, 
  BarChart2, 
  Terminal,
  Calendar,
  Sparkles,
  PauseCircle,
  PlayCircle
} from 'lucide-react';
import { CapturedVideo, ContentSource, ScheduledJob } from '../../types';

interface SignalCatcherAppProps {
  sources: ContentSource[];
  setSources: React.Dispatch<React.SetStateAction<ContentSource[]>>;
  captures: CapturedVideo[];
  setCaptures: React.Dispatch<React.SetStateAction<CapturedVideo[]>>;
  jobs: ScheduledJob[];
  setJobs: React.Dispatch<React.SetStateAction<ScheduledJob[]>>;
  onTriggerJob: (jobId: string) => void;
  onAddLog: (sourceApp: string, level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}

export const SignalCatcherApp: React.FC<SignalCatcherAppProps> = ({
  sources,
  setSources,
  captures,
  setCaptures,
  jobs,
  setJobs,
  onTriggerJob,
  onAddLog
}) => {
  const [subTab, setSubTab] = useState<'captures' | 'sources' | 'jobs' | 'stats'>('captures');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [isCapturingNow, setIsCapturingNow] = useState(false);

  // New source form state
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceType, setNewSourceType] = useState<'youtube' | 'rss' | 'twitch'>('youtube');
  const [newSourceInterval, setNewSourceInterval] = useState(60);

  // Extract all unique tags
  const allTags = Array.from(new Set(captures.flatMap((c) => c.tags)));

  // Filtered captures
  const filteredCaptures = captures.filter((c) => {
    const matchesQuery = 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sourceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'all' || c.tags.includes(selectedTag);
    return matchesQuery && matchesTag;
  });

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

  const handleToggleSourceStatus = (id: string) => {
    setSources(sources.map(s => {
      if (s.id === id) {
        const nextStatus = s.status === 'active' ? 'paused' : 'active';
        onAddLog('SignalCatcher', 'info', `Status da fonte ${s.name} alterado para ${nextStatus}`);
        return { ...s, status: nextStatus };
      }
      return s;
    }));
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
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">YouTube Catcher Engine</h2>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                PostgreSQL OK
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Captura automatizada de vídeos do YouTube • Ingestão diária • REST API FastAPI & PostgreSQL
            </p>
          </div>
        </div>

        {/* Quick Stats Bento Metrics */}
        <div className="grid grid-cols-3 gap-3 w-full lg:w-auto font-mono text-xs">
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center">
            <div className="text-zinc-500 text-[10px] uppercase font-semibold tracking-wider">Fontes Ativas</div>
            <div className="text-lg font-bold text-indigo-400 mt-0.5">{sources.filter(s => s.status === 'active').length} / {sources.length}</div>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center">
            <div className="text-zinc-500 text-[10px] uppercase font-semibold tracking-wider">PostgreSQL</div>
            <div className="text-lg font-bold text-cyan-400 mt-0.5">{captures.length}</div>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center">
            <div className="text-zinc-500 text-[10px] uppercase font-semibold tracking-wider">Jobs Agendados</div>
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
            <span>Capturas Ingeridas ({captures.length})</span>
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
            <span>Fontes ({sources.length})</span>
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
            <span>Cron Jobs ({jobs.length})</span>
          </button>
        </div>

        {/* Action Trigger Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualCaptureTrigger}
            disabled={isCapturingNow}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCapturingNow ? 'animate-spin' : ''}`} />
            <span>{isCapturingNow ? 'Capturando...' : 'Executar Captura Agora'}</span>
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
                placeholder="Filtrar capturas por título, canal ou tag..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 font-mono"
              />
            </div>

            {/* Tag Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none text-xs font-mono">
              <button
                onClick={() => setSelectedTag('all')}
                className={`px-3 py-1.5 rounded-xl border text-[11px] transition-all ${
                  selectedTag === 'all'
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 font-bold'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Todas Tags
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-1.5 rounded-xl border text-[11px] whitespace-nowrap transition-all ${
                    selectedTag === tag
                      ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Videos Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCaptures.map((video) => (
              <div
                key={video.id}
                className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
              >
                <div>
                  {/* Card Header: Channel Info */}
                  <div className="flex items-center gap-2 mb-3">
                    <img src={video.sourceAvatar} alt="" className="w-5 h-5 rounded-full" />
                    <span className="text-xs font-semibold text-zinc-200">{video.sourceName}</span>
                  </div>

                  {/* Thumbnail & Badges */}
                  <div className="relative mb-3.5 rounded-xl overflow-hidden aspect-video bg-zinc-950 border border-zinc-800">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />
                    
                    {/* Duration Badge */}
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-zinc-950/90 text-white font-mono text-[10px] border border-zinc-700">
                      {video.duration}
                    </span>

                    {/* PostgreSQL Record ID Badge */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-indigo-500/10 text-indigo-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-indigo-500/20 backdrop-blur-md">
                      <Database className="w-3 h-3 text-indigo-400" />
                      <span>{video.postgresRecordId}</span>
                    </div>
                  </div>

                  {/* Title & Summary */}
                  <h3 className="font-bold text-sm text-zinc-100 group-hover:text-indigo-300 transition-colors line-clamp-2 mb-2">
                    {video.title}
                  </h3>

                  {video.summary && (
                    <p className="text-xs text-zinc-400 line-clamp-2 font-sans mb-3 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/60">
                      {video.summary}
                    </p>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {video.tags.map((t) => (
                      <span key={t} className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-zinc-950 text-indigo-400 border border-zinc-800">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Footer: Abrir Button */}
                <div className="pt-3 mt-3 border-t border-zinc-800/80 flex items-center justify-end">
                  <a
                    href={video.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-sm hover:scale-[1.02]"
                  >
                    <span>Abrir</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SOURCES MANAGER */}
      {subTab === 'sources' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-200 font-mono">
              Fontes de Conteúdo Monitoradas ({sources.length})
            </h3>
            <button
              onClick={() => setIsAddingSource(!isAddingSource)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 text-xs font-mono transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Fonte</span>
            </button>
          </div>

          {/* Add Source Drawer / Form */}
          {isAddingSource && (
            <form onSubmit={handleAddSource} className="p-4 rounded-2xl bg-slate-900 border border-cyan-500/40 space-y-3 animate-in fade-in">
              <h4 className="font-bold text-xs text-cyan-400 uppercase font-mono">
                Registrar Nova Fonte no SignalCatcher
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <label className="block text-slate-400 mb-1">Nome do Canal / Feed</label>
                  <input
                    type="text"
                    required
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    placeholder="Ex: Fireship Official"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Tipo de Fonte</label>
                  <select
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200"
                  >
                    <option value="youtube">YouTube Channel</option>
                    <option value="rss">RSS Feed</option>
                    <option value="twitch">Twitch Stream</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-slate-400 mb-1">URL da Fonte</label>
                  <input
                    type="url"
                    required
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    placeholder="https://youtube.com/@channel"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingSource(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs font-mono hover:bg-cyan-400 transition-colors"
                >
                  Confirmar Registro
                </button>
              </div>
            </form>
          )}

          {/* Sources List Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl font-mono text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                    <th className="p-3">Canal / Fonte</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Inscritos</th>
                    <th className="p-3">Intervalo Captura</th>
                    <th className="p-3">Total Ingerido</th>
                    <th className="p-3">Última Captura</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Ação</th>
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
                      <td className="p-3">
                        <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                          {source.type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">
                        {source.subscriberCount.toLocaleString()}
                      </td>
                      <td className="p-3 text-slate-400">
                        Cada {source.intervalMinutes} min
                      </td>
                      <td className="p-3 font-bold text-cyan-400">
                        {source.totalCaptured} vids
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
              Gerenciador de Jobs Agendados (FastAPI & PostgreSQL)
            </h3>
            <span className="text-xs text-slate-400">
              Frequência baseada em Cron + BackgroundTasks
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
                    Target: <strong className="text-slate-200">{job.targetSource}</strong>
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950 p-2.5 rounded-xl border border-slate-800/60 mb-3">
                    <div>
                      <span className="text-slate-500 block">Última Execução:</span>
                      <span className="text-slate-300">{job.lastRun.replace('T', ' ').slice(11, 19)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Próxima Rodada:</span>
                      <span className="text-slate-300">{job.nextRun.replace('T', ' ').slice(11, 19)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Total Execuções:</span>
                      <span className="text-cyan-400 font-bold">{job.executionCount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Tempo Médio:</span>
                      <span className="text-emerald-400">{job.avgDurationSec}s</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-[10px] text-slate-500">Status: {job.status.toUpperCase()}</span>
                  <button
                    onClick={() => onTriggerJob(job.id)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-colors"
                  >
                    <Play className="w-3 h-3 fill-slate-950" />
                    <span>Disparar Agora</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
