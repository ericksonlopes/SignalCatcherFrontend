import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  Edit3,
  FileText,
  Fingerprint,
  Loader2,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { API_BASE_URL, apiFetch } from '../../../api';
import type { DiarizationVideo } from '../DiarizationApp';
import type { IdentifyDiarizationResponse, LanguageMode, SpeakerMatch, SpeakerProfile } from '../../../types';
import { getTranslation } from '../../../locales';
import { buildTranscript, formatTime, speakerStats, type TranscriptResult } from './transcript';

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
  const [liveResultJson, setLiveResultJson] = useState<TranscriptResult | null | undefined>(video.result_json);
  useEffect(() => {
    setLiveResultJson(video.result_json);
  }, [video.result_json, video.id]);

  const segments = useMemo(() => buildTranscript(liveResultJson), [liveResultJson]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [speakerFilter, setSpeakerFilter] = useState('');
  const [showSpeakers, setShowSpeakers] = useState(() => window.matchMedia('(min-width: 1280px)').matches);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [enrollOnSave, setEnrollOnSave] = useState(true);
  const [existingProfiles, setExistingProfiles] = useState<SpeakerProfile[]>([]);
  const [speakerMatches, setSpeakerMatches] = useState<Record<string, SpeakerMatch>>({});
  const [isVectorizing, setIsVectorizing] = useState(false);
  const [isVectorized, setIsVectorized] = useState<boolean | null>(null);
  const [chunksCount, setChunksCount] = useState<number | null>(null);

  useEffect(() => {
    apiFetch(`${API_BASE_URL}/api/voice-recognition/profiles`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) setExistingProfiles(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    apiFetch(`${API_BASE_URL}/api/vectorization/status/${video.id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!active || !data) return;
        setIsVectorized(Boolean(data.indexed));
        if (typeof data.chunks_count === 'number') {
          setChunksCount(data.chunks_count);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [video.id]);
  const [isSavingSpeaker, setIsSavingSpeaker] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [notice, setNotice] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const speakers = useMemo(() => {
    const ids = [
      ...new Set([
        ...(Array.isArray(liveResultJson?.speakers) ? liveResultJson.speakers : []),
        ...segments.map(segment => segment.speakerId),
      ]),
    ];
    return ids.map((id, index) => {
      let defaultLabel = id;
      if (id.startsWith('SPEAKER_')) {
        defaultLabel = t('speakerLabel') + ' ' + (index + 1);
      } else if (id === 'UNKNOWN') {
        defaultLabel = t('speakerUnknown');
      }
      return {
        id,
        name: names[id] || defaultLabel,
        color: colors[index % colors.length],
        ...speakerStats(segments, id),
      };
    });
  }, [liveResultJson, segments, names, language, t]);

  const totalSpeech = speakers.reduce((sum, speaker) => sum + speaker.seconds, 0);
  const visible = segments.filter(
    segment =>
      (!speakerFilter || segment.speakerId === speakerFilter) &&
      segment.text.toLocaleLowerCase(language).includes(query.trim().toLocaleLowerCase(language)),
  );
  const endTime = segments.reduce((max, segment) => Math.max(max, segment.end), 0);

  function toggleSegment(id: string) {
    setExpanded(previous => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function saveName() {
    if (!editing || !editName.trim()) {
      setEditing(null);
      return;
    }
    const targetSpeaker = editing;
    const newName = editName.trim();
    setNames(previous => ({ ...previous, [targetSpeaker]: newName }));
    setIsSavingSpeaker(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/voice-recognition/diarization/${video.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speaker_label: targetSpeaker,
          speaker_name: newName,
          enroll_voice: enrollOnSave,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.result_json) {
          setLiveResultJson(data.result_json);
        }
        setNotice(`${newName} (${enrollOnSave ? t('voiceEnrolledNotice') : 'salvo'})`);
        if (enrollOnSave) {
          apiFetch(`${API_BASE_URL}/api/voice-recognition/profiles`)
            .then(res => res.ok ? res.json() : [])
            .then(profiles => {
              if (Array.isArray(profiles)) setExistingProfiles(profiles);
            })
            .catch(() => {});
        }
      }
    } catch {
      // Keep local name override if backend is offline
    } finally {
      setIsSavingSpeaker(false);
      setEditing(null);
    }
  }

  async function vectorizeTranscript() {
    if (isVectorizing) return;
    setIsVectorizing(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/vectorization/diarization/${video.id}?overwrite=true`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        setIsVectorized(true);
        if (typeof data.chunks_count === 'number') {
          setChunksCount(data.chunks_count);
        }
        setNotice(`${t('vectorizedSuccess')} (${data.chunks_count ?? ''} chunks)`);
      }
    } catch {
      // Ignore network errors silently
    } finally {
      setIsVectorizing(false);
    }
  }

  async function identifyVoices() {
    if (isIdentifying) return;
    setIsIdentifying(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/voice-recognition/diarization/${video.id}/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ similarity_threshold: 0.65, auto_apply: true }),
      });
      if (response.ok) {
        const data: IdentifyDiarizationResponse = await response.json();
        const newNames: Record<string, string> = {};
        const matchMap: Record<string, SpeakerMatch> = {};
        for (const match of data.matches) {
          matchMap[match.original_speaker_label] = match;
          matchMap[match.current_speaker_label] = match;
          if (match.identified && match.matched_speaker_name) {
            newNames[match.original_speaker_label] = match.matched_speaker_name;
            newNames[match.current_speaker_label] = match.matched_speaker_name;
          }
        }
        setSpeakerMatches(prev => ({ ...prev, ...matchMap }));
        if (Object.keys(newNames).length > 0) {
          setNames(prev => ({ ...prev, ...newNames }));
        }
        setNotice(`${t('voiceIdentifySuccess')}: ${data.identified_count}/${data.total_speakers}`);
      }
    } catch {
      // Ignore network errors silently in viewer
    } finally {
      setIsIdentifying(false);
    }
  }

  function handleEditKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      void saveName();
    } else if (event.key === 'Escape') {
      setEditing(null);
    }
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

  function clearFilters() {
    setQuery('');
    setSpeakerFilter('');
  }

  return (
    <section aria-label={t('diarizationTranscript')} className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-zinc-950">
      <header className="shrink-0 border-b border-zinc-800 bg-zinc-900/30 px-4 py-3 lg:px-6">
        <div className="flex items-start gap-3">
          <button onClick={onClose} aria-label={t('diarizationBack')} title={t('diarizationBack')} className="flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"><ArrowLeft className="h-4 w-4" /><span className="hidden xl:inline">{t('diarizationBack')}</span></button>
          <div className="min-w-0 flex-1">
            <h2 ref={headingRef} tabIndex={-1} title={video.title} className="line-clamp-2 text-base font-semibold leading-snug text-zinc-100 outline-none lg:text-lg">{video.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
              <span>{video.channelName}</span><span className="inline-flex items-center gap-1 text-emerald-400"><Check className="h-3.5 w-3.5" />{t('diarizationCompletedStatus')}</span>
              <span className="font-mono">{formatTime(endTime)}</span><span>{speakers.length} {t('speakersTitle').toLocaleLowerCase(language)}</span><span>{segments.length} {t('diarizationTurns')}</span>
            </div>
          </div>
          <button
            onClick={() => void identifyVoices()}
            disabled={!segments.length || isIdentifying || isVectorizing}
            aria-label={t('voiceIdentifyBtn')}
            title={t('voiceIdentifyBtn')}
            className={'flex shrink-0 items-center gap-2 border-indigo-500/40 bg-indigo-950/30 text-indigo-300 hover:bg-indigo-900/40 ' + control}
          >
            {isIdentifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
            <span className="hidden sm:inline">{isIdentifying ? t('voiceIdentifying') : t('voiceIdentifyBtn')}</span>
          </button>
          <button
            onClick={() => void vectorizeTranscript()}
            disabled={!segments.length || isVectorizing || isIdentifying}
            aria-label={t('vectorizeButton')}
            title={language === 'pt' ? 'Gera embeddings vetoriais no pgvector para busca' : 'Generate vector embeddings in pgvector for search'}
            className={`flex shrink-0 items-center gap-2 ${
              isVectorized
                ? 'border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40'
                : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white'
            } ${control}`}
          >
            {isVectorizing ? (
              <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
            ) : (
              <Sparkles className={`h-4 w-4 ${isVectorized ? 'text-cyan-400' : 'text-zinc-400'}`} />
            )}
            <span className="hidden sm:inline">
              {isVectorizing
                ? t('vectorizing')
                : isVectorized
                ? `${t('vectorizedBadge')} (${chunksCount ?? ''})`
                : t('vectorizeButton')}
            </span>
          </button>
          <button onClick={exportTranscript} aria-label={t('diarizationExport')} title={t('diarizationExport')} disabled={!segments.length} className={'flex shrink-0 items-center gap-2 ' + control}><Download className="h-4 w-4" /><span className="hidden sm:inline">{t('diarizationExport')}</span></button>
        </div>
        <output className="sr-only">{notice}</output>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800 px-4 py-2 lg:px-6">
          <h3 className="sr-only lg:not-sr-only lg:flex lg:shrink-0 lg:items-center lg:gap-2 lg:text-sm lg:font-semibold lg:text-zinc-200"><FileText className="h-4 w-4 text-indigo-400" />{t('diarizationTranscript')}</h3>
          <div className="flex min-w-0 flex-[1_1_320px] gap-2">
            <label className="relative min-w-0 flex-1"><span className="sr-only">{t('diarizationSearchText')}</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('diarizationSearchText')} className={input + ' pl-9 pr-3'} /></label>
            <select aria-label={t('speakersTitle')} value={speakerFilter} onChange={event => setSpeakerFilter(event.target.value)} className={input.replace('w-full', 'w-28 sm:w-40') + ' shrink-0 px-3'}><option value="">{t('diarizationAllSpeakers')}</option>{speakers.map(speaker => <option key={speaker.id} value={speaker.id}>{speaker.name}</option>)}</select>
          </div>
          <button aria-expanded={showSpeakers} aria-controls="diarization-speakers" onClick={() => setShowSpeakers(!showSpeakers)} className={'flex shrink-0 items-center gap-2 ' + control}><Users className="h-4 w-4" />{t(showSpeakers ? 'diarizationHideSpeakers' : 'diarizationShowSpeakers')}</button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto xl:flex-row xl:overflow-hidden">
          {showSpeakers && <aside id="diarization-speakers" aria-label={t('speakersTitle')} className="order-first shrink-0 border-b border-zinc-800 bg-zinc-900/30 p-4 xl:order-last xl:w-72 xl:overflow-y-auto xl:border-b-0 xl:border-l 2xl:w-80">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-zinc-200">{t('speakersTitle')} <span className="ml-1 text-zinc-400 font-mono text-xs">({speakers.length})</span></h3>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{t('diarizationSpeakerHint')}</p>

            {/* Quick Biometric Identification trigger */}
            <button
              type="button"
              onClick={() => void identifyVoices()}
              disabled={!segments.length || isIdentifying || isVectorizing}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 text-xs font-medium transition disabled:opacity-50"
            >
              {isIdentifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Fingerprint className="h-3.5 w-3.5 text-indigo-400" />}
              <span>{isIdentifying ? t('voiceIdentifying') : t('voiceIdentifyBtn')}</span>
            </button>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">{speakers.map(speaker => {
              const share = totalSpeech ? Math.round(speaker.seconds / totalSpeech * 100) : 0;
              const match = speakerMatches[speaker.id] || speakerMatches[speaker.name];
              const isMatchIdentified = Boolean(match?.identified);

              return <div key={speaker.id} className={'rounded-xl border p-3 ' + (speakerFilter === speaker.id ? 'border-indigo-500/60 bg-indigo-500/5' : 'border-zinc-800 bg-zinc-950')}>
                <div className="flex items-center gap-2">
                  <span className={'h-2.5 w-2.5 shrink-0 rounded-full ' + speaker.color} />
                  <button aria-pressed={speakerFilter === speaker.id} onClick={() => setSpeakerFilter(speakerFilter === speaker.id ? '' : speaker.id)} className="min-h-10 min-w-0 flex-1 break-words text-left text-sm font-medium text-zinc-200">{speaker.name}</button>
                  <button aria-label={t('diarizationRename') + ': ' + speaker.name} onClick={() => { setEditing(speaker.id); setEditName(speaker.name); }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"><Edit3 className="h-4 w-4" /></button>
                </div>

                {/* Biometric Voice Match Badge */}
                {isMatchIdentified && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md font-mono">
                    <Fingerprint className="h-3 w-3 shrink-0 text-emerald-400" />
                    <span className="truncate">
                      {match?.matched_speaker_name} ({Math.round((match?.similarity_score ?? 0) * 100)}% {t('voiceMatchPercent')})
                    </span>
                  </div>
                )}

                {/* Inline Editing & Voice Profile Assignment */}
                {editing === speaker.id && <div className="my-2 space-y-2 p-2.5 rounded-lg bg-zinc-900 border border-zinc-700/60 text-xs">
                  <div className="flex flex-wrap gap-1">
                    <input aria-label={t('diarizationRename')} value={editName} onChange={event => setEditName(event.target.value)} onKeyDown={handleEditKeyDown} placeholder="Nome do locutor" className={input + ' px-2 text-xs'} />
                    <button aria-label={t('diarizationSave')} onClick={() => void saveName()} disabled={!editName.trim() || isSavingSpeaker} className={control}>{isSavingSpeaker ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</button>
                    <button aria-label={t('diarizationCancel')} onClick={() => setEditing(null)} className={control}><X className="h-4 w-4" /></button>
                  </div>

                  {/* Dropdown with existing enrolled profiles */}
                  {existingProfiles.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] text-zinc-400">{t('voiceSelectExistingProfile')}:</label>
                      <select
                        onChange={e => {
                          if (e.target.value) {
                            setEditName(e.target.value);
                            setEnrollOnSave(false);
                          }
                        }}
                        defaultValue=""
                        className="w-full text-xs rounded-lg border border-zinc-700 bg-zinc-950 py-1.5 px-2 text-zinc-300 outline-none"
                      >
                        <option value="" disabled>{t('voiceSelectExistingProfile')}...</option>
                        {existingProfiles.map(p => (
                          <option key={p.id} value={p.name}>
                            {p.name} ({p.samples_count} {p.samples_count === 1 ? 'amostra' : 'amostras'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-[11px] text-zinc-400 cursor-pointer pt-1">
                    <input type="checkbox" checked={enrollOnSave} onChange={e => setEnrollOnSave(e.target.checked)} className="rounded border-zinc-700 bg-zinc-900 text-indigo-500" />
                    <span>{t('voiceEnrollOnSave')}</span>
                  </label>
                </div>}

                <div className="mt-2 flex justify-between gap-2 text-xs text-zinc-400"><span>{t('diarizationSpeechTime')}</span><span className="font-mono">{formatTime(speaker.seconds)} · {share}%</span></div>
                <div className="my-1.5 h-1 overflow-hidden rounded-full bg-zinc-800"><div className={'h-full rounded-full ' + speaker.color} style={{ width: share + '%' }} /></div>
                <p className="text-[11px] text-zinc-500 font-mono">{speaker.turns} {t('diarizationTurns')} · {speaker.id}</p>
              </div>;
            })}</div>
          </aside>}
          <div className="min-w-0 flex-1 xl:overflow-y-auto"><div className="mx-auto max-w-4xl p-4 lg:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400"><output>{visible.length} / {segments.length} {t('diarizationVisibleTurns')}</output>{(query || speakerFilter) && <button onClick={clearFilters} className="min-h-10 rounded-lg px-2 text-indigo-400 hover:bg-zinc-900">{t('diarizationClearFilters')}</button>}</div>
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
