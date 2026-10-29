import React, { useEffect, useRef, useState } from 'react';
import { API_BASE_URL, apiFetch } from '../../../api';
import type { LanguageMode, VoicePerson, VoiceSample, VoiceJob, VoiceIdentities } from '../../../types';
import type { TranslationKeys } from '../../../locales/pt';
import { getTranslation } from '../../../locales';

interface Props {
  taskId: string; language: LanguageMode;
  selection: { start: number; end: number; speaker: string } | null;
  captionSegments?: readonly { start: number; end: number; text?: string }[];
  onNames: (names: Record<string, string>) => void;
}
const control = 'rounded border border-zinc-600 bg-zinc-900 p-2 text-sm disabled:opacity-40';
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await apiFetch(`${API_BASE_URL}/api${path}`, {
    method, headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export function VoiceTraining({ taskId, language, selection, onNames, captionSegments = [] }: Readonly<Props>) {
  const { t } = getTranslation(language);
  const player = useRef<HTMLVideoElement>(null);
  const previewing = useRef(false);
  const submitting = useRef(false);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [people, setPeople] = useState<VoicePerson[]>([]);
  const [person, setPerson] = useState('');
  const [name, setName] = useState('');
  const [samples, setSamples] = useState<VoiceSample[]>([]);
  const [jobs, setJobs] = useState<VoiceJob[]>([]);
  const [identities, setIdentities] = useState<VoiceIdentities>({ assignments: {}, job: null });
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!selection) return;
    setStart(selection.start); setEnd(selection.end);
    previewing.current = false;
    if (player.current) { player.current.pause(); player.current.currentTime = selection.start; }
  }, [selection]);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const [nextPeople, nextSamples, nextJobs, nextIdentities] = await Promise.all([
          request<VoicePerson[]>('/voices/people'), request<VoiceSample[]>('/voices/samples'),
          request<VoiceJob[]>('/voices/jobs'), request<VoiceIdentities>(`/diarization/${taskId}/identities`),
        ]);
        if (cancelled) return;
        setPeople(nextPeople); setSamples(nextSamples); setJobs(nextJobs); setIdentities(nextIdentities);
        onNames(confirmedNames(nextIdentities));
      } catch (reason) { if (!cancelled) setError(String(reason)); }
    }
    void refresh(); const timer = window.setInterval(() => void refresh(), 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [taskId, onNames]);

  async function action(work: () => Promise<void>) {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try { await work(); } catch (reason) { setError(String(reason)); }
    finally { submitting.current = false; setBusy(false); }
  }
  async function createPerson() {
    await action(async () => {
      const created = await request<VoicePerson>('/voices/people', 'POST', { name });
      setPeople(previous => [...previous, created]); setPerson(created.id); setName('');
    });
  }
  async function renamePerson() {
    await action(async () => {
      const updated = await request<VoicePerson>(`/voices/people/${person}`, 'PATCH', { name });
      setPeople(previous => previous.map(p => p.id === updated.id ? updated : p)); setName('');
    });
  }
  async function trainSelection() {
    await action(async () => {
      const job = await request<VoiceJob>('/voices/training', 'POST', { person_id: person, task_id: taskId, start, end, speaker: selection?.speaker });
      setJobs(previous => [job, ...previous.filter(item => item.id !== job.id)]);
    });
  }
  async function identifySpeakers() {
    await action(async () => {
      const job = await request<VoiceJob>(`/diarization/${taskId}/identify`, 'POST');
      setIdentities(previous => ({ ...previous, job }));
    });
  }
  async function removeSample(id: string) {
    await action(async () => {
      await request(`/voices/samples/${id}`, 'DELETE');
      setSamples(previous => previous.filter(item => item.id !== id));
    });
  }
  async function retryJob(id: string) {
    await action(async () => {
      const updated = await request<VoiceJob>(`/voices/jobs/${id}/retry`, 'POST');
      setJobs(previous => previous.map(item => item.id === updated.id ? updated : item));
    });
  }
  async function saveAssignment(speaker: string, personId: string | null) {
    await action(async () => {
      await request(`/diarization/${taskId}/identities/${encodeURIComponent(speaker)}`, 'PUT', { person_id: personId });
      const updated = await request<VoiceIdentities>(`/diarization/${taskId}/identities`);
      setIdentities(updated); onNames(confirmedNames(updated));
    });
  }
  const captions = captionSource(captionSegments);
  const valid = Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start && (duration === null || end <= duration);
  const candidates = identities.job?.state === 'COMPLETED' ? identities.job.result.candidates || {} : {};
  const speakers = [...new Set([...Object.keys(candidates), ...Object.keys(identities.assignments)])];
  return <section aria-label={t('voicesTitle')} className="space-y-3 border-b border-zinc-700 p-4 text-zinc-200">
    <h3 className="font-semibold">{t('voicesTitle')}</h3>
    <video ref={player} controls crossOrigin="anonymous" preload="metadata" className="max-h-80 w-full bg-black"
      src={`${API_BASE_URL}/api/diarization/${taskId}/media`}
      onLoadedMetadata={() => { if (player.current && Number.isFinite(player.current.duration)) setDuration(player.current.duration); }}
      onError={() => setUnavailable(true)}
      onTimeUpdate={() => { if (previewing.current && player.current && player.current.currentTime >= end) { player.current.pause(); previewing.current = false; } }} >
      <track kind="captions" srcLang={language} label={t('voiceCaptions')} src={captions} default />
    </video>
    {unavailable && <output aria-live="polite">{t('voiceUnavailable')}</output>}
    <p className="text-sm text-zinc-400">{t('voiceHint')}</p>
    <div className="flex flex-wrap gap-2">
      <label>{t('voiceStart')} <input className={control} type="number" min="0" step="0.001" value={start} onChange={event => { previewing.current = false; setStart(Number(event.target.value)); }} /></label>
      <label>{t('voiceEnd')} <input className={control} type="number" min="0" step="0.001" value={end} onChange={event => { previewing.current = false; setEnd(Number(event.target.value)); }} /></label>
      <button className={control} onClick={() => setStart(player.current?.currentTime || 0)}>{t('voiceMarkStart')}</button>
      <button className={control} onClick={() => setEnd(player.current?.currentTime || 0)}>{t('voiceMarkEnd')}</button>
      <button className={control} disabled={!valid || unavailable} onClick={() => {
        if (player.current) { player.current.currentTime = start; previewing.current = true; void player.current.play().catch(reason => setError(String(reason))); }
      }}>{t('voicePreview')}</button>
    </div>
    <div className="flex flex-wrap gap-2">
      <select className={control} aria-label={t('voicePerson')} value={person} onChange={event => setPerson(event.target.value)}>
        <option value="">{t('voicePerson')}</option>{people.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id.slice(0, 8)})</option>)}
      </select>
      <input className={control} aria-label={t('voiceNewPerson')} placeholder={t('voiceNewPerson')} value={name} onChange={event => setName(event.target.value)} />
      <button className={control} disabled={busy || !name.trim()} onClick={() => void createPerson()}>{t('voiceCreate')}</button>
      <button className={control} disabled={busy || !person || !name.trim()} onClick={() => void renamePerson()}>{t('voiceRename')}</button>
      <button className={control} disabled={busy || !valid || !person} onClick={() => void trainSelection()}>{t('voiceTrain')}</button>
      <button className={control} disabled={busy || Boolean(identities.job && ['PENDING', 'ANALYZING', 'EXTRACTING'].includes(identities.job.state))} onClick={() => void identifySpeakers()}>{t('voiceIdentify')}</button>
    </div>
    {error && <p role="alert" className="text-red-400">{error}</p>}
    <details><summary>{t('voicesTitle')} ({samples.length})</summary>
      {samples.map(sample => <div key={sample.id} className="my-3 space-y-2">
        <p>{people.find(p => p.id === sample.person_id)?.name} · {sample.start}–{sample.end}</p>
        <video controls preload="none" className="max-h-48" src={`${API_BASE_URL}/api/voices/samples/${sample.id}/video`} crossOrigin="anonymous">
          <track kind="captions" srcLang={language} label={t('voiceCaptions')} src={`${API_BASE_URL}/api/voices/samples/${sample.id}/captions`} default />
        </video>
        <audio controls preload="none" src={`${API_BASE_URL}/api/voices/samples/${sample.id}/audio`} crossOrigin="anonymous">
          <track kind="captions" srcLang={language} label={t('voiceCaptions')} src={`${API_BASE_URL}/api/voices/samples/${sample.id}/captions`} default />
        </audio>
        <button className={control} disabled={busy} onClick={() => void removeSample(sample.id)}>{t('voiceDelete')}</button>
      </div>)}
    </details>
    <div aria-live="polite">{jobs.filter(job => job.task_id === taskId).map(job => <div key={job.id} className="text-sm">
      {t(('voice' + job.state) as TranslationKeys)} · {job.payload.start}–{job.payload.end} {job.error}
      {job.state === 'ERROR' && <button className={control} disabled={busy} onClick={() => void retryJob(job.id)}>{t('voiceRetry')}</button>}
    </div>)}</div>
    {speakers.map(speaker => <div key={speaker} className="space-y-2 border-t border-zinc-700 pt-2">
      <p>{speaker} · {identities.assignments[speaker]?.name}</p>
      {!candidates[speaker]?.length && <p>{t('voiceNoCandidates')}</p>}
      {candidates[speaker]?.map(candidate => <p key={candidate.person_id}>{people.find(p => p.id === candidate.person_id)?.name} · {t('voiceSimilarity')}: {candidate.similarity.toFixed(3)}</p>)}
      <select className={control} aria-label={`${t('voicePerson')} ${speaker}`} value={choices[speaker] || ''} onChange={event => setChoices(previous => ({ ...previous, [speaker]: event.target.value }))}>
        <option value="">{t('voicePerson')}</option>{people.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id.slice(0, 8)})</option>)}
      </select>
      <button className={control} disabled={busy || !choices[speaker]} onClick={() => void saveAssignment(speaker, choices[speaker])}>{t('voiceConfirm')}</button>
      <button className={control} disabled={busy} onClick={() => void saveAssignment(speaker, null)}>{t('voiceReject')}</button>
    </div>)}
  </section>;
}


function confirmedNames(identities: VoiceIdentities): Record<string, string> {
  const names: Record<string, string> = {};
  for (const [speaker, identity] of Object.entries(identities.assignments)) {
    if (identity.name) names[speaker] = identity.name;
  }
  return names;
}


function captionTime(seconds: number): string {
  const milliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor(milliseconds / 60000) % 60;
  const wholeSeconds = Math.floor(milliseconds / 1000) % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(milliseconds % 1000).padStart(3, '0')}`;
}

function captionSource(segments: readonly { start: number; end: number; text?: string }[]): string {
  const cues = ['WEBVTT', ''];
  for (const segment of segments) {
    if (!Number.isFinite(segment.start) || !Number.isFinite(segment.end) || segment.end <= segment.start) continue;
    const text = (segment.text || '').replaceAll('-->', '→').trim();
    if (text) cues.push(`${captionTime(segment.start)} --> ${captionTime(segment.end)}`, text, '');
  }
  return `data:text/vtt;charset=utf-8,${encodeURIComponent(cues.join('\n') + '\n')}`;
}
