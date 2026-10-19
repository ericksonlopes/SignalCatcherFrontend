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
  RotateCcw,
  Search,
  Sparkles,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { API_BASE_URL, apiFetch } from '../../../api';
import type { DiarizationVideo } from '../DiarizationApp';
import type { IdentifyDiarizationResponse, LanguageMode, SpeakerMatch, SpeakerProfile, SuggestedClip } from '../../../types';
import { getTranslation } from '../../../locales';
import { buildTranscript, formatTime, speakerStats, type TranscriptResult, type TranscriptSegment } from './transcript';
import { VoiceSuggestedClips } from '../voice/VoiceSuggestedClips';

interface DiarizationViewerProps {
  readonly video: DiarizationVideo;
  readonly language?: LanguageMode;
  readonly onClose?: () => void;
}

interface SpeakerInfo {
  id: string;
  name: string;
  color: string;
  seconds: number;
  turns: number;
}

const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-purple-500', 'bg-blue-500'];
const control = 'min-h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-40';
const input = 'min-h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30';

function extractInitialMatches(liveResultJson: TranscriptResult | null | undefined): Record<string, SpeakerMatch> {
  if (!liveResultJson || typeof liveResultJson !== 'object') {
    return {};
  }
  const rawMappings = (liveResultJson as {
    speaker_mappings?: Record<string, { original_speaker?: string; speaker_name?: string; similarity_score?: number }>;
  }).speaker_mappings;

  if (!rawMappings || typeof rawMappings !== 'object') {
    return {};
  }

  const initialMatches: Record<string, SpeakerMatch> = {};
  for (const [orig, item] of Object.entries(rawMappings)) {
    if (item?.speaker_name) {
      const matchObj: SpeakerMatch = {
        original_speaker_label: orig,
        current_speaker_label: item.speaker_name,
        matched_speaker_name: item.speaker_name,
        similarity_score: typeof item.similarity_score === 'number' ? item.similarity_score : 1.0,
        identified: true,
        applied: true,
        segments_count: 0,
        speech_duration_seconds: 0,
      };
      initialMatches[orig] = matchObj;
      initialMatches[item.speaker_name] = matchObj;
    }
  }
  return initialMatches;
}

function getVectorizeButtonText(
  isVectorizing: boolean,
  isVectorized: boolean | null,
  chunksCount: number | null,
  t: (key: any) => string
): string {
  if (isVectorizing) {
    return t('vectorizing');
  }
  if (isVectorized) {
    return `${t('vectorizedBadge')} (${chunksCount ?? ''})`;
  }
  return t('vectorizeButton');
}

function getMatchDisplayName(match: SpeakerMatch, fallbackName: string): string {
  if (match.identified) {
    return match.matched_speaker_name || fallbackName;
  }
  if (match.matched_speaker_name) {
    return `Mais próximo: ${match.matched_speaker_name}`;
  }
  return 'Não identificado';
}

interface SpeakerCardProps {
  readonly key?: React.Key;
  readonly speaker: SpeakerInfo;
  readonly totalSpeech: number;
  readonly isSelected: boolean;
  readonly match?: SpeakerMatch;
  readonly isEditing: boolean;
  readonly editName: string;
  readonly enrollOnSave: boolean;
  readonly isSavingSpeaker: boolean;
  readonly existingProfiles: SpeakerProfile[];
  readonly onToggleFilter: () => void;
  readonly onStartEdit: () => void;
  readonly onOpenSuggestedClips?: (speaker: SpeakerInfo) => void;
  readonly onEditNameChange: (val: string) => void;
  readonly onEnrollOnSaveChange: (val: boolean) => void;
  readonly onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  readonly onSave: () => void;
  readonly onCancelEdit: () => void;
  readonly t: (key: any) => string;
}

function SpeakerCard({
  speaker,
  totalSpeech,
  isSelected,
  match,
  isEditing,
  editName,
  enrollOnSave,
  isSavingSpeaker,
  existingProfiles,
  onToggleFilter,
  onStartEdit,
  onOpenSuggestedClips,
  onEditNameChange,
  onEnrollOnSaveChange,
  onKeyDown,
  onSave,
  onCancelEdit,
  t,
}: SpeakerCardProps) {
  const share = totalSpeech ? Math.round((speaker.seconds / totalSpeech) * 100) : 0;
  const isMatchIdentified = Boolean(match?.identified);
  const similarityPercent =
    typeof match?.similarity_score === 'number' ? Math.round(match.similarity_score * 100) : null;

  return (
    <div
      className={`rounded-xl border p-3 ${
        isSelected ? 'border-indigo-500/60 bg-indigo-500/5' : 'border-zinc-800 bg-zinc-950'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${speaker.color}`} />
        <button
          aria-pressed={isSelected}
          onClick={onToggleFilter}
          className="min-h-10 min-w-0 flex-1 break-words text-left text-sm font-medium text-zinc-200"
        >
          {speaker.name}
        </button>
        <button
          aria-label={`${t('diarizationRename')}: ${speaker.name}`}
          onClick={onStartEdit}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <Edit3 className="h-4 w-4" />
        </button>
      </div>

      {/* Biometric Voice Match & Similarity Score Badge */}
      {match && similarityPercent !== null && (
        <div
          className={`mt-1.5 flex items-center justify-between text-[11px] px-2 py-1 rounded-md font-mono border ${
            isMatchIdentified
              ? 'text-emerald-300 bg-emerald-950/60 border-emerald-800/40'
              : 'text-zinc-300 bg-zinc-900/80 border-zinc-700/60'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate mr-2">
            <Fingerprint
              className={`h-3.5 w-3.5 shrink-0 ${
                isMatchIdentified ? 'text-emerald-400' : 'text-zinc-500'
              }`}
            />
            <span className="truncate">{getMatchDisplayName(match, speaker.name)}</span>
          </div>
          <span
            className={`shrink-0 font-bold px-1.5 py-0.5 rounded text-[10px] ${
              isMatchIdentified ? 'bg-emerald-900/60 text-emerald-200' : 'bg-zinc-800 text-amber-300/90'
            }`}
          >
            {similarityPercent}% similaridade
          </span>
        </div>
      )}

      {/* Direct action to enroll/create a new recognized voice profile from this speaker */}
      {!isMatchIdentified && !isEditing && (
        <button
          type="button"
          onClick={onStartEdit}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/30 px-2.5 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-900/40 hover:text-indigo-200 transition"
        >
          <UserPlus className="h-3.5 w-3.5 text-indigo-400" />
          <span>{t('voiceCreateNewProfileForSpeaker')}</span>
        </button>
      )}

      {/* Action to suggest/preview training clips for this speaker */}
      {!isEditing && (
        <button
          type="button"
          onClick={() => onOpenSuggestedClips?.(speaker)}
          className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/20 px-2.5 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-900/40 hover:text-indigo-200 transition"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>{t('voiceCurationSuggestedClips')}</span>
        </button>
      )}

      {/* Inline Editing & Voice Profile Assignment */}
      {isEditing && (
        <div className="my-2 space-y-2 p-2.5 rounded-lg bg-zinc-900 border border-indigo-500/40 text-xs">
          <div className="flex items-center justify-between font-medium text-zinc-300 text-[11px]">
            <span>{enrollOnSave ? t('voiceCreateNewProfileForSpeaker') : t('diarizationRename')}</span>
            <span className="text-zinc-500 font-mono text-[10px]">{speaker.id}</span>
          </div>

          <div className="flex gap-1.5">
            <input
              aria-label={t('diarizationRename')}
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t('voiceProfileNamePlaceholder')}
              className={`${input} px-2.5 text-xs`}
            />
            <button
              aria-label={t('diarizationSave')}
              onClick={onSave}
              disabled={!editName.trim() || isSavingSpeaker}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
            >
              {isSavingSpeaker ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              <span>{enrollOnSave ? t('btnExecute') : t('diarizationSave')}</span>
            </button>
            <button
              aria-label={t('diarizationCancel')}
              onClick={onCancelEdit}
              className={`${control} px-2`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Dropdown with existing enrolled profiles */}
          {existingProfiles.length > 0 && (
            <div className="space-y-1 pt-1">
              <label className="text-[10px] text-zinc-400">{t('voiceSelectExistingProfile')}:</label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    onEditNameChange(e.target.value);
                    onEnrollOnSaveChange(false);
                  }
                }}
                defaultValue=""
                className="w-full text-xs rounded-lg border border-zinc-700 bg-zinc-950 py-1.5 px-2 text-zinc-300 outline-none"
              >
                <option value="" disabled>
                  {t('voiceSelectExistingProfile')}...
                </option>
                {existingProfiles.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} ({p.samples_count} {p.samples_count === 1 ? 'amostra' : 'amostras'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <label className="flex items-center gap-2 text-[11px] text-zinc-400 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={enrollOnSave}
              onChange={(e) => onEnrollOnSaveChange(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900 text-indigo-500"
            />
            <span>{t('voiceEnrollOnSave')}</span>
          </label>
        </div>
      )}

      <div className="mt-2 flex justify-between gap-2 text-xs text-zinc-400">
        <span>{t('diarizationSpeechTime')}</span>
        <span className="font-mono">
          {formatTime(speaker.seconds)} · {share}%
        </span>
      </div>
      <div className="my-1.5 h-1 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${speaker.color}`} style={{ width: `${share}%` }} />
      </div>
      <p className="text-[11px] text-zinc-500 font-mono">
        {speaker.turns} {t('diarizationTurns')} · {speaker.id}
      </p>
    </div>
  );
}

interface TranscriptSegmentRowProps {
  readonly key?: React.Key;
  readonly segment: TranscriptSegment;
  readonly speaker?: SpeakerInfo;
  readonly speakerMatch?: SpeakerMatch;
  readonly isExpanded: boolean;
  readonly onToggleExpand: () => void;
  readonly t: (key: any) => string;
}

function TranscriptSegmentRow({
  segment,
  speaker,
  speakerMatch,
  isExpanded,
  onToggleExpand,
  t,
}: TranscriptSegmentRowProps) {
  const hasScore =
    speakerMatch &&
    typeof speakerMatch.similarity_score === 'number' &&
    speakerMatch.similarity_score > 0;
  const matchPercent = hasScore ? Math.round(speakerMatch.similarity_score * 100) : null;

  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className={`h-2.5 w-2.5 rounded-full ${speaker?.color || 'bg-zinc-500'}`} />
        <span className="break-words text-sm font-semibold text-zinc-200">
          {speaker?.name || segment.speakerId}
        </span>

        {matchPercent !== null && (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${
              speakerMatch?.identified
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/40'
                : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/40'
            }`}
            title={`Similaridade biométrica: ${matchPercent}%`}
          >
            <Fingerprint className="h-2.5 w-2.5" />
            <span>{matchPercent}%</span>
          </span>
        )}

        <span className="font-mono text-xs tabular-nums text-zinc-400">
          {formatTime(segment.start)} – {formatTime(segment.end)}
        </span>

        {segment.phrases.length > 1 && (
          <button
            aria-expanded={isExpanded}
            aria-controls={segment.id}
            onClick={onToggleExpand}
            className="ml-auto flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs text-indigo-400 hover:bg-zinc-800"
          >
            <ChevronDown className={`h-4 w-4 ${isExpanded ? 'rotate-180' : ''}`} />
            {t(isExpanded ? 'hidePhrases' : 'expandPhrases')}
          </button>
        )}
      </div>

      <div id={segment.id}>
        {isExpanded ? (
          <div className="space-y-4 border-l border-zinc-700 pl-4">
            {segment.phrases.map((phrase) => (
              <div key={phrase.id}>
                <p className="mb-1 font-mono text-xs text-zinc-400">
                  {formatTime(phrase.start)} – {formatTime(phrase.end)}
                </p>
                <p className="whitespace-pre-wrap break-words text-base leading-7 text-zinc-300">
                  {phrase.text}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-base leading-7 text-zinc-300">
            {segment.text}
          </p>
        )}
      </div>
    </article>
  );
}

export const DiarizationViewer: React.FC<DiarizationViewerProps> = ({ video, language = 'en', onClose }) => {
  const { t } = getTranslation(language);
  const [liveResultJson, setLiveResultJson] = useState<TranscriptResult | null | undefined>(video.result_json);
  const [speakerMatches, setSpeakerMatches] = useState<Record<string, SpeakerMatch>>({});

  useEffect(() => {
    setLiveResultJson(video.result_json);
  }, [video.result_json, video.id]);

  useEffect(() => {
    const initialMatches = extractInitialMatches(liveResultJson);
    if (Object.keys(initialMatches).length > 0) {
      setSpeakerMatches((prev) => ({ ...initialMatches, ...prev }));
    }
  }, [liveResultJson]);

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
  const [isVectorizing, setIsVectorizing] = useState(false);
  const [isVectorized, setIsVectorized] = useState<boolean | null>(null);
  const [chunksCount, setChunksCount] = useState<number | null>(null);
  const [isSavingSpeaker, setIsSavingSpeaker] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [notice, setNotice] = useState('');
  const [trainingSpeaker, setTrainingSpeaker] = useState<SpeakerInfo | null>(null);
  const [isEnrollingSuggested, setIsEnrollingSuggested] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const handleEnrollFromSuggestedClip = async (clip: SuggestedClip) => {
    if (!trainingSpeaker) return;
    setIsEnrollingSuggested(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/voice-recognition/enroll/from-diarization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diarization_id: video.id,
          speaker_label: trainingSpeaker.id,
          speaker_name: trainingSpeaker.name,
          start_time: clip.start,
          end_time: clip.end,
          selected_segment_indices: [],
          apply_to_diarization: false,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      setNotice(`Trecho enviado para a Fila de Curadoria de Voz! (${formatTime(clip.start)} - ${formatTime(clip.end)})`);
      setTrainingSpeaker(null);
    } catch (err) {
      setNotice(`Erro ao enviar trecho para treino: ${String(err)}`);
    } finally {
      setIsEnrollingSuggested(false);
    }
  };

  useEffect(() => {
    apiFetch(`${API_BASE_URL}/api/voice-recognition/profiles`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setExistingProfiles(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    apiFetch(`${API_BASE_URL}/api/vectorization/status/${video.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setIsVectorized(Boolean(data.indexed));
        if (typeof data.chunks_count === 'number') {
          setChunksCount(data.chunks_count);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [video.id]);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const speakers: SpeakerInfo[] = useMemo(() => {
    const ids = [
      ...new Set([
        ...(Array.isArray(liveResultJson?.speakers) ? liveResultJson.speakers : []),
        ...segments.map((segment) => segment.speakerId),
      ]),
    ];
    return ids.map((id, index) => {
      let defaultLabel = id;
      if (id === 'UNKNOWN') {
        defaultLabel = t('speakerUnknown');
      }
      return {
        id,
        name: names[id] || defaultLabel,
        color: colors[index % colors.length],
        ...speakerStats(segments, id),
      };
    });
  }, [liveResultJson, segments, names, t]);

  const totalSpeech = speakers.reduce((sum, speaker) => sum + speaker.seconds, 0);
  const visible = segments.filter(
    (segment) =>
      (!speakerFilter || segment.speakerId === speakerFilter) &&
      segment.text.toLocaleLowerCase(language).includes(query.trim().toLocaleLowerCase(language))
  );
  const endTime = segments.reduce((max, segment) => Math.max(max, segment.end), 0);

  function toggleSegment(id: string) {
    setExpanded((previous) => {
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
    setNames((previous) => ({ ...previous, [targetSpeaker]: newName }));
    setIsSavingSpeaker(true);
    try {
      const response = await apiFetch(
        `${API_BASE_URL}/api/voice-recognition/diarization/${video.id}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            speaker_label: targetSpeaker,
            speaker_name: newName,
            enroll_voice: enrollOnSave,
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data?.result_json) {
          setLiveResultJson(data.result_json);
        }
        setNotice(`${newName} (${enrollOnSave ? t('voiceEnrolledNotice') : 'salvo'})`);
        if (enrollOnSave) {
          const newMatch: SpeakerMatch = {
            original_speaker_label: targetSpeaker,
            current_speaker_label: newName,
            matched_speaker_name: newName,
            identified: true,
            similarity_score: 1.0,
            applied: true,
            segments_count: 0,
            speech_duration_seconds: 0,
          };
          setSpeakerMatches((prev) => ({
            ...prev,
            [targetSpeaker]: newMatch,
            [newName]: newMatch,
          }));
          apiFetch(`${API_BASE_URL}/api/voice-recognition/profiles`)
            .then((res) => (res.ok ? res.json() : []))
            .then((profiles) => {
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
      const response = await apiFetch(
        `${API_BASE_URL}/api/vectorization/diarization/${video.id}?overwrite=true`,
        { method: 'POST' }
      );
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

  async function resetSpeakers() {
    try {
      const response = await apiFetch(
        `${API_BASE_URL}/api/voice-recognition/diarization/${video.id}/reset`,
        { method: 'POST' }
      );
      if (response.ok) {
        const data = await response.json();
        if (data?.result_json) {
          setLiveResultJson(data.result_json);
        }
        setNames({});
        setSpeakerMatches({});
        setNotice('Locutores originais restaurados com sucesso');
      }
    } catch {
      // Ignore network errors silently
    }
  }

  async function identifyVoices() {
    if (isIdentifying) return;
    setIsIdentifying(true);
    try {
      const response = await apiFetch(
        `${API_BASE_URL}/api/voice-recognition/diarization/${video.id}/identify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ similarity_threshold: 0.65, auto_apply: false }),
        }
      );
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
        setSpeakerMatches((prev) => ({ ...prev, ...matchMap }));
        if (Object.keys(newNames).length > 0) {
          setNames((prev) => ({ ...prev, ...newNames }));
        }
        const details = data.matches
          .map((m) => `${m.original_speaker_label}: ${Math.round(m.similarity_score * 100)}%`)
          .join(', ');
        setNotice(
          data.identified_count > 0
            ? `${t('voiceIdentifySuccess')}: ${data.identified_count}/${data.total_speakers} (${details})`
            : `Nenhuma voz atingiu o limiar (${details})`
        );
      }
    } catch {
      // Ignore network errors silently in viewer
    } finally {
      setIsIdentifying(false);
    }
  }

  function handleEditKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      saveName();
    } else if (event.key === 'Escape') {
      setEditing(null);
    }
  }

  function exportTranscript() {
    const text = [
      video.title,
      video.channelName,
      '',
      ...segments.map((segment) => {
        const speaker = speakers.find((item) => item.id === segment.speakerId);
        return `[${formatTime(segment.start)} – ${formatTime(segment.end)}] ${
          speaker?.name || segment.speakerId
        }\n${segment.text}\n`;
      }),
    ].join('\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${video.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 100) || 'transcript'}.txt`;
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
          <button
            onClick={onClose}
            aria-label={t('diarizationBack')}
            title={t('diarizationBack')}
            className="flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden xl:inline">{t('diarizationBack')}</span>
          </button>
          <div className="min-w-0 flex-1">
            <h2
              ref={headingRef}
              tabIndex={-1}
              title={video.title}
              className="line-clamp-2 text-base font-semibold leading-snug text-zinc-100 outline-none lg:text-lg"
            >
              {video.title}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
              <span>{video.channelName}</span>
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                {t('diarizationCompletedStatus')}
              </span>
              <span className="font-mono">{formatTime(endTime)}</span>
              <span>
                {speakers.length} {t('speakersTitle').toLocaleLowerCase(language)}
              </span>
              <span>
                {segments.length} {t('diarizationTurns')}
              </span>
            </div>
          </div>
          <button
            onClick={() => identifyVoices()}
            disabled={!segments.length || isIdentifying || isVectorizing}
            aria-label={t('voiceIdentifyBtn')}
            title={t('voiceIdentifyBtn')}
            className={`flex shrink-0 items-center gap-2 border-indigo-500/40 bg-indigo-950/30 text-indigo-300 hover:bg-indigo-900/40 ${control}`}
          >
            {isIdentifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
            <span className="hidden sm:inline">
              {isIdentifying ? t('voiceIdentifying') : t('voiceIdentifyBtn')}
            </span>
          </button>
          <button
            onClick={() => vectorizeTranscript()}
            disabled={!segments.length || isVectorizing || isIdentifying}
            aria-label={t('vectorizeButton')}
            title={
              language === 'pt'
                ? 'Gera embeddings vetoriais no pgvector para busca'
                : 'Generate vector embeddings in pgvector for search'
            }
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
              {getVectorizeButtonText(isVectorizing, isVectorized, chunksCount, t)}
            </span>
          </button>
          <button
            onClick={exportTranscript}
            aria-label={t('diarizationExport')}
            title={t('diarizationExport')}
            disabled={!segments.length}
            className={`flex shrink-0 items-center gap-2 ${control}`}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t('diarizationExport')}</span>
          </button>
        </div>
        <output className="sr-only">{notice}</output>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800 px-4 py-2 lg:px-6">
          <h3 className="sr-only lg:not-sr-only lg:flex lg:shrink-0 lg:items-center lg:gap-2 lg:text-sm lg:font-semibold lg:text-zinc-200">
            <FileText className="h-4 w-4 text-indigo-400" />
            {t('diarizationTranscript')}
          </h3>
          <div className="flex min-w-0 flex-[1_1_320px] gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">{t('diarizationSearchText')}</span>
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('diarizationSearchText')}
                className={`${input} pl-9 pr-3`}
              />
            </label>
            <select
              aria-label={t('speakersTitle')}
              value={speakerFilter}
              onChange={(event) => setSpeakerFilter(event.target.value)}
              className={`${input.replace('w-full', 'w-28 sm:w-40')} shrink-0 px-3`}
            >
              <option value="">{t('diarizationAllSpeakers')}</option>
              {speakers.map((speaker) => (
                <option key={speaker.id} value={speaker.id}>
                  {speaker.name}
                </option>
              ))}
            </select>
          </div>
          <button
            aria-expanded={showSpeakers}
            aria-controls="diarization-speakers"
            onClick={() => setShowSpeakers(!showSpeakers)}
            className={`flex shrink-0 items-center gap-2 ${control}`}
          >
            <Users className="h-4 w-4" />
            {t(showSpeakers ? 'diarizationHideSpeakers' : 'diarizationShowSpeakers')}
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto xl:flex-row xl:overflow-hidden">
          {showSpeakers && (
            <aside
              id="diarization-speakers"
              aria-label={t('speakersTitle')}
              className="order-first shrink-0 border-b border-zinc-800 bg-zinc-900/30 p-4 xl:order-last xl:w-72 xl:overflow-y-auto xl:border-b-0 xl:border-l 2xl:w-80"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-zinc-200">
                  {t('speakersTitle')}{' '}
                  <span className="ml-1 text-zinc-400 font-mono text-xs">({speakers.length})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => resetSpeakers()}
                  title="Restaurar identificadores originais dos locutores (SPEAKER_00, SPEAKER_01...)"
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Restaurar</span>
                </button>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                {t('diarizationSpeakerHint')}
              </p>

              {/* Quick Biometric Identification trigger */}
              <button
                type="button"
                onClick={() => identifyVoices()}
                disabled={!segments.length || isIdentifying || isVectorizing}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 text-xs font-medium transition disabled:opacity-50"
              >
                {isIdentifying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Fingerprint className="h-3.5 w-3.5 text-indigo-400" />
                )}
                <span>{isIdentifying ? t('voiceIdentifying') : t('voiceIdentifyBtn')}</span>
              </button>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {speakers.map((speaker) => (
                  <SpeakerCard
                    key={speaker.id}
                    speaker={speaker}
                    totalSpeech={totalSpeech}
                    isSelected={speakerFilter === speaker.id}
                    match={speakerMatches[speaker.id] || speakerMatches[speaker.name]}
                    isEditing={editing === speaker.id}
                    editName={editName}
                    enrollOnSave={enrollOnSave}
                    isSavingSpeaker={isSavingSpeaker}
                    existingProfiles={existingProfiles}
                    onToggleFilter={() =>
                      setSpeakerFilter(speakerFilter === speaker.id ? '' : speaker.id)
                    }
                    onStartEdit={() => {
                      setEditing(speaker.id);
                      setEditName(
                        names[speaker.id] || (speaker.id.startsWith('SPEAKER_') ? '' : speaker.name)
                      );
                      setEnrollOnSave(true);
                    }}
                    onOpenSuggestedClips={(spk) => setTrainingSpeaker(spk)}
                    onEditNameChange={(val) => setEditName(val)}
                    onEnrollOnSaveChange={(val) => setEnrollOnSave(val)}
                    onKeyDown={handleEditKeyDown}
                    onSave={() => saveName()}
                    onCancelEdit={() => setEditing(null)}
                    t={t}
                  />
                ))}
              </div>
            </aside>
          )}

          <div className="min-w-0 flex-1 xl:overflow-y-auto">
            <div className="mx-auto max-w-4xl p-4 lg:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                <output>
                  {visible.length} / {segments.length} {t('diarizationVisibleTurns')}
                </output>
                {(query || speakerFilter) && (
                  <button
                    onClick={clearFilters}
                    className="min-h-10 rounded-lg px-2 text-indigo-400 hover:bg-zinc-900"
                  >
                    {t('diarizationClearFilters')}
                  </button>
                )}
              </div>

              {visible.length ? (
                <div className="space-y-3">
                  {visible.map((segment) => {
                    const speaker = speakers.find((item) => item.id === segment.speakerId);
                    const segMatch =
                      speakerMatches[segment.speakerId] ||
                      (speaker
                        ? speakerMatches[speaker.id] || speakerMatches[speaker.name]
                        : undefined);
                    return (
                      <TranscriptSegmentRow
                        key={segment.id}
                        segment={segment}
                        speaker={speaker}
                        speakerMatch={segMatch}
                        isExpanded={expanded.has(segment.id)}
                        onToggleExpand={() => toggleSegment(segment.id)}
                        t={t}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center py-16 text-center">
                  <FileText className="mb-4 h-8 w-8 text-zinc-500" />
                  <h3 className="font-medium text-zinc-200">{t('diarizationNoText')}</h3>
                  <p className="mt-2 max-w-sm text-sm text-zinc-400">
                    {t(segments.length ? 'diarizationNoTextHint' : 'diarizationNoTranscript')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal with Suggested Clips for the Selected Speaker */}
      {trainingSpeaker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">
                    Treinar Voz com {trainingSpeaker.name}
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-400">
                    Locutor original: {trainingSpeaker.id} · Duração total: {formatTime(trainingSpeaker.seconds)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrainingSpeaker(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <VoiceSuggestedClips
              diarizationId={video.id}
              speakerLabel={trainingSpeaker.id}
              onSelectClip={handleEnrollFromSuggestedClip}
              language={language}
            />
          </div>
        </div>
      )}
    </section>
  );
};
