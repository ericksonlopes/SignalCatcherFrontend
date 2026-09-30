import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, FileText, Loader2, Mic, RefreshCw, Search, X } from 'lucide-react';
import { API_BASE_URL, apiFetch } from '../../api';
import type { LanguageMode } from '../../types';
import { getTranslation } from '../../locales';
import type { TranslationKeys } from '../../locales/pt';
import { DiarizationViewer } from './diarization/DiarizationViewer';
import { formatTime, type TranscriptResult } from './diarization/transcript';
import { useInfiniteDiarizations } from '../../hooks/useInfiniteDiarizations';

export interface DiarizationVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelName: string;
  duration: string;
  step: string;
  progress_percent?: number | null;
  entity_id?: string;
  entity_type?: string;
  result_json?: TranscriptResult | null;
}
interface DiarizationAppProps {
  language?: LanguageMode;
  onAddLog: (app: string, level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}
const filters: { value: string; label: TranslationKeys }[] = [
  { value: 'ALL', label: 'stepAll' }, { value: 'COMPLETED', label: 'stepCompletedPlural' },
  { value: 'PROCESSING', label: 'stepProcessing' }, { value: 'PENDING', label: 'stepPendingPlural' },
  { value: 'ERROR', label: 'stepErrorsPlural' },
];
const steps: Record<string, { label: TranslationKeys; color: string }> = {
  STARTED: { label: 'stepStarted', color: 'text-zinc-300 bg-zinc-800/50' },
  PENDING: { label: 'stepPending', color: 'text-zinc-300 bg-zinc-800/50' },
  PROCESSING: { label: 'stepProcessing', color: 'text-amber-400 bg-amber-500/10' },
  TRANSCRIPTION: { label: 'stepTranscription', color: 'text-amber-400 bg-amber-500/10' },
  ALIGNMENT: { label: 'stepAlignment', color: 'text-blue-400 bg-blue-500/10' },
  DIARIZATION: { label: 'stepDiarization', color: 'text-purple-400 bg-purple-500/10' },
  DIARIZED: { label: 'stepDiarized', color: 'text-purple-400 bg-purple-500/10' },
  COMPLETED: { label: 'stepCompleted', color: 'text-emerald-400 bg-emerald-500/10' },
  ERROR: { label: 'stepError', color: 'text-red-400 bg-red-500/10' },
};
const button = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 text-sm text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40';
function durationLabel(duration: string) {
  if (String(duration || '').includes(':')) return duration;
  return formatTime(Number(duration));
}

export const DiarizationApp: React.FC<DiarizationAppProps> = ({ language = 'en', onAddLog }) => {
  const { t } = getTranslation(language);
  const [selectedVideo, setSelectedVideo] = useState<DiarizationVideo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [stepFilter, setStepFilter] = useState('COMPLETED');
  const [refresh, setRefresh] = useState(0);
  const [reprocessingIds, setReprocessingIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState('');
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const reportedError = useRef(false);
  const { videos, setVideos, isLoading, isFetching, isLoadingMore, hasMore, loadError, totalItems, loadMore, retry } =
    useInfiniteDiarizations(stepFilter, debouncedQuery, refresh);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [stepFilter, debouncedQuery]);

  useEffect(() => {
    if (!hasMore || isFetching || isLoading || loadError) return;
    const sentinel = sentinelRef.current;
    if (!sentinel || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadMore();
    }, { root: scrollRef.current, rootMargin: '300px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFetching, isLoading, loadError, loadMore, videos.length, selectedVideo?.id]);

  useEffect(() => {
    if (loadError && !reportedError.current) {
      onAddLog('Diarization', 'error', t('loadDiarizationsError'));
      reportedError.current = true;
    } else if (!isFetching && !loadError) {
      reportedError.current = false;
    }
  }, [loadError, isFetching, onAddLog, language]);

  async function reprocess(video: DiarizationVideo) {
    if (reprocessingIds.has(video.id)) return;
    setReprocessingIds(previous => new Set(previous).add(video.id));
    try {
      const response = await apiFetch(API_BASE_URL + '/api/diarization/' + video.id + '/reprocess', { method: 'POST' });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'HTTP ' + response.status);
      }
      setVideos(previous => previous.map(item => item.id === video.id ? { ...item, step: 'PENDING', progress_percent: null } : item));
      setNotice(t('notifReprocessDiarizationSuccess'));
      onAddLog('Diarization', 'success', t('notifReprocessDiarizationSuccess') + ' (' + video.title + ')');
      setRefresh(value => value + 1);
    } catch (error) {
      const message = t('notifReprocessDiarizationError') + ' ' + String(error);
      setNotice(message);
      onAddLog('Diarization', 'error', message);
    } finally {
      setReprocessingIds(previous => { const next = new Set(previous); next.delete(video.id); return next; });
    }
  }
  function clearFilters() { setSearchQuery(''); setDebouncedQuery(''); setStepFilter('COMPLETED'); }
  function closeViewer() { setSelectedVideo(null); requestAnimationFrame(() => openButtonRef.current?.focus()); }
  function badge(step: string) {
    const normalized = step.toUpperCase();
    const config = steps[normalized];
    const Icon = normalized === 'COMPLETED' || normalized === 'DIARIZED' ? Check : normalized === 'ERROR' ? AlertCircle : normalized === 'PENDING' || normalized === 'STARTED' ? Mic : Loader2;
    return <span className={'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ' + (config?.color || 'text-zinc-300 bg-zinc-800')}><Icon className="h-3.5 w-3.5" />{config ? t(config.label) : step}</span>;
  }

  function status(video: DiarizationVideo) {
    const measurable = ['ALIGNMENT', 'DIARIZATION'].includes(video.step.toUpperCase());
    const percent = measurable && typeof video.progress_percent === 'number' && Number.isFinite(video.progress_percent)
      ? Math.max(0, Math.min(100, Math.floor(video.progress_percent))) : null;
    return <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-2">{badge(video.step)}{percent !== null && <span className="text-xs tabular-nums text-zinc-300">{percent}%</span>}</div>
      {percent !== null && <div role="progressbar" aria-label={t('diarizationStageProgress') + ': ' + t(steps[video.step.toUpperCase()].label)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 w-32 max-w-full overflow-hidden rounded-full bg-zinc-800"><div className={'h-full rounded-full transition-[width] motion-reduce:transition-none ' + (video.step.toUpperCase() === 'ALIGNMENT' ? 'bg-blue-400' : 'bg-purple-400')} style={{ width: `${percent}%` }} /></div>}
    </div>;
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden bg-zinc-950">
      <section aria-label={t('diarizationAppTitle')} className={'flex min-h-0 min-w-0 flex-col ' + (selectedVideo ? 'hidden lg:flex lg:w-80 lg:shrink-0 lg:border-r lg:border-zinc-800 xl:w-96' : 'w-full')}>
        <header className="shrink-0 border-b border-zinc-800 bg-zinc-900/30 p-4 lg:p-6">
          <div className="flex items-start justify-between gap-3">
            <div><h1 className="flex items-center gap-2 text-xl font-semibold text-zinc-100"><Mic className="h-5 w-5 text-indigo-400" />{t('diarizationAppTitle')}</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">{t('diarizationLibraryDesc')}</p></div>
            <button aria-label={t('diarizationRetry')} title={t('diarizationRetry')} onClick={() => setRefresh(value => value + 1)} disabled={isFetching} className={button + ' shrink-0'}><RefreshCw className={'h-4 w-4 ' + (isLoading ? 'animate-spin' : '')} /></button>
          </div>
          <div className={'mt-5 flex gap-3 ' + (selectedVideo ? 'flex-col' : 'flex-col xl:flex-row xl:items-center')}>
            <label className="relative min-w-0 flex-1"><span className="sr-only">{t('searchDiarizationsPlaceholder')}</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400" /><input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder={t('searchDiarizationsPlaceholder')} className="min-h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 pl-9 pr-3 text-sm text-zinc-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30" /></label>
            <div role="group" aria-label={t('diarizationStatus')} className="flex flex-wrap gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">{filters.map(filter => <button key={filter.value} aria-pressed={stepFilter === filter.value} onClick={() => setStepFilter(filter.value)} className={'min-h-10 flex-1 rounded-lg px-3 text-xs font-medium transition-colors ' + (stepFilter === filter.value ? 'bg-indigo-500/15 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200')}>{t(filter.label)}</button>)}</div>
          </div>
        </header>
        <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto" aria-busy={isLoading || isLoadingMore}>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-zinc-400 lg:px-6"><span role="status">{videos.length} / {totalItems} {t('diarizationResults')} · {t('diarizationLatest')}</span><span className={selectedVideo ? 'hidden' : 'inline-flex items-center gap-1.5'}><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{t('diarizationAutoUpdate')}</span></div>
          {notice && <div role="status" className="mx-4 mb-3 flex items-start gap-2 rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-300"><p className="flex-1">{notice}</p><button aria-label={t('diarizationCancel')} onClick={() => setNotice('')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded hover:bg-zinc-800"><X className="h-4 w-4" /></button></div>}
          {loadError && <div role="alert" className="mx-4 mb-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400"><div className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{t('loadDiarizationsError')}</div><button onClick={retry} disabled={isFetching} className={button + ' mt-3'}>{t('diarizationRetry')}</button></div>}
          {isLoading ? <div role="status" className="flex items-center justify-center gap-2 p-12 text-sm text-zinc-400"><Loader2 className="h-5 w-5 animate-spin" />{t('diarizationLoading')}</div> : !videos.length && !loadError ? <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center"><FileText className="mb-4 h-10 w-10 text-zinc-500" /><h2 className="text-lg font-medium text-zinc-200">{t('noDiarizationsFound')}</h2><p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">{t('diarizationEmptyHint')}</p>{(searchQuery || stepFilter !== 'COMPLETED') && <button onClick={clearFilters} className={button + ' mt-5'}>{t('diarizationClearFilters')}</button>}</div> : <div className="w-full space-y-2 px-4 pb-4 lg:px-6">
            {!selectedVideo && <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_160px_180px] gap-4 px-4 py-2 text-xs font-medium text-zinc-400 md:grid"><span>{t('diarizationContent')}</span><span>{t('diarizationStatus')}</span><span /></div>}
            {videos.map(video => {
              const completed = video.step.toUpperCase() === 'COMPLETED';
              return <article key={video.id} className={'rounded-xl border p-3 transition-colors ' + (selectedVideo?.id === video.id ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-700')}>
                <div className={selectedVideo ? 'flex flex-col gap-3' : 'grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_180px] md:items-center md:gap-4'}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-800"><FileText className="h-5 w-5 text-zinc-400" />{video.thumbnail && <img src={video.thumbnail} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} className="absolute inset-0 h-full w-full object-cover" />}<span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 font-mono text-[11px] text-white">{durationLabel(video.duration)}</span></div>
                    <div className="min-w-0 flex-1"><h2 className="line-clamp-2 break-words text-sm font-medium leading-5 text-zinc-200">{completed ? <button aria-current={selectedVideo?.id === video.id ? 'true' : undefined} onClick={event => { openButtonRef.current = event.currentTarget; setSelectedVideo(video); }} className="min-h-10 text-left hover:text-indigo-400">{video.title}</button> : video.title}</h2><p className="mt-1 truncate text-xs text-zinc-400">{video.channelName}</p></div>
                  </div>
                  {status(video)}
                  {completed ? <button onClick={event => { openButtonRef.current = event.currentTarget; setSelectedVideo(video); }} className={button + ' justify-self-start'}><FileText className="h-4 w-4" />{t('diarizationOpen')}</button> : <button onClick={() => void reprocess(video)} disabled={reprocessingIds.has(video.id)} className={button + ' justify-self-start'}><RefreshCw className={'h-4 w-4 ' + (reprocessingIds.has(video.id) ? 'animate-spin' : '')} />{t(reprocessingIds.has(video.id) ? 'reprocessingDiarization' : 'btnReprocessDiarization')}</button>}
                </div>
              </article>;
            })}
            {!!videos.length && <div ref={sentinelRef} className="flex min-h-16 shrink-0 items-center justify-center py-4">
              {isLoadingMore ? <span role="status" className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />{t('diarizationLoadingMore')}</span> :
                loadError ? <button onClick={retry} disabled={isFetching} className={button}>{t('diarizationRetry')}</button> :
                  hasMore ? <button onClick={loadMore} disabled={isFetching} className={button}>{t('diarizationLoadMore')}</button> :
                    <span role="status" className="text-xs text-zinc-400">{t('diarizationEnd')}</span>}
            </div>}
          </div>}
        </div>
      </section>
      {selectedVideo && <DiarizationViewer key={selectedVideo.id} video={selectedVideo} language={language} onClose={closeViewer} />}
    </div>
  );
};
