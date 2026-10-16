import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Clock,
  Database,
  ExternalLink,
  FileText,
  Fingerprint,
  Globe,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Tv,
  User,
} from 'lucide-react';
import { API_BASE_URL, apiFetch } from '../../api';
import { getTranslation } from '../../locales';
import type { LanguageMode, SemanticSearchResult, SpeakerProfile, VectorizationStats } from '../../types';

interface SemanticSearchAppProps {
  readonly language?: LanguageMode;
  readonly onAddLog: (app: string, level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}

type SourceFilter = 'ALL' | 'YOUTUBE_TRANSCRIPT' | 'DOCUMENT' | 'WEBSITE';

function getScoreBadgeColorClass(scoreNumber: number): string {
  if (scoreNumber >= 80) {
    return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50';
  }
  if (scoreNumber >= 60) {
    return 'bg-amber-950/80 text-amber-300 border-amber-800/50';
  }
  return 'bg-zinc-800/80 text-zinc-300 border-zinc-700/50';
}

export function SemanticSearchApp({ language = 'pt', onAddLog }: Readonly<SemanticSearchAppProps>) {
  const { t } = getTranslation(language);

  const [query, setQuery] = useState('');
  const [minSimilarity, setMinSimilarity] = useState(0.4);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [speakerFilter, setSpeakerFilter] = useState<string>('');
  const [speakerProfiles, setSpeakerProfiles] = useState<SpeakerProfile[]>([]);
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [stats, setStats] = useState<VectorizationStats | null>(null);
  const [isCheckingStats, setIsCheckingStats] = useState(false);
  const [isBatchVectorizing, setIsBatchVectorizing] = useState(false);

  const fetchStats = useCallback(async () => {
    setIsCheckingStats(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/vectorization/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load vectorization stats', err);
    } finally {
      setIsCheckingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    apiFetch(`${API_BASE_URL}/api/voice-recognition/profiles`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) setSpeakerProfiles(data);
      })
      .catch(() => {});
  }, [fetchStats]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/search/semantic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          limit: 16,
          min_similarity: minSimilarity,
          source_type: sourceFilter === 'ALL' ? undefined : sourceFilter,
          speaker: speakerFilter.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
      }

      const data: SemanticSearchResult[] = await res.json();
      setResults(data);
      onAddLog(
        'search',
        'info',
        `Busca semântica por "${query}" retornou ${data.length} trechos relevantes.`
      );
    } catch (err) {
      console.error('Semantic search error:', err);
      onAddLog('search', 'error', `Falha na busca semântica: ${String(err)}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBatchVectorize = async () => {
    setIsBatchVectorizing(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/vectorization/batch`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        onAddLog('vectorization', 'success', `Vetorização em lote concluída: ${data.length} tarefas.`);
        fetchStats();
      }
    } catch (err) {
      console.error('Batch vectorize error:', err);
      onAddLog('vectorization', 'error', `Erro na vetorização em lote: ${String(err)}`);
    } finally {
      setIsBatchVectorizing(false);
    }
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'YOUTUBE_TRANSCRIPT':
        return <Tv className="w-3.5 h-3.5 text-cyan-400" />;
      case 'DOCUMENT':
        return <FileText className="w-3.5 h-3.5 text-amber-400" />;
      case 'WEBSITE':
        return <Globe className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  const getSourceLabel = (sourceType: string) => {
    switch (sourceType) {
      case 'YOUTUBE_TRANSCRIPT':
        return 'Vídeo YouTube';
      case 'DOCUMENT':
        return 'Documento';
      case 'WEBSITE':
        return 'Website';
      default:
        return 'Geral';
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-zinc-950 text-zinc-100 p-6 space-y-6">
      {/* Header and Cluster Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">
              {t('semanticSearchTab')}
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Pesquise por conceitos, transcrições de vídeos, documentos e páginas web.
          </p>
        </div>

        {/* Stats Pills */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
            <Activity
              className={`w-4 h-4 ${
                stats?.tei_healthy ? 'text-emerald-400' : 'text-amber-400'
              }`}
            />
            <span className="text-zinc-400">TEI (Portainer):</span>
            <span
              className={`font-semibold ${
                stats?.tei_healthy ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {stats?.tei_healthy ? 'Online' : 'Aguardando'}
            </span>
            <button
              type="button"
              onClick={fetchStats}
              disabled={isCheckingStats}
              title="Testar conexão com TEI novamente"
              className="ml-1 p-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
            >
              <RefreshCw className={`w-3 h-3 ${isCheckingStats ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-zinc-400">Total Chunks:</span>
            <span className="font-semibold text-zinc-200">
              {stats?.total_chunks ?? 0}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
            <Database className="w-4 h-4 text-purple-400" />
            <span className="text-zinc-400">Fontes Indexadas:</span>
            <span className="font-semibold text-zinc-200">
              {stats?.total_indexed_diarizations ?? 0}
            </span>
          </div>

          <button
            onClick={handleBatchVectorize}
            disabled={isBatchVectorizing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition disabled:opacity-50"
            title="Vetoriza todas as transcrições concluídas que ainda não possuem embeddings"
          >
            {isBatchVectorizing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>Vetorizar em Lote</span>
          </button>
        </div>
      </div>

      {/* TEI Connection Notice */}
      {stats && !stats.tei_healthy && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div className="space-y-0.5">
            <p className="font-semibold">Serviço de Embeddings (TEI) indisponível</p>
            <p className="text-amber-400/80 leading-relaxed">
              O backend não conseguiu se conectar ao HuggingFace TEI. Verifique se o container está ativo no Portainer e se o endereço em <code className="bg-amber-950/60 px-1 py-0.5 rounded font-mono">TEI_API_URL</code> (ex: <code className="bg-amber-950/60 px-1 py-0.5 rounded font-mono">http://eriberry.local:8090</code>) está acessível.
            </p>
          </div>
        </div>
      )}

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('semanticSearchPlaceholder')}
            className="w-full pl-12 pr-32 py-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-sm shadow-inner transition"
          />
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="absolute right-2 px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-sm transition flex items-center gap-2 disabled:opacity-50 shadow-md shadow-cyan-500/10"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('semanticSearchSearching')}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{t('semanticSearchButton')}</span>
              </>
            )}
          </button>
        </div>

        {/* Source Filters, Speaker Selector and Threshold */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-400">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-medium">Fonte:</span>
              {[
                { id: 'ALL', label: 'Todas as Fontes', icon: Layers },
                { id: 'YOUTUBE_TRANSCRIPT', label: 'Vídeos', icon: Tv },
                { id: 'DOCUMENT', label: 'Documentos', icon: FileText },
                { id: 'WEBSITE', label: 'Sites Web', icon: Globe },
              ].map((f) => {
                const Icon = f.icon;
                const active = sourceFilter === f.id;
                return (
                  <button
                    type="button"
                    key={f.id}
                    onClick={() => setSourceFilter(f.id as SourceFilter)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition ${
                      active
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 font-semibold'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Filter by Speaker if voice recognition profiles exist */}
            {speakerProfiles.length > 0 && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800">
                <Fingerprint className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-zinc-500 font-medium">Locutor:</span>
                <select
                  value={speakerFilter}
                  onChange={(e) => setSpeakerFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="">Todos os Locutores</option>
                  {speakerProfiles.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span>{t('semanticSearchMinScore')}:</span>
            <input
              type="range"
              min="0.2"
              max="0.9"
              step="0.05"
              value={minSimilarity}
              onChange={(e) => setMinSimilarity(Number.parseFloat(e.target.value))}
              className="w-32 accent-cyan-400 cursor-pointer"
            />
            <span className="font-mono text-cyan-400 font-medium">
              {(minSimilarity * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </form>

      {/* Results Section */}
      <div className="space-y-4">
        {isSearching && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-sm">{t('semanticSearchSearching')}</p>
          </div>
        )}

        {!isSearching && hasSearched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 space-y-3 border border-dashed border-zinc-800 rounded-2xl">
            <AlertCircle className="w-8 h-8 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-400">{t('semanticSearchEmpty')}</p>
            <p className="text-xs text-zinc-600">{t('semanticSearchHelp')}</p>
          </div>
        )}

        {!isSearching && results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
              <span>{t('semanticSearchResults')} ({results.length})</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((result) => {
                const scoreNumber = result.similarity_score * 100;
                const scorePercent = scoreNumber.toFixed(1);
                const displayTitle = result.title || result.video_title || 'Sem título';
                const displaySubtitle = result.subtitle || result.channel_title;
                const targetLink = result.deep_link || result.youtube_url_with_timestamp;

                return (
                  <div
                    key={result.chunk_id}
                    className="flex flex-col justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition space-y-3 group shadow-sm hover:shadow-cyan-950/20"
                  >
                    {/* Top Row: Thumbnail & Metadata */}
                    <div className="flex items-start gap-3">
                      {result.thumbnail_url ? (
                        <img
                          src={result.thumbnail_url}
                          alt={displayTitle}
                          className="w-20 h-14 object-cover rounded-md border border-zinc-800 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-md bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center shrink-0">
                          {getSourceIcon(result.source_type)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                            {getSourceIcon(result.source_type)}
                            <span>{getSourceLabel(result.source_type)}</span>
                          </span>
                        </div>
                        <h3 className="text-xs font-semibold text-zinc-200 line-clamp-1 group-hover:text-cyan-300 transition">
                          {displayTitle}
                        </h3>
                        {displaySubtitle && (
                          <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                            {displaySubtitle}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {result.formatted_start_time && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 font-mono">
                              <Clock className="w-3 h-3" />
                              {result.formatted_start_time} - {result.formatted_end_time}
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono border ${getScoreBadgeColorClass(
                              scoreNumber
                            )}`}
                          >
                            {scorePercent}% match
                          </span>
                          {result.speaker && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/50">
                              <User className="w-3 h-3 text-indigo-400" />
                              {result.speaker}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Transcript / Document Excerpt */}
                    <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/50 text-xs text-zinc-300 font-sans leading-relaxed whitespace-pre-line max-h-36 overflow-y-auto">
                      {result.text}
                    </div>

                    {/* Bottom Action: Jump to YouTube video or open Document/Website */}
                    <div className="flex items-center justify-end pt-1">
                      {targetLink ? (
                        <a
                          href={targetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-cyan-300 text-xs font-medium transition"
                        >
                          <span>
                            {result.source_type === 'YOUTUBE_TRANSCRIPT'
                              ? t('semanticSearchJumpToVideo')
                              : 'Abrir Fonte'}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
