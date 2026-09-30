import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Download, Edit3, FileText, Search, Users, X } from 'lucide-react';
import type { DiarizationVideo } from '../DiarizationApp';
import type { LanguageMode } from '../../../types';
import { getTranslation } from '../../../locales';
import { buildTranscript, formatTime, speakerStats } from './transcript';

interface DiarizationViewerProps {
  video: DiarizationVideo;
  language?: LanguageMode;
  onClose?: () => void;
}
const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-purple-500', 'bg-blue-500'];
const control = 'min-h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-40';
const input = 'min-h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30';

export const DiarizationViewer: React.FC<DiarizationViewerProps> = ({ video, language = 'en', onClose }) => {
  const { t } = getTranslation(language);
  const segments = useMemo(() => buildTranscript(video.result_json), [video.result_json]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [speakerFilter, setSpeakerFilter] = useState('');
  const [showSpeakers, setShowSpeakers] = useState(() => window.matchMedia('(min-width: 1280px)').matches);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [notice, setNotice] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  const speakers = useMemo(() => {
    const ids = [...new Set([...(Array.isArray(video.result_json?.speakers) ? video.result_json.speakers : []), ...segments.map(segment => segment.speakerId)])];
    return ids.map((id, index) => ({
      id, name: names[id] || (id === 'UNKNOWN' ? t('speakerUnknown') : t('speakerLabel') + ' ' + (index + 1)),
      color: colors[index % colors.length], ...speakerStats(segments, id),
    }));
  }, [video.result_json, segments, names, language]);
  const totalSpeech = speakers.reduce((sum, speaker) => sum + speaker.seconds, 0);
  const visible = segments.filter(segment => (!speakerFilter || segment.speakerId === speakerFilter) && segment.text.toLocaleLowerCase(language).includes(query.trim().toLocaleLowerCase(language)));
  const endTime = segments.reduce((max, segment) => Math.max(max, segment.end), 0);

  function toggleSegment(id: string) {
    setExpanded(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function saveName() {
    if (editing && editName.trim()) setNames(previous => ({ ...previous, [editing]: editName.trim() }));
    setEditing(null);
  }
  function exportTranscript() {
    const text = [video.title, video.channelName, '', ...segments.map(segment => {
      const speaker = speakers.find(item => item.id === segment.speakerId);
      return '[' + formatTime(segment.start) + ' – ' + formatTime(segment.end) + '] ' + (speaker?.name || segment.speakerId) + '\n' + segment.text + '\n';
    })].join('\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = (video.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 100) || 'transcript') + '.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(t('diarizationExported'));
  }
  function clearFilters() { setQuery(''); setSpeakerFilter(''); }

  return (
    <section aria-label={t('diarizationTranscript')} className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-zinc-950">
      <header className="shrink-0 border-b border-zinc-800 bg-zinc-900/30 p-4 lg:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <button onClick={onClose} className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"><ArrowLeft className="h-4 w-4" />{t('diarizationBack')}</button>
          <button onClick={exportTranscript} disabled={!segments.length} className={'flex items-center gap-2 ' + control}><Download className="h-4 w-4" />{t('diarizationExport')}</button>
        </div>
        <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold leading-snug text-zinc-100 outline-none lg:text-2xl">{video.title}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-400">
          <span>{video.channelName}</span><span className="inline-flex items-center gap-1 text-emerald-400"><Check className="h-3.5 w-3.5" />{t('diarizationCompletedStatus')}</span>
          <span className="font-mono">{formatTime(endTime)}</span><span>{speakers.length} {t('speakersTitle').toLocaleLowerCase(language)}</span><span>{segments.length} {t('diarizationTurns')}</span>
        </div>
        <span className="sr-only" role="status">{notice}</span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-zinc-800 p-4">
          <h3 className="mr-auto flex items-center gap-2 font-semibold text-zinc-200"><FileText className="h-4 w-4 text-indigo-400" />{t('diarizationTranscript')}</h3>
          <button aria-expanded={showSpeakers} aria-controls="diarization-speakers" onClick={() => setShowSpeakers(!showSpeakers)} className={'flex items-center gap-2 ' + control}><Users className="h-4 w-4" />{t(showSpeakers ? 'diarizationHideSpeakers' : 'diarizationShowSpeakers')}</button>
          <div className="flex w-full flex-wrap gap-2">
            <label className="relative min-w-40 flex-1"><span className="sr-only">{t('diarizationSearchText')}</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('diarizationSearchText')} className={input + ' pl-9 pr-3'} /></label>
            <select aria-label={t('speakersTitle')} value={speakerFilter} onChange={event => setSpeakerFilter(event.target.value)} className={input + ' sm:max-w-48 px-3'}><option value="">{t('diarizationAllSpeakers')}</option>{speakers.map(speaker => <option key={speaker.id} value={speaker.id}>{speaker.name}</option>)}</select>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto xl:flex-row xl:overflow-hidden">
          {showSpeakers && <aside id="diarization-speakers" aria-label={t('speakersTitle')} className="order-first shrink-0 border-b border-zinc-800 bg-zinc-900/30 p-4 xl:order-last xl:w-64 xl:overflow-y-auto xl:border-b-0 xl:border-l 2xl:w-72">
            <h3 className="font-semibold text-zinc-200">{t('speakersTitle')} <span className="ml-1 text-zinc-400">{speakers.length}</span></h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">{t('diarizationSpeakerHint')}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">{speakers.map(speaker => {
              const share = totalSpeech ? Math.round(speaker.seconds / totalSpeech * 100) : 0;
              return <div key={speaker.id} className={'rounded-xl border p-3 ' + (speakerFilter === speaker.id ? 'border-indigo-500/60 bg-indigo-500/5' : 'border-zinc-800 bg-zinc-950')}>
                <div className="flex items-center gap-2">
                  <span className={'h-2.5 w-2.5 shrink-0 rounded-full ' + speaker.color} />
                  <button aria-pressed={speakerFilter === speaker.id} onClick={() => setSpeakerFilter(speakerFilter === speaker.id ? '' : speaker.id)} className="min-h-10 min-w-0 flex-1 break-words text-left text-sm font-medium text-zinc-200">{speaker.name}</button>
                  <button aria-label={t('diarizationRename') + ': ' + speaker.name} onClick={() => { setEditing(speaker.id); setEditName(speaker.name); }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800"><Edit3 className="h-4 w-4" /></button>
                </div>
                {editing === speaker.id && <div className="my-2 flex flex-wrap gap-1">
                  <input aria-label={t('diarizationRename')} value={editName} onChange={event => setEditName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') saveName(); if (event.key === 'Escape') setEditing(null); }} autoFocus className={input + ' px-2'} />
                  <button aria-label={t('diarizationSave')} onClick={saveName} disabled={!editName.trim()} className={control}><Check className="h-4 w-4" /></button><button aria-label={t('diarizationCancel')} onClick={() => setEditing(null)} className={control}><X className="h-4 w-4" /></button>
                </div>}
                <div className="mt-1 flex justify-between gap-2 text-xs text-zinc-400"><span>{t('diarizationSpeechTime')}</span><span className="font-mono">{formatTime(speaker.seconds)} · {share}%</span></div>
                <div className="my-2 h-1 overflow-hidden rounded-full bg-zinc-800"><div className={'h-full rounded-full ' + speaker.color} style={{ width: share + '%' }} /></div>
                <p className="text-xs text-zinc-400">{speaker.turns} {t('diarizationTurns')} · {speaker.id}</p>
              </div>;
            })}</div>
          </aside>}
          <div className="min-w-0 flex-1 xl:overflow-y-auto"><div className="mx-auto max-w-4xl p-4 lg:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400"><span role="status">{visible.length} / {segments.length} {t('diarizationVisibleTurns')}</span>{(query || speakerFilter) && <button onClick={clearFilters} className="min-h-10 rounded-lg px-2 text-indigo-400 hover:bg-zinc-900">{t('diarizationClearFilters')}</button>}</div>
            {visible.length ? <div className="space-y-3">{visible.map(segment => {
              const speaker = speakers.find(item => item.id === segment.speakerId);
              const isExpanded = expanded.has(segment.id);
              return <article key={segment.id} className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className={'h-2.5 w-2.5 rounded-full ' + (speaker?.color || 'bg-zinc-500')} /><span className="break-words text-sm font-semibold text-zinc-200">{speaker?.name || segment.speakerId}</span><span className="font-mono text-xs tabular-nums text-zinc-400">{formatTime(segment.start)} – {formatTime(segment.end)}</span>
                  {segment.phrases.length > 1 && <button aria-expanded={isExpanded} aria-controls={segment.id} onClick={() => toggleSegment(segment.id)} className="ml-auto flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs text-indigo-400 hover:bg-zinc-800"><ChevronDown className={'h-4 w-4 ' + (isExpanded ? 'rotate-180' : '')} />{t(isExpanded ? 'hidePhrases' : 'expandPhrases')}</button>}
                </div>
                <div id={segment.id}>{isExpanded ? <div className="space-y-4 border-l border-zinc-700 pl-4">{segment.phrases.map(phrase => <div key={phrase.id}><p className="mb-1 font-mono text-xs text-zinc-400">{formatTime(phrase.start)} – {formatTime(phrase.end)}</p><p className="whitespace-pre-wrap break-words text-base leading-7 text-zinc-300">{phrase.text}</p></div>)}</div> : <p className="whitespace-pre-wrap break-words text-base leading-7 text-zinc-300">{segment.text}</p>}</div>
              </article>;
            })}</div> : <div className="flex flex-col items-center py-16 text-center"><FileText className="mb-4 h-8 w-8 text-zinc-500" /><h3 className="font-medium text-zinc-200">{t('diarizationNoText')}</h3><p className="mt-2 max-w-sm text-sm text-zinc-400">{t(segments.length ? 'diarizationNoTextHint' : 'diarizationNoTranscript')}</p></div>}
          </div></div>
        </div>
      </div>
    </section>
  );
};
