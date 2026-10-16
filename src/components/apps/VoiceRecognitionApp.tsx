import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckSquare,
  Clock,
  Database,
  Film,
  Fingerprint,
  Folder,
  Layers,
  ListChecks,
  Loader2,
  Mic,
  Plus,
  RefreshCw,
  Scissors,
  Search,
  Sparkles,
  Square,
  Trash2,
  Upload,
  UserCheck,
  Users,
} from 'lucide-react';
import { API_BASE_URL, apiFetch } from '../../api';
import type {
  IdentifyDiarizationResponse,
  LanguageMode,
  SpeakerProfile,
  VoiceRecognitionStats,
  VoiceSample,
} from '../../types';
import { getTranslation } from '../../locales';
import type { DiarizationVideo } from './DiarizationApp';
import { formatTime } from './diarization/transcript';

interface VoiceRecognitionAppProps {
  readonly language?: LanguageMode;
  readonly onAddLog: (
    app: string,
    level: 'info' | 'success' | 'warning' | 'error',
    message: string,
  ) => void;
}

type TrainingMode = 'clip' | 'segments';

function parseTimeStringToSeconds(val: string): number {
  const trimmed = val.trim();
  if (!trimmed) return 0;
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map(Number);
    if (parts.length === 2) {
      return (parts[0] || 0) * 60 + (parts[1] || 0);
    }
    if (parts.length === 3) {
      return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    }
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export const VoiceRecognitionApp: React.FC<VoiceRecognitionAppProps> = ({
  language = 'pt',
  onAddLog,
}) => {
  const { t } = getTranslation(language);

  const [profiles, setProfiles] = useState<SpeakerProfile[]>([]);
  const [stats, setStats] = useState<VoiceRecognitionStats | null>(null);
  const [diarizations, setDiarizations] = useState<DiarizationVideo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchProfile, setSearchProfile] = useState<string>('');

  // Profile creation
  const [newProfileName, setNewProfileName] = useState<string>('');
  const [newProfileDesc, setNewProfileDesc] = useState<string>('');
  const [isCreatingProfile, setIsCreatingProfile] = useState<boolean>(false);

  // Training Mode (Clip vs Speech Turns)
  const [trainingMode, setTrainingMode] = useState<TrainingMode>('clip');

  // Video Clip Range Form
  const [clipVideoId, setClipVideoId] = useState<string>('');
  const [clipStartTime, setClipStartTime] = useState<string>('00:00');
  const [clipEndTime, setClipEndTime] = useState<string>('00:30');
  const [clipTargetName, setClipTargetName] = useState<string>('');
  const [clipLabel, setClipLabel] = useState<string>('');
  const [isTrainingClip, setIsTrainingClip] = useState<boolean>(false);

  // Segment Selection Form
  const [selectedDiarizationId, setSelectedDiarizationId] = useState<string>('');
  const [selectedSpeakerLabel, setSelectedSpeakerLabel] = useState<string>('');
  const [targetSpeakerName, setTargetSpeakerName] = useState<string>('');
  const [selectedSegmentIndices, setSelectedSegmentIndices] = useState<number[]>([]);
  const [isEnrollingSegments, setIsEnrollingSegments] = useState<boolean>(false);

  // Audio Upload Form
  const [uploadSpeakerName, setUploadSpeakerName] = useState<string>('');
  const [isUploadingAudio, setIsUploadingAudio] = useState<boolean>(false);

  // Identification Panel
  const [identifyDiarizationId, setIdentifyDiarizationId] = useState<string>('');
  const [threshold, setThreshold] = useState<number>(0.65);
  const [isIdentifying, setIsIdentifying] = useState<boolean>(false);
  const [identifyResult, setIdentifyResult] = useState<IdentifyDiarizationResponse | null>(null);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profilesRes, statsRes, diarRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/api/voice-recognition/profiles?include_samples=true`),
        apiFetch(`${API_BASE_URL}/api/voice-recognition/stats`),
        apiFetch(`${API_BASE_URL}/api/diarization/list?page=1&limit=50&step=COMPLETED`),
      ]);

      if (profilesRes.ok) {
        const profilesData: SpeakerProfile[] = await profilesRes.json();
        setProfiles(Array.isArray(profilesData) ? profilesData : []);
      }
      if (statsRes.ok) {
        const statsData: VoiceRecognitionStats = await statsRes.json();
        setStats(statsData);
      }
      if (diarRes.ok) {
        const diarData = (await diarRes.json()) as { items?: DiarizationVideo[] };
        const items = Array.isArray(diarData.items) ? diarData.items : [];
        setDiarizations(items);
        if (items.length > 0) {
          if (!selectedDiarizationId) setSelectedDiarizationId(items[0].id);
          if (!clipVideoId) setClipVideoId(items[0].id);
          if (!identifyDiarizationId) setIdentifyDiarizationId(items[0].id);
        }
      }
    } catch (err) {
      onAddLog('VoiceRecognition', 'error', String(err));
    } finally {
      setIsLoading(false);
    }
  }, [onAddLog, selectedDiarizationId, clipVideoId, identifyDiarizationId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const selectedDiarization = useMemo(
    () => diarizations.find((d) => d.id === selectedDiarizationId) || null,
    [diarizations, selectedDiarizationId]
  );

  const availableSpeakersInSelected = useMemo(() => {
    if (!selectedDiarization?.result_json?.segments) return [];
    const map = new Map<string, { label: string; count: number; sampleText: string }>();
    for (const seg of selectedDiarization.result_json.segments) {
      const label = seg.speaker || 'UNKNOWN';
      if (label === 'UNKNOWN') continue;
      const existing = map.get(label);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(label, {
          label,
          count: 1,
          sampleText: (seg.text || '').slice(0, 90),
        });
      }
    }
    return Array.from(map.values());
  }, [selectedDiarization]);

  useEffect(() => {
    if (availableSpeakersInSelected.length > 0) {
      setSelectedSpeakerLabel(availableSpeakersInSelected[0].label);
    } else {
      setSelectedSpeakerLabel('');
    }
  }, [availableSpeakersInSelected]);

  // Turn segments belonging to the selected speaker
  const speakerSegments = useMemo(() => {
    if (!selectedDiarization?.result_json?.segments || !selectedSpeakerLabel) return [];
    return selectedDiarization.result_json.segments
      .map((seg, originalIndex) => ({ ...seg, originalIndex }))
      .filter(
        (seg) =>
          seg.speaker === selectedSpeakerLabel || seg.original_speaker === selectedSpeakerLabel
      );
  }, [selectedDiarization, selectedSpeakerLabel]);

  // Default to selecting all segments for this speaker initially
  useEffect(() => {
    if (speakerSegments.length > 0) {
      setSelectedSegmentIndices(speakerSegments.map((_, idx) => idx));
    } else {
      setSelectedSegmentIndices([]);
    }
  }, [speakerSegments]);

  const filteredProfiles = useMemo(() => {
    const q = searchProfile.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
    );
  }, [profiles, searchProfile]);

  // Computed clip duration
  const clipStartSec = useMemo(() => parseTimeStringToSeconds(clipStartTime), [clipStartTime]);
  const clipEndSec = useMemo(() => parseTimeStringToSeconds(clipEndTime), [clipEndTime]);
  const clipDurationSec = useMemo(
    () => Math.max(0, clipEndSec - clipStartSec),
    [clipStartSec, clipEndSec]
  );

  async function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!newProfileName.trim() || isCreatingProfile) return;
    setIsCreatingProfile(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/voice-recognition/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProfileName.trim(),
          description: newProfileDesc.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      onAddLog('VoiceRecognition', 'success', `Perfil criado: ${newProfileName.trim()}`);
      setNewProfileName('');
      setNewProfileDesc('');
      await fetchAllData();
    } catch (err) {
      onAddLog('VoiceRecognition', 'error', String(err));
    } finally {
      setIsCreatingProfile(false);
    }
  }

  async function handleDeleteProfile(speakerId: string, name: string) {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/voice-recognition/profiles/${speakerId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onAddLog('VoiceRecognition', 'info', `Perfil removido: ${name}`);
        await fetchAllData();
      }
    } catch (err) {
      onAddLog('VoiceRecognition', 'error', String(err));
    }
  }

  async function handleTrainVideoClip(e: React.FormEvent) {
    e.preventDefault();
    if (!clipVideoId || !clipTargetName.trim() || clipDurationSec < 1 || isTrainingClip) {
      return;
    }
    setIsTrainingClip(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/voice-recognition/enroll/video-clip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: clipVideoId,
          speaker_name: clipTargetName.trim(),
          start_time: clipStartSec,
          end_time: clipEndSec,
          label: clipLabel.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      onAddLog(
        'VoiceRecognition',
        'success',
        `Trecho de vídeo treinado para ${clipTargetName.trim()} (${clipDurationSec}s). Arquivo salvo em D:/voice_training/`
      );
      setClipLabel('');
      await fetchAllData();
    } catch (err) {
      onAddLog('VoiceRecognition', 'error', String(err));
    } finally {
      setIsTrainingClip(false);
    }
  }

  async function handleEnrollSelectedSegments(e: React.FormEvent) {
    e.preventDefault();
    if (
      !selectedDiarizationId ||
      !selectedSpeakerLabel ||
      !targetSpeakerName.trim() ||
      !selectedSegmentIndices.length ||
      isEnrollingSegments
    ) {
      return;
    }
    setIsEnrollingSegments(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/voice-recognition/enroll/from-diarization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diarization_id: selectedDiarizationId,
          speaker_label: selectedSpeakerLabel,
          speaker_name: targetSpeakerName.trim(),
          selected_segment_indices: selectedSegmentIndices,
          apply_to_diarization: true,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      onAddLog(
        'VoiceRecognition',
        'success',
        `Modelo treinado para ${targetSpeakerName.trim()} com ${selectedSegmentIndices.length} falas selecionadas.`
      );
      await fetchAllData();
    } catch (err) {
      onAddLog('VoiceRecognition', 'error', String(err));
    } finally {
      setIsEnrollingSegments(false);
    }
  }

  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadSpeakerName.trim()) return;
    setIsUploadingAudio(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(new Error('Failed to read audio file'));
        reader.readAsDataURL(file);
      });

      const res = await apiFetch(`${API_BASE_URL}/api/voice-recognition/enroll/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_base64: base64,
          filename: file.name,
          speaker_name: uploadSpeakerName.trim(),
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      onAddLog('VoiceRecognition', 'success', `Amostra enviada para ${uploadSpeakerName.trim()}`);
      setUploadSpeakerName('');
      await fetchAllData();
    } catch (err) {
      onAddLog('VoiceRecognition', 'error', String(err));
    } finally {
      setIsUploadingAudio(false);
      e.target.value = '';
    }
  }

  async function handleIdentifyDiarization() {
    if (!identifyDiarizationId || isIdentifying) return;
    setIsIdentifying(true);
    setIdentifyResult(null);
    try {
      const res = await apiFetch(
        `${API_BASE_URL}/api/voice-recognition/diarization/${identifyDiarizationId}/identify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            similarity_threshold: threshold,
            auto_apply: true,
          }),
        }
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data: IdentifyDiarizationResponse = await res.json();
      setIdentifyResult(data);
      onAddLog(
        'VoiceRecognition',
        'success',
        `${t('voiceIdentifySuccess')}: ${data.identified_count}/${data.total_speakers}`
      );
      await fetchAllData();
    } catch (err) {
      onAddLog('VoiceRecognition', 'error', String(err));
    } finally {
      setIsIdentifying(false);
    }
  }

  function toggleSegmentIndex(idx: number) {
    setSelectedSegmentIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto bg-[#09090b] p-4 lg:p-6 space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-500/10 text-indigo-400">
            <Fingerprint className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100 sm:text-xl">
              {t('voiceRecognitionTab')}
            </h1>
            <p className="text-xs text-zinc-400">{t('voiceRecognitionSubtitle')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {stats && (
            <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Users className="h-3.5 w-3.5 text-indigo-400" />
                <strong>{stats.total_profiles}</strong> perfis
              </span>
              <span className="text-zinc-700">|</span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Database className="h-3.5 w-3.5 text-emerald-400" />
                <strong>{stats.total_samples}</strong> amostras ({stats.embedding_dimension}d)
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => fetchAllData()}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Voice Training Center + Automatic Recognition + Profiles */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left Column: Training by Video Clips / Speech Turns (5 cols) */}
        <div className="space-y-6 xl:col-span-5">
          {/* Card 1: Dedicated Training Center */}
          <div className="rounded-2xl border border-indigo-500/30 bg-zinc-900/40 p-5 space-y-4 shadow-lg shadow-indigo-950/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <Scissors className="h-4 w-4 text-indigo-400" />
                <span>{t('voiceTrainTabTitle')}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
                <Folder className="h-3 w-3 text-amber-400" />
                <span>D:/voice_training</span>
              </div>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex rounded-lg border border-zinc-800 bg-zinc-950 p-1">
              <button
                type="button"
                onClick={() => setTrainingMode('clip')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition ${
                  trainingMode === 'clip'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Scissors className="h-3.5 w-3.5" />
                <span>{t('voiceTrainByClip')}</span>
              </button>
              <button
                type="button"
                onClick={() => setTrainingMode('segments')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition ${
                  trainingMode === 'segments'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <ListChecks className="h-3.5 w-3.5" />
                <span>{t('voiceTrainBySegments')}</span>
              </button>
            </div>

            {/* MODE 1: Video Clip Range Training */}
            {trainingMode === 'clip' && (
              <form onSubmit={handleTrainVideoClip} className="space-y-3.5">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    {t('voiceEnrollSelectVideo')}
                  </label>
                  <select
                    value={clipVideoId}
                    onChange={(e) => setClipVideoId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:border-indigo-500 outline-none"
                  >
                    {diarizations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.channelName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start & End Time Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      {t('voiceTrainStartTime')}
                    </label>
                    <div className="relative flex items-center">
                      <Clock className="absolute left-2.5 h-3.5 w-3.5 text-zinc-500" />
                      <input
                        type="text"
                        value={clipStartTime}
                        onChange={(e) => setClipStartTime(e.target.value)}
                        placeholder="00:15"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-8 pr-2.5 py-1.5 font-mono text-xs text-zinc-200 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      {t('voiceTrainEndTime')}
                    </label>
                    <div className="relative flex items-center">
                      <Clock className="absolute left-2.5 h-3.5 w-3.5 text-zinc-500" />
                      <input
                        type="text"
                        value={clipEndTime}
                        onChange={(e) => setClipEndTime(e.target.value)}
                        placeholder="00:45"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-8 pr-2.5 py-1.5 font-mono text-xs text-zinc-200 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Duration indicator */}
                <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-400">{t('voiceTrainClipDuration')}:</span>
                  <span
                    className={`font-mono font-semibold ${
                      clipDurationSec >= 3 && clipDurationSec <= 90
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {clipDurationSec}s ({formatTime(clipDurationSec)})
                  </span>
                </div>

                {/* Target Profile Selection */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    {t('voiceEnrollTargetProfile')}
                  </label>
                  <select
                    value={profiles.some((p) => p.name === clipTargetName) ? clipTargetName : ''}
                    onChange={(e) => setClipTargetName(e.target.value)}
                    className="w-full mb-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 outline-none"
                  >
                    <option value="">{t('voiceSelectExistingProfileOption')}</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} ({p.samples_count} {p.samples_count === 1 ? 'amostra' : 'amostras'})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={clipTargetName}
                    onChange={(e) => setClipTargetName(e.target.value)}
                    placeholder={t('voiceOrTypeNewName')}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Rótulo opcional da amostra
                  </label>
                  <input
                    type="text"
                    value={clipLabel}
                    onChange={(e) => setClipLabel(e.target.value)}
                    placeholder={t('voiceTrainLabelPlaceholder')}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!clipVideoId || !clipTargetName.trim() || clipDurationSec < 1 || isTrainingClip}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
                >
                  {isTrainingClip ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('voiceEnrolling')}</span>
                    </>
                  ) : (
                    <>
                      <Scissors className="h-4 w-4" />
                      <span>{t('voiceTrainBtn')}</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* MODE 2: Speech Turns Selection */}
            {trainingMode === 'segments' && (
              <form onSubmit={handleEnrollSelectedSegments} className="space-y-3.5">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    {t('voiceEnrollSelectVideo')}
                  </label>
                  <select
                    value={selectedDiarizationId}
                    onChange={(e) => setSelectedDiarizationId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 outline-none"
                  >
                    {diarizations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.channelName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    {t('voiceEnrollSelectSpeaker')}
                  </label>
                  <select
                    value={selectedSpeakerLabel}
                    onChange={(e) => setSelectedSpeakerLabel(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 outline-none"
                  >
                    {availableSpeakersInSelected.map((spk) => (
                      <option key={spk.label} value={spk.label}>
                        {spk.label} ({spk.count} turnos)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Speech Turns Selection Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="text-zinc-400">{t('voiceTrainSelectSegmentsHint')}</span>
                    <div className="flex gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSelectedSegmentIndices(speakerSegments.map((_, i) => i))}
                        className="text-indigo-400 hover:underline"
                      >
                        {t('voiceTrainSelectAll')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSegmentIndices([])}
                        className="text-zinc-500 hover:underline"
                      >
                        {t('voiceTrainDeselectAll')}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs">
                    {speakerSegments.map((seg, idx) => {
                      const isChecked = selectedSegmentIndices.includes(idx);
                      const dur = Math.round((Number(seg.end) - Number(seg.start)) * 10) / 10;
                      return (
                        <div
                          key={`${seg.start}-${seg.end}-${idx}`}
                          onClick={() => toggleSegmentIndex(idx)}
                          className={`flex items-start gap-2 p-1.5 rounded cursor-pointer transition ${
                            isChecked
                              ? 'bg-indigo-950/40 text-zinc-200 border border-indigo-900/40'
                              : 'bg-zinc-900/40 text-zinc-400 hover:bg-zinc-900'
                          }`}
                        >
                          <span className="mt-0.5 text-indigo-400">
                            {isChecked ? (
                              <CheckSquare className="h-3.5 w-3.5" />
                            ) : (
                              <Square className="h-3.5 w-3.5 text-zinc-600" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="font-mono text-[10px] text-zinc-500 mr-1.5">
                              [{formatTime(seg.start)} – {formatTime(seg.end)}] ({dur}s)
                            </span>
                            <span className="line-clamp-2 text-[11px] leading-tight">
                              {seg.text || '...'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    {selectedSegmentIndices.length} {t('voiceTrainSelectedTurns')}
                  </div>
                </div>

                {/* Target Profile Selection */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    {t('voiceEnrollTargetProfile')}
                  </label>
                  <select
                    value={profiles.some((p) => p.name === targetSpeakerName) ? targetSpeakerName : ''}
                    onChange={(e) => setTargetSpeakerName(e.target.value)}
                    className="w-full mb-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 outline-none"
                  >
                    <option value="">{t('voiceSelectExistingProfileOption')}</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={targetSpeakerName}
                    onChange={(e) => setTargetSpeakerName(e.target.value)}
                    placeholder={t('voiceOrTypeNewName')}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    !selectedDiarizationId ||
                    !selectedSpeakerLabel ||
                    !targetSpeakerName.trim() ||
                    !selectedSegmentIndices.length ||
                    isEnrollingSegments
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
                >
                  {isEnrollingSegments ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('voiceEnrolling')}</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4" />
                      <span>{t('voiceTrainWithSegmentsBtn')}</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Upload audio sample alternative */}
            <div className="border-t border-zinc-800/80 pt-3 space-y-2">
              <div className="text-xs text-zinc-400">{t('voiceEnrollAudioUpload')}</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={uploadSpeakerName}
                  onChange={(e) => setUploadSpeakerName(e.target.value)}
                  placeholder={t('voiceOrTypeNewName')}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 outline-none"
                />
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800">
                  {isUploadingAudio ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 text-indigo-400" />
                  )}
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="audio/*,video/*"
                    disabled={!uploadSpeakerName.trim() || isUploadingAudio}
                    onChange={handleAudioUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Card 2: Automatic Speaker Identification on a Diarization */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>{t('voiceIdentifyBtn')} (pgvector Cosine Search)</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  {t('voiceEnrollSelectVideo')}
                </label>
                <select
                  value={identifyDiarizationId}
                  onChange={(e) => setIdentifyDiarizationId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none"
                >
                  {diarizations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.channelName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs text-zinc-400 mb-1">
                  <span>{t('voiceIdentifyThreshold')}</span>
                  <span className="font-mono text-indigo-400">{Math.round(threshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.35}
                  max={0.95}
                  step={0.05}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={() => handleIdentifyDiarization()}
                disabled={!identifyDiarizationId || isIdentifying}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                {isIdentifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('voiceIdentifying')}</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-4 w-4" />
                    <span>{t('voiceIdentifyBtn')}</span>
                  </>
                )}
              </button>
            </div>

            {identifyResult && (
              <div className="mt-3 space-y-2 border-t border-zinc-800 pt-3">
                <div className="text-xs font-medium text-zinc-300">
                  Identificados: {identifyResult.identified_count} de{' '}
                  {identifyResult.total_speakers} locutores
                </div>
                <div className="space-y-1.5">
                  {identifyResult.matches.map((m) => (
                    <div
                      key={m.original_speaker_label}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs"
                    >
                      <div>
                        <span className="font-mono text-zinc-400">
                          {m.original_speaker_label}
                        </span>
                        <span className="mx-2 text-zinc-600">→</span>
                        <span
                          className={
                            m.identified
                              ? 'font-semibold text-emerald-400'
                              : 'text-zinc-400'
                          }
                        >
                          {m.matched_speaker_name || 'Não identificado'}
                        </span>
                      </div>
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[11px] ${
                          m.identified
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {Math.round(m.similarity_score * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Enrolled Speaker Profiles Directory (7 cols) */}
        <div className="space-y-4 xl:col-span-7">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-400" />
                <span>{t('voiceProfilesTitle')}</span>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                  {profiles.length}
                </span>
              </h2>

              <div className="relative min-w-48">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="search"
                  value={searchProfile}
                  onChange={(e) => setSearchProfile(e.target.value)}
                  placeholder="Filtrar perfis..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-1.5 pl-8 pr-3 text-xs text-zinc-200 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Quick Create Profile Form */}
            <form
              onSubmit={handleCreateProfile}
              className="flex flex-wrap gap-2 border-b border-zinc-800/80 pb-4"
            >
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder={t('voiceProfileNamePlaceholder')}
                className="flex-1 min-w-40 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={newProfileDesc}
                onChange={(e) => setNewProfileDesc(e.target.value)}
                placeholder={t('voiceProfileDescPlaceholder')}
                className="flex-1 min-w-40 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!newProfileName.trim() || isCreatingProfile}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                {isCreatingProfile ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                <span>{t('voiceCreateProfileBtn')}</span>
              </button>
            </form>

            {/* Profiles List */}
            {filteredProfiles.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                {t('voiceNoProfiles')}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProfiles.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-4 space-y-3 transition hover:border-zinc-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-100 text-sm">{p.name}</span>
                          <span className="rounded bg-indigo-500/10 px-2 py-0.5 font-mono text-[11px] text-indigo-400 border border-indigo-500/30">
                            {p.samples_count} {t('voiceSamplesCount')}
                          </span>
                        </div>
                        {p.description && (
                          <p className="mt-1 text-xs text-zinc-400">{p.description}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteProfile(p.id, p.name)}
                        title={t('voiceDeleteProfile')}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-rose-400 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Samples list preview */}
                    {p.samples && p.samples.length > 0 && (
                      <div className="space-y-1.5 border-t border-zinc-800/60 pt-2.5">
                        <div className="text-[11px] font-medium text-zinc-400">
                          Amostras cadastradas:
                        </div>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {p.samples.map((s) => {
                            const isClip = s.source_type === 'YOUTUBE_CLIP';
                            return (
                              <div
                                key={s.id}
                                className="flex items-center justify-between rounded-lg bg-zinc-900/60 px-2.5 py-1.5 text-[11px] font-mono text-zinc-400 border border-zinc-800/50"
                              >
                                <span className="truncate flex items-center gap-1.5">
                                  {isClip ? (
                                    <Film className="h-3 w-3 text-cyan-400" />
                                  ) : (
                                    <Mic className="h-3 w-3 text-indigo-400" />
                                  )}
                                  <span className="truncate">
                                    {s.speaker_label || s.source_type}
                                  </span>
                                </span>
                                {typeof s.duration_seconds === 'number' && s.duration_seconds > 0 && (
                                  <span className="shrink-0 text-zinc-500 ml-2">
                                    {Math.round(s.duration_seconds)}s
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
