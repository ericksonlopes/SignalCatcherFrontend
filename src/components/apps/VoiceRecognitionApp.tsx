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
  RotateCcw,
  Scissors,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { API_BASE_URL, apiFetch } from '../../api';
import type {
  IdentifyDiarizationResponse,
  LanguageMode,
  SpeakerProfile,
  SuggestedClip,
  VoiceRecognitionStats,
  VoiceSample,
} from '../../types';
import { getTranslation } from '../../locales';
import type { DiarizationVideo } from './DiarizationApp';
import { formatTime } from './diarization/transcript';
import { VoiceClipPlayer } from './voice/VoiceClipPlayer';
import { VoiceCurationQueue, type ReviewStatusFilter } from './voice/VoiceCurationQueue';
import { VoiceSuggestedClips } from './voice/VoiceSuggestedClips';

interface VoiceRecognitionAppProps {
  readonly language?: LanguageMode;
  readonly onAddLog: (
    app: string,
    level: 'info' | 'success' | 'warning' | 'error',
    message: string,
  ) => void;
}

export interface SpeechBlock {
  id: string;
  speaker: string;
  start: number;
  end: number;
  duration: number;
  text: string;
  rawSegmentIndices: number[];
}

function groupSpeakerTurns(
  segments?: Array<{
    speaker?: string;
    original_speaker?: string;
    start: number;
    end: number;
    text?: string;
  }>,
  targetSpeaker?: string
): SpeechBlock[] {
  if (!segments || !targetSpeaker) return [];
  const blocks: SpeechBlock[] = [];

  segments.forEach((seg, originalIdx) => {
    const spk = seg.speaker || seg.original_speaker || 'UNKNOWN';
    if (spk !== targetSpeaker && seg.original_speaker !== targetSpeaker) return;
    if (!Number.isFinite(seg.start) || !Number.isFinite(seg.end)) return;

    const start = Math.max(0, Number(seg.start));
    const end = Math.max(0, start, Number(seg.end));
    const text = (seg.text || '').trim();

    const last = blocks.at(-1);
    // Concatena falas contíguas do mesmo locutor (pausa natural até 2.5s)
    if (last && start >= last.end && start - last.end <= 2.5) {
      last.end = end;
      last.duration = Math.round((last.end - last.start) * 10) / 10;
      last.text = `${last.text} ${text}`.trim();
      last.rawSegmentIndices.push(originalIdx);
    } else {
      blocks.push({
        id: `block-${blocks.length}`,
        speaker: targetSpeaker,
        start,
        end,
        duration: Math.round((end - start) * 10) / 10,
        text,
        rawSegmentIndices: [originalIdx],
      });
    }
  });

  return blocks;
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

  // Main App Navigation Tab
  type MainTab = 'curation' | 'training' | 'profiles';
  const [mainTab, setMainTab] = useState<MainTab>('curation');

  // Voice Curation Review Queue State
  const [reviewSamples, setReviewSamples] = useState<VoiceSample[]>([]);
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatusFilter>('PENDING_REVIEW');
  const [isReviewLoading, setIsReviewLoading] = useState<boolean>(false);

  const [profiles, setProfiles] = useState<SpeakerProfile[]>([]);
  const [stats, setStats] = useState<VoiceRecognitionStats | null>(null);
  const [diarizations, setDiarizations] = useState<DiarizationVideo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchProfile, setSearchProfile] = useState<string>('');
  const [searchDiarizationText, setSearchDiarizationText] = useState<string>('');

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

  // Speech Blocks Selection Form
  const [selectedDiarizationId, setSelectedDiarizationId] = useState<string>('');
  const [selectedSpeakerLabel, setSelectedSpeakerLabel] = useState<string>('');
  const [targetSpeakerName, setTargetSpeakerName] = useState<string>('');
  const [selectedBlockIndices, setSelectedBlockIndices] = useState<number[]>([]);
  const [segmentStartTime, setSegmentStartTime] = useState<string>('');
  const [segmentEndTime, setSegmentEndTime] = useState<string>('');
  const [isEnrollingSegments, setIsEnrollingSegments] = useState<boolean>(false);

  // Audio Upload Form
  const [uploadSpeakerName, setUploadSpeakerName] = useState<string>('');
  const [isUploadingAudio, setIsUploadingAudio] = useState<boolean>(false);

  // Identification Panel
  const [identifyDiarizationId, setIdentifyDiarizationId] = useState<string>('');
  const [threshold, setThreshold] = useState<number>(0.65);
  const [isIdentifying, setIsIdentifying] = useState<boolean>(false);
  const [identifyResult, setIdentifyResult] = useState<IdentifyDiarizationResponse | null>(null);

  const fetchReviewQueue = useCallback(
    async (status: ReviewStatusFilter = reviewStatusFilter) => {
      setIsReviewLoading(true);
      try {
        const url =
          status === 'ALL'
            ? `${API_BASE_URL}/api/voice-recognition/samples/review-queue`
            : `${API_BASE_URL}/api/voice-recognition/samples/review-queue?status=${status}`;
        const res = await apiFetch(url);
        if (res.ok) {
          const data: VoiceSample[] = await res.json();
          setReviewSamples(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        onAddLog('VoiceRecognition', 'error', `Falha ao carregar fila de curadoria: ${String(err)}`);
      } finally {
        setIsReviewLoading(false);
      }
    },
    [reviewStatusFilter, onAddLog]
  );

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

  useEffect(() => {
    fetchReviewQueue(reviewStatusFilter);
  }, [fetchReviewQueue, reviewStatusFilter]);

  const handleReviewSample = async (
    sampleId: string,
    status: 'APPROVED' | 'REJECTED',
    startTime?: number,
    endTime?: number
  ) => {
    const body: Record<string, unknown> = { status };
    if (startTime !== undefined && endTime !== undefined) {
      body.start_time = startTime;
      body.end_time = endTime;
    }
    const res = await apiFetch(
      `${API_BASE_URL}/api/voice-recognition/samples/${encodeURIComponent(sampleId)}/review`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { detail?: string };
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    const actionLabel = status === 'APPROVED' ? 'aprovada' : 'rejeitada';
    onAddLog('VoiceRecognition', 'success', `Amostra ${actionLabel} com sucesso.`);
    await Promise.all([fetchReviewQueue(), fetchAllData()]);
  };

  const handleBulkReview = async (sampleIds: string[], action: 'APPROVE' | 'REJECT') => {
    const res = await apiFetch(`${API_BASE_URL}/api/voice-recognition/samples/review/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sample_ids: sampleIds, action }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { detail?: string };
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    const data = (await res.json()) as { updated_count?: number };
    const actionLabel = action === 'APPROVE' ? 'aprovadas' : 'rejeitadas';
    onAddLog(
      'VoiceRecognition',
      'success',
      `${data.updated_count || sampleIds.length} amostras ${actionLabel} em lote.`
    );
    await Promise.all([fetchReviewQueue(), fetchAllData()]);
  };

  const handleSelectSuggestedClip = (clip: SuggestedClip) => {
    setClipStartTime(formatTime(clip.start));
    setClipEndTime(formatTime(clip.end));
    setClipLabel(`Trecho ${formatTime(clip.start)}`);
    setTrainingMode('clip');
    onAddLog(
      'VoiceRecognition',
      'info',
      `Trecho sugerido aplicado aos campos de recorte: ${formatTime(clip.start)} - ${formatTime(
        clip.end
      )} (${clip.duration.toFixed(1)}s)`
    );
  };

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

  // Grouped and concatenated speech blocks for the selected speaker
  const speakerBlocks = useMemo(
    () => groupSpeakerTurns(selectedDiarization?.result_json?.segments, selectedSpeakerLabel),
    [selectedDiarization, selectedSpeakerLabel]
  );

  // Default to selecting only the first good block for this speaker initially
  useEffect(() => {
    if (speakerBlocks.length > 0) {
      const goodIndex = speakerBlocks.findIndex((b) => b.duration >= 2.0);
      const chosenIdx = goodIndex >= 0 ? goodIndex : 0;
      setSelectedBlockIndices([chosenIdx]);
      setSegmentStartTime(formatTime(speakerBlocks[chosenIdx].start));
      setSegmentEndTime(formatTime(speakerBlocks[chosenIdx].end));
    } else {
      setSelectedBlockIndices([]);
      setSegmentStartTime('');
      setSegmentEndTime('');
    }
  }, [speakerBlocks]);

  // Filtered diarizations for search
  const filteredDiarizations = useMemo(() => {
    const q = searchDiarizationText.trim().toLowerCase();
    if (!q) return diarizations;
    return diarizations.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.channelName || '').toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q)
    );
  }, [diarizations, searchDiarizationText]);

  // Debounced remote diarization search if user is querying
  useEffect(() => {
    const q = searchDiarizationText.trim();
    if (!q) return;
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(
          `${API_BASE_URL}/api/diarization/list?page=1&limit=50&step=COMPLETED&search=${encodeURIComponent(q)}`
        );
        if (res.ok) {
          const data = (await res.json()) as { items?: DiarizationVideo[] };
          if (Array.isArray(data.items) && data.items.length > 0) {
            setDiarizations((prev) => {
              const existingIds = new Set(prev.map((d) => d.id));
              const newItems = data.items!.filter((item) => !existingIds.has(item.id));
              return newItems.length > 0 ? [...prev, ...newItems] : prev;
            });
          }
        }
      } catch {
        // Silently keep local items
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchDiarizationText]);

  // Keep selection synced when searching
  useEffect(() => {
    if (!searchDiarizationText.trim() || filteredDiarizations.length === 0) return;
    const firstId = filteredDiarizations[0].id;
    if (!filteredDiarizations.some((d) => d.id === clipVideoId)) {
      setClipVideoId(firstId);
    }
    if (!filteredDiarizations.some((d) => d.id === selectedDiarizationId)) {
      setSelectedDiarizationId(firstId);
    }
    if (!filteredDiarizations.some((d) => d.id === identifyDiarizationId)) {
      setIdentifyDiarizationId(firstId);
    }
  }, [filteredDiarizations, searchDiarizationText, clipVideoId, selectedDiarizationId, identifyDiarizationId]);

  const filteredProfiles = useMemo(() => {
    const q = searchProfile.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
    );
  }, [profiles, searchProfile]);

  // Computed clip duration for Mode 1
  const clipStartSec = useMemo(() => parseTimeStringToSeconds(clipStartTime), [clipStartTime]);
  const clipEndSec = useMemo(() => parseTimeStringToSeconds(clipEndTime), [clipEndTime]);
  const clipDurationSec = useMemo(
    () => Math.max(0, clipEndSec - clipStartSec),
    [clipStartSec, clipEndSec]
  );

  // Computed time for Mode 2 (Speech Turns)
  const segStartSec = useMemo(() => parseTimeStringToSeconds(segmentStartTime), [segmentStartTime]);
  const segEndSec = useMemo(() => parseTimeStringToSeconds(segmentEndTime), [segmentEndTime]);
  const segDurationSec = useMemo(
    () => Math.max(0, Math.round((segEndSec - segStartSec) * 10) / 10),
    [segStartSec, segEndSec]
  );

  function handleFocusBlock(idx: number, start: number, end: number) {
    setSelectedBlockIndices([idx]);
    setSegmentStartTime(formatTime(start));
    setSegmentEndTime(formatTime(end));
  }

  function adjustStartTime(deltaSeconds: number) {
    const current = parseTimeStringToSeconds(segmentStartTime);
    const next = Math.max(0, Math.round((current + deltaSeconds) * 10) / 10);
    setSegmentStartTime(formatTime(next));
  }

  function adjustEndTime(deltaSeconds: number) {
    const current = parseTimeStringToSeconds(segmentEndTime);
    const next = Math.max(0, Math.round((current + deltaSeconds) * 10) / 10);
    setSegmentEndTime(formatTime(next));
  }

  function handleResetToCurrentBlock() {
    if (selectedBlockIndices.length > 0) {
      const idx = selectedBlockIndices[0];
      const block = speakerBlocks[idx];
      if (block) {
        setSegmentStartTime(formatTime(block.start));
        setSegmentEndTime(formatTime(block.end));
      }
    }
  }

  function toggleBlockIndex(idx: number) {
    setSelectedBlockIndices((prev) => {
      const next = prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx];
      if (next.length > 0) {
        const blocks = next.map((i) => speakerBlocks[i]).filter(Boolean);
        const minStart = Math.min(...blocks.map((b) => b.start));
        const maxEnd = Math.max(...blocks.map((b) => b.end));
        setSegmentStartTime(formatTime(minStart));
        setSegmentEndTime(formatTime(maxEnd));
      } else {
        setSegmentStartTime('');
        setSegmentEndTime('');
      }
      return next;
    });
  }

  function handleSelectAllBlocks() {
    if (speakerBlocks.length === 0) return;
    const all = speakerBlocks.map((_, i) => i);
    setSelectedBlockIndices(all);
    const minStart = Math.min(...speakerBlocks.map((b) => b.start));
    const maxEnd = Math.max(...speakerBlocks.map((b) => b.end));
    setSegmentStartTime(formatTime(minStart));
    setSegmentEndTime(formatTime(maxEnd));
  }

  function handleDeselectAllBlocks() {
    setSelectedBlockIndices([]);
    setSegmentStartTime('');
    setSegmentEndTime('');
  }

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
      !selectedBlockIndices.length ||
      isEnrollingSegments
    ) {
      return;
    }
    setIsEnrollingSegments(true);
    try {
      const rawIndices = selectedBlockIndices.flatMap(
        (i) => speakerBlocks[i]?.rawSegmentIndices || []
      );
      const uniqueRawIndices = Array.from(new Set(rawIndices));
      const payload: Record<string, unknown> = {
        diarization_id: selectedDiarizationId,
        speaker_label: selectedSpeakerLabel,
        speaker_name: targetSpeakerName.trim(),
        selected_segment_indices: uniqueRawIndices,
        apply_to_diarization: true,
      };
      if (segDurationSec >= 1 && segStartSec >= 0 && segEndSec > segStartSec) {
        payload.start_time = segStartSec;
        payload.end_time = segEndSec;
      }
      const res = await apiFetch(`${API_BASE_URL}/api/voice-recognition/enroll/from-diarization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const timeRangeText = segDurationSec >= 1 ? ` [${segmentStartTime} - ${segmentEndTime}]` : '';
      onAddLog(
        'VoiceRecognition',
        'success',
        `Modelo treinado para ${targetSpeakerName.trim()} (${selectedBlockIndices.length} blocos de fala)${timeRangeText}. Arquivo salvo em D:/voice_training/`
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

  const pendingCurationCount = useMemo(
    () => reviewSamples.filter((s) => s.status === 'PENDING_REVIEW').length,
    [reviewSamples]
  );

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
            onClick={() => {
              fetchAllData();
              fetchReviewQueue();
            }}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading || isReviewLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
        <button
          type="button"
          onClick={() => setMainTab('curation')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
            mainTab === 'curation'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
          }`}
        >
          <CheckSquare className="h-4 w-4" />
          <span>{t('voiceCurationTabTitle')}</span>
          {pendingCurationCount > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${
                mainTab === 'curation'
                  ? 'bg-amber-400 text-zinc-950 font-bold'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {pendingCurationCount} pendente{pendingCurationCount > 1 ? 's' : ''}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMainTab('training')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
            mainTab === 'training'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
          }`}
        >
          <Scissors className="h-4 w-4" />
          <span>{t('voiceTrainTabTitle')}</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('profiles')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
            mainTab === 'profiles'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>{t('voiceProfilesTitle')} & Identificação</span>
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${
              mainTab === 'profiles'
                ? 'bg-indigo-800 text-indigo-100'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {profiles.length}
          </span>
        </button>
      </div>

      {/* TAB 1: CURATION REVIEW QUEUE */}
      {mainTab === 'curation' && (
        <VoiceCurationQueue
          samples={reviewSamples}
          isLoading={isReviewLoading}
          statusFilter={reviewStatusFilter}
          onStatusFilterChange={(st) => {
            setReviewStatusFilter(st);
            fetchReviewQueue(st);
          }}
          onReviewSample={handleReviewSample}
          onBulkReview={handleBulkReview}
          onRefresh={() => fetchReviewQueue(reviewStatusFilter)}
          language={language}
        />
      )}

      {/* TAB 2: TRAINING CENTER */}
      {mainTab === 'training' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Left Column: Training by Video Clips / Speech Turns (7 cols) */}
          <div className="space-y-6 xl:col-span-7">
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

            {/* Diarization Search Bar */}
            <div className="space-y-1.5 pb-1">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchDiarizationText}
                  onChange={(e) => setSearchDiarizationText(e.target.value)}
                  placeholder={t('voiceSearchDiarizationPlaceholder')}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-8 pr-7 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500"
                />
                {searchDiarizationText && (
                  <button
                    type="button"
                    onClick={() => setSearchDiarizationText('')}
                    title={t('voiceSearchDiarizationClear')}
                    className="absolute right-2 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {searchDiarizationText && (
                <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
                  <span>
                    {filteredDiarizations.length} {t('voiceSearchDiarizationCount')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchDiarizationText('')}
                    className="text-indigo-400 hover:underline"
                  >
                    {t('voiceSearchDiarizationClear')}
                  </button>
                </div>
              )}
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
                    {filteredDiarizations.length === 0 ? (
                      <option value="" disabled>
                        {t('voiceNoDiarizationsFoundForSearch')}
                      </option>
                    ) : (
                      filteredDiarizations.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} ({d.channelName})
                        </option>
                      ))
                    )}
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
                    {filteredDiarizations.length === 0 ? (
                      <option value="" disabled>
                        {t('voiceNoDiarizationsFoundForSearch')}
                      </option>
                    ) : (
                      filteredDiarizations.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} ({d.channelName})
                        </option>
                      ))
                    )}
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

                {/* Speech Blocks Selection Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="text-zinc-400 font-medium">
                      {t('voiceTrainSelectBlocksHint')}
                    </span>
                    <div className="flex gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={handleSelectAllBlocks}
                        className="text-indigo-400 hover:underline"
                      >
                        {t('voiceTrainSelectAll')}
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllBlocks}
                        className="text-zinc-500 hover:underline"
                      >
                        {t('voiceTrainDeselectAll')}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs">
                    {speakerBlocks.length === 0 ? (
                      <div className="py-6 text-center text-zinc-500 text-xs">
                        Nenhum bloco de fala encontrado para este locutor.
                      </div>
                    ) : (
                      speakerBlocks.map((block, idx) => {
                        const isChecked = selectedBlockIndices.includes(idx);
                        const isFocused =
                          selectedBlockIndices.length === 1 && selectedBlockIndices[0] === idx;
                        return (
                          <div
                            key={block.id}
                            onClick={() => handleFocusBlock(idx, block.start, block.end)}
                            className={`flex flex-col gap-1.5 p-2 rounded-lg cursor-pointer transition border ${
                              isFocused
                                ? 'bg-indigo-950/60 border-indigo-500 text-zinc-100 shadow-sm shadow-indigo-950/40'
                                : isChecked
                                ? 'bg-indigo-950/30 border-indigo-900/50 text-zinc-200'
                                : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="mt-0.5 text-indigo-400"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleBlockIndex(idx);
                                  }}
                                >
                                  {isChecked ? (
                                    <CheckSquare className="h-4 w-4" />
                                  ) : (
                                    <Square className="h-4 w-4 text-zinc-600" />
                                  )}
                                </span>
                                <span className="font-mono text-[11px] font-semibold text-zinc-300">
                                  [{formatTime(block.start)} – {formatTime(block.end)}]
                                </span>
                                <span
                                  className={`rounded px-1.5 py-0.2 font-mono text-[10px] ${
                                    block.duration >= 3 && block.duration <= 60
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-zinc-800 text-zinc-400'
                                  }`}
                                >
                                  {block.duration}s
                                </span>
                                {block.rawSegmentIndices.length > 1 && (
                                  <span className="rounded bg-indigo-500/10 px-1.5 py-0.2 text-[10px] text-indigo-400 font-mono">
                                    {block.rawSegmentIndices.length} {t('voiceTrainGroupedPhrases')}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFocusBlock(idx, block.start, block.end);
                                }}
                                title={t('voiceTrainUseThisTurnTime')}
                                className="shrink-0 rounded px-2 py-0.5 text-[11px] font-medium text-indigo-300 bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-700/50 transition flex items-center gap-1"
                              >
                                <Clock className="h-3 w-3" />
                                <span>{t('voiceTrainUseThisTurnTime')}</span>
                              </button>
                            </div>
                            <div className="text-[11px] leading-relaxed text-zinc-300 line-clamp-3 pl-6">
                              {block.text || '...'}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1 flex justify-between items-center">
                    <span>
                      {selectedBlockIndices.length} de {speakerBlocks.length}{' '}
                      {t('voiceTrainSelectedBlocks')}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {t('voiceTrainClickToFocusTurn')}
                    </span>
                  </div>
                </div>

                {/* Custom Time Range for Speech Turns */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{t('voiceTrainCustomClipRangeTitle')}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetToCurrentBlock}
                        title={t('voiceTrainResetOriginal')}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-[10px] border border-zinc-800 hover:border-zinc-700 transition"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>{t('voiceTrainResetOriginal')}</span>
                      </button>
                      <span
                        className={`font-mono font-semibold text-[11px] px-2 py-0.5 rounded ${
                          segDurationSec >= 3 && segDurationSec <= 60
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {segDurationSec}s ({formatTime(segDurationSec)})
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Start Time with Stepper Controls */}
                    <div className="space-y-1">
                      <label className="block text-[11px] text-zinc-400">
                        {t('voiceTrainStartTime')}
                      </label>
                      <div className="flex items-center gap-1">
                        <div className="relative flex-1 flex items-center">
                          <Clock className="absolute left-2 h-3.5 w-3.5 text-zinc-500" />
                          <input
                            type="text"
                            value={segmentStartTime}
                            onChange={(e) => setSegmentStartTime(e.target.value)}
                            placeholder="00:15"
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-7 pr-2 py-1.5 font-mono text-xs text-zinc-100 outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="flex gap-0.5">
                          <button
                            type="button"
                            onClick={() => adjustStartTime(-1)}
                            title="Começar 1s mais cedo"
                            className="px-1.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono text-zinc-300"
                          >
                            -1s
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustStartTime(1)}
                            title="Começar 1s mais tarde"
                            className="px-1.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono text-zinc-300"
                          >
                            +1s
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* End Time with Stepper Controls */}
                    <div className="space-y-1">
                      <label className="block text-[11px] text-zinc-400">
                        {t('voiceTrainEndTime')}
                      </label>
                      <div className="flex items-center gap-1">
                        <div className="relative flex-1 flex items-center">
                          <Clock className="absolute left-2 h-3.5 w-3.5 text-zinc-500" />
                          <input
                            type="text"
                            value={segmentEndTime}
                            onChange={(e) => setSegmentEndTime(e.target.value)}
                            placeholder="00:45"
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-7 pr-2 py-1.5 font-mono text-xs text-zinc-100 outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="flex gap-0.5">
                          <button
                            type="button"
                            onClick={() => adjustEndTime(-1)}
                            title="Terminar 1s mais cedo"
                            className="px-1.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono text-zinc-300"
                          >
                            -1s
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustEndTime(1)}
                            title="Terminar 1s mais tarde"
                            className="px-1.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono text-zinc-300"
                          >
                            +1s
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/60">
                    <div className="flex items-center gap-1.5">
                      <Folder className="h-3 w-3 text-cyan-400" />
                      <span>{t('voiceTrainFolderNotice')}</span>
                    </div>
                    <span>{t('voiceTrainIdealDuration')}</span>
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
                    !selectedBlockIndices.length ||
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
        </div>

        {/* Right Column: Suggested Clips & Training Guidelines (5 cols) */}
        <div className="space-y-6 xl:col-span-5">
            {selectedDiarizationId && selectedSpeakerLabel && (
              <VoiceSuggestedClips
                diarizationId={trainingMode === 'clip' ? clipVideoId : selectedDiarizationId}
                speakerLabel={selectedSpeakerLabel}
                onSelectClip={handleSelectSuggestedClip}
                language={language}
              />
            )}

            {/* Training Guidelines Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-3 text-xs text-zinc-400">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span>Como funciona o Treinamento de Voz</span>
              </h3>
              <p className="leading-relaxed">
                1. <strong>Recorte Limpo:</strong> Escolha trechos de fala isolada (sem risadas intensas, música de fundo alta ou sobreposição de outras vozes).
              </p>
              <p className="leading-relaxed">
                2. <strong>Fila de Curadoria:</strong> Toda amostra criada entra inicialmente como{' '}
                <span className="font-mono text-amber-300">Aguardando Revisão</span> para que você possa escutá-la e aprová-la antes de integrar o modelo definitivo.
              </p>
              <p className="leading-relaxed">
                3. <strong>Extração Neural:</strong> Utilizamos a rede deep learning{' '}
                <span className="font-mono text-indigo-300">Pyannote/WeSpeaker ResNet-34</span> para extrair vetores biométricos normalizados de 256 dimensões.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROFILES DIRECTORY & IDENTIFICATION */}
      {mainTab === 'profiles' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Left Column: Automatic Speaker Identification on a Diarization (5 cols) */}
          <div className="space-y-6 xl:col-span-5">
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
                  {filteredDiarizations.length === 0 ? (
                    <option value="" disabled>
                      {t('voiceNoDiarizationsFoundForSearch')}
                    </option>
                  ) : (
                    filteredDiarizations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.channelName})
                      </option>
                    ))
                  )}
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
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-zinc-100 text-sm">{p.name}</span>

                          {/* Samples count */}
                          <span className="rounded bg-indigo-500/10 px-2 py-0.5 font-mono text-[11px] text-indigo-400 border border-indigo-500/30">
                            {p.samples_count} {p.samples_count === 1 ? 'amostra aprovada' : 'amostras aprovadas'}
                          </span>

                          {/* Pending count badge */}
                          {typeof p.pending_count === 'number' && p.pending_count > 0 && (
                            <span className="rounded bg-amber-500/15 px-2 py-0.5 font-mono text-[11px] text-amber-300 border border-amber-500/30">
                              {p.pending_count} pendente{p.pending_count > 1 ? 's' : ''}
                            </span>
                          )}

                          {/* Profile Strength Badge */}
                          {p.profile_strength === 'strong' && (
                            <span
                              className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-400 border border-emerald-500/30"
                              title={t('voiceCurationStrengthStrong')}
                            >
                              <ShieldCheck className="h-3 w-3" />
                              <span>Forte</span>
                            </span>
                          )}
                          {p.profile_strength === 'moderate' && (
                            <span
                              className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] text-amber-400 border border-amber-500/30"
                              title={t('voiceCurationStrengthModerate')}
                            >
                              <ShieldAlert className="h-3 w-3" />
                              <span>Médio</span>
                            </span>
                          )}
                          {(p.profile_strength === 'weak' || !p.profile_strength) && (
                            <span
                              className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-400 border border-zinc-700"
                              title={t('voiceCurationStrengthWeak')}
                            >
                              <ShieldAlert className="h-3 w-3" />
                              <span>Fraco</span>
                            </span>
                          )}
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

                    {/* Samples list preview with player and status badges */}
                    {p.samples && p.samples.length > 0 && (
                      <div className="space-y-2 border-t border-zinc-800/60 pt-2.5">
                        <div className="text-[11px] font-medium text-zinc-400">
                          Amostras cadastradas:
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {p.samples.map((s) => {
                            const isClip = s.source_type === 'YOUTUBE_CLIP';
                            const audioUrl =
                              s.has_audio !== false
                                ? `${API_BASE_URL}/api/voice-recognition/samples/${s.id}/audio`
                                : '';

                            return (
                              <div
                                key={s.id}
                                className="flex flex-col gap-1.5 rounded-lg bg-zinc-900/60 p-2 text-[11px] font-mono text-zinc-400 border border-zinc-800/50"
                              >
                                <div className="flex items-center justify-between">
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

                                  {/* Status Badge */}
                                  {s.status === 'APPROVED' && (
                                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400 border border-emerald-500/20">
                                      Aprovada
                                    </span>
                                  )}
                                  {s.status === 'PENDING_REVIEW' && (
                                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400 border border-amber-500/20">
                                      Pendente
                                    </span>
                                  )}
                                  {s.status === 'REJECTED' && (
                                    <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-400 border border-rose-500/20">
                                      Rejeitada
                                    </span>
                                  )}
                                </div>

                                {audioUrl && (
                                  <VoiceClipPlayer
                                    src={audioUrl}
                                    duration={s.duration_seconds}
                                    compact={true}
                                    title={s.speaker_label || p.name}
                                  />
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
      )}
    </div>
  );
};
