import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Database,
  Fingerprint,
  Loader2,
  Mic,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
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
} from '../../types';
import { getTranslation } from '../../locales';
import type { DiarizationVideo } from './DiarizationApp';
import { formatTime } from './diarization/transcript';

interface VoiceRecognitionAppProps {
  language?: LanguageMode;
  onAddLog: (
    app: string,
    level: 'info' | 'success' | 'warning' | 'error',
    message: string,
  ) => void;
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

  // Create Profile Form
  const [newProfileName, setNewProfileName] = useState<string>('');
  const [newProfileDesc, setNewProfileDesc] = useState<string>('');
  const [isCreatingProfile, setIsCreatingProfile] = useState<boolean>(false);

  // Enroll from Diarization Form
  const [selectedDiarizationId, setSelectedDiarizationId] = useState<string>('');
  const [selectedSpeakerLabel, setSelectedSpeakerLabel] = useState<string>('');
  const [targetSpeakerName, setTargetSpeakerName] = useState<string>('');
  const [isEnrolling, setIsEnrolling] = useState<boolean>(false);

  // Audio Upload Enrollment
  const [uploadSpeakerName, setUploadSpeakerName] = useState<string>('');
  const [isUploadingAudio, setIsUploadingAudio] = useState<boolean>(false);

  // Automatic Identification Panel
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
        if (items.length > 0 && !selectedDiarizationId) {
          setSelectedDiarizationId(items[0].id);
          setIdentifyDiarizationId(items[0].id);
        }
      }
    } catch (err) {
      onAddLog('VoiceRecognition', 'error', String(err));
    } finally {
      setIsLoading(false);
    }
  }, [onAddLog, selectedDiarizationId]);

  useEffect(() => {
    void fetchAllData();
  }, [fetchAllData]);

  const selectedDiarization = useMemo(
    () => diarizations.find((d) => d.id === selectedDiarizationId) || null,
    [diarizations, selectedDiarizationId],
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

  const filteredProfiles = useMemo(() => {
    const q = searchProfile.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q),
    );
  }, [profiles, searchProfile]);

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

  async function handleEnrollFromDiarization(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDiarizationId || !selectedSpeakerLabel || !targetSpeakerName.trim() || isEnrolling) {
      return;
    }
    setIsEnrolling(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/voice-recognition/enroll/from-diarization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diarization_id: selectedDiarizationId,
          speaker_label: selectedSpeakerLabel,
          speaker_name: targetSpeakerName.trim(),
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
        `Voz de ${targetSpeakerName.trim()} cadastrada (${selectedSpeakerLabel})`,
      );
      setTargetSpeakerName('');
      await fetchAllData();
    } catch (err) {
      onAddLog('VoiceRecognition', 'error', String(err));
    } finally {
      setIsEnrolling(false);
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
        },
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
        `${t('voiceIdentifySuccess')}: ${data.identified_count}/${data.total_speakers}`,
      );
      await fetchAllData();
    } catch (err) {
      onAddLog('VoiceRecognition', 'error', String(err));
    } finally {
      setIsIdentifying(false);
    }
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
                <strong>{stats.total_samples}</strong> embeddings ({stats.embedding_dimension}d)
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => void fetchAllData()}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Enrollment + Identification + Profiles */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left Column: Enrollment & Automatic Recognition (5 cols) */}
        <div className="space-y-6 xl:col-span-5">
          {/* Card 1: Enroll from Diarization */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <Mic className="h-4 w-4 text-indigo-400" />
              <span>{t('voiceEnrollFromDiarizationTitle')}</span>
            </div>

            <form onSubmit={handleEnrollFromDiarization} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  {t('voiceEnrollSelectVideo')}
                </label>
                <select
                  value={selectedDiarizationId}
                  onChange={(e) => setSelectedDiarizationId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:border-indigo-500 outline-none"
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
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:border-indigo-500 outline-none"
                >
                  {availableSpeakersInSelected.map((spk) => (
                    <option key={spk.label} value={spk.label}>
                      {spk.label} ({spk.count} turnos) — &ldquo;{spk.sampleText}...&rdquo;
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  {t('voiceEnrollTargetProfile')}
                </label>
                <input
                  type="text"
                  list="existing-speaker-profiles"
                  value={targetSpeakerName}
                  onChange={(e) => setTargetSpeakerName(e.target.value)}
                  placeholder={t('voiceProfileNamePlaceholder')}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:border-indigo-500 outline-none"
                />
                <datalist id="existing-speaker-profiles">
                  {profiles.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>

              <button
                type="submit"
                disabled={
                  !selectedDiarizationId ||
                  !selectedSpeakerLabel ||
                  !targetSpeakerName.trim() ||
                  isEnrolling
                }
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                {isEnrolling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('voiceEnrolling')}</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4" />
                    <span>{t('voiceEnrollBtn')}</span>
                  </>
                )}
              </button>
            </form>

            {/* Upload audio sample alternative */}
            <div className="border-t border-zinc-800/80 pt-3 space-y-2">
              <div className="text-xs text-zinc-400">{t('voiceEnrollAudioUpload')}</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  list="existing-speaker-profiles"
                  value={uploadSpeakerName}
                  onChange={(e) => setUploadSpeakerName(e.target.value)}
                  placeholder={t('voiceProfileNamePlaceholder')}
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
                onClick={() => void handleIdentifyDiarization()}
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

              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="search"
                  value={searchProfile}
                  onChange={(e) => setSearchProfile(e.target.value)}
                  placeholder="Buscar perfil..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-8 pr-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Quick Create Profile Form */}
            <form
              onSubmit={handleCreateProfile}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3"
            >
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder={t('voiceProfileNamePlaceholder')}
                className="min-w-[180px] flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={newProfileDesc}
                onChange={(e) => setNewProfileDesc(e.target.value)}
                placeholder={t('voiceProfileDescPlaceholder')}
                className="min-w-[180px] flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!newProfileName.trim() || isCreatingProfile}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('voiceCreateProfileBtn')}</span>
              </button>
            </form>

            {/* Profiles List */}
            {filteredProfiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Fingerprint className="h-8 w-8 text-zinc-600 mb-2" />
                <p className="text-sm text-zinc-400">{t('voiceNoProfiles')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {filteredProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-zinc-100">
                            {profile.name}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-mono text-indigo-300">
                            <Check className="h-3 w-3" />
                            {profile.samples_count} {t('voiceSamplesCount')}
                          </span>
                        </div>
                        {profile.description && (
                          <p className="mt-1 text-xs text-zinc-400">{profile.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteProfile(profile.id, profile.name)}
                        title={t('voiceDeleteProfile')}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-950/50 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {Array.isArray(profile.samples) && profile.samples.length > 0 && (
                      <div className="space-y-1 border-t border-zinc-800/80 pt-2">
                        {profile.samples.slice(0, 3).map((sample) => (
                          <div
                            key={sample.id}
                            className="flex items-center justify-between text-[11px] text-zinc-400 font-mono"
                          >
                            <span className="truncate max-w-[180px]">
                              {sample.speaker_label || sample.source_type}
                            </span>
                            {sample.duration_seconds ? (
                              <span>{formatTime(sample.duration_seconds)}</span>
                            ) : (
                              <span>256d vec</span>
                            )}
                          </div>
                        ))}
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
