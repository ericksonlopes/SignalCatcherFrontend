import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCheck,
  CheckSquare,
  Clock,
  Cpu,
  Filter,
  Flame,
  Layers,
  Loader2,
  Mic,
  RotateCcw,
  Scissors,
  Search,
  Sliders,
  Square,
  Volume2,
  X,
  XCircle,
} from 'lucide-react';
import { API_BASE_URL } from '../../../api';
import type { LanguageMode, VoiceSample } from '../../../types';
import { getTranslation } from '../../../locales';
import { VoiceClipPlayer } from './VoiceClipPlayer';
import { formatTime } from '../diarization/transcript';

export type ReviewStatusFilter = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ALL';

interface VoiceCurationQueueProps {
  readonly samples: VoiceSample[];
  readonly isLoading: boolean;
  readonly statusFilter: ReviewStatusFilter;
  readonly onStatusFilterChange: (status: ReviewStatusFilter) => void;
  readonly onReviewSample: (
    sampleId: string,
    status: 'APPROVED' | 'REJECTED',
    startTime?: number,
    endTime?: number,
  ) => Promise<void>;
  readonly onBulkReview: (sampleIds: string[], action: 'APPROVE' | 'REJECT') => Promise<void>;
  readonly onRefresh: () => void;
  readonly language?: LanguageMode;
}

export const VoiceCurationQueue: React.FC<VoiceCurationQueueProps> = ({
  samples,
  isLoading,
  statusFilter,
  onStatusFilterChange,
  onReviewSample,
  onBulkReview,
  onRefresh,
  language = 'pt',
}) => {
  const { t } = getTranslation(language);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedSampleId, setFocusedSampleId] = useState<string | null>(null);

  // Crop Adjustment State
  const [adjustingSampleId, setAdjustingSampleId] = useState<string | null>(null);
  const [adjustedStart, setAdjustedStart] = useState<number>(0);
  const [adjustedEnd, setAdjustedEnd] = useState<number>(0);
  const [isSavingReview, setIsSavingReview] = useState<boolean>(false);

  // Filtered samples by search term
  const filteredSamples = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return samples;
    return samples.filter((s) => {
      const name = (s.metadata?.speaker_name as string) || s.speaker_label || '';
      const text = (s.metadata?.text as string) || '';
      const source = s.source_id || '';
      return (
        name.toLowerCase().includes(q) ||
        text.toLowerCase().includes(q) ||
        source.toLowerCase().includes(q)
      );
    });
  }, [samples, searchTerm]);

  // Set first sample focused by default
  useEffect(() => {
    if (filteredSamples.length > 0 && !focusedSampleId) {
      setFocusedSampleId(filteredSamples[0].id);
    }
  }, [filteredSamples, focusedSampleId]);

  // Handle hotkeys (A = approve, R = reject, Space = handled by active player if any)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger hotkeys if typing in input
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      if (!focusedSampleId) return;
      const sample = samples.find((s) => s.id === focusedSampleId);
      if (!sample || isSavingReview) return;

      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleApprove(sample);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReject(sample);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedSampleId, samples, isSavingReview]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredSamples.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSamples.map((s) => s.id));
    }
  };

  const handleApprove = async (sample: VoiceSample) => {
    try {
      setIsSavingReview(true);
      if (adjustingSampleId === sample.id) {
        await onReviewSample(sample.id, 'APPROVED', adjustedStart, adjustedEnd);
        setAdjustingSampleId(null);
      } else {
        await onReviewSample(sample.id, 'APPROVED');
      }
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleReject = async (sample: VoiceSample) => {
    try {
      setIsSavingReview(true);
      await onReviewSample(sample.id, 'REJECTED');
      if (adjustingSampleId === sample.id) {
        setAdjustingSampleId(null);
      }
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleStartAdjust = (sample: VoiceSample) => {
    if (adjustingSampleId === sample.id) {
      setAdjustingSampleId(null);
    } else {
      setAdjustingSampleId(sample.id);
      setAdjustedStart(sample.start_time ?? 0);
      setAdjustedEnd(
        sample.end_time ?? (sample.start_time ?? 0) + (sample.duration_seconds ?? 5),
      );
    }
  };

  const handleExecuteBulk = async (action: 'APPROVE' | 'REJECT') => {
    if (selectedIds.length === 0 || isSavingReview) return;
    try {
      setIsSavingReview(true);
      await onBulkReview(selectedIds, action);
      setSelectedIds([]);
    } finally {
      setIsSavingReview(false);
    }
  };

  const pendingCount = useMemo(
    () => samples.filter((s) => s.status === 'PENDING_REVIEW').length,
    [samples],
  );

  return (
    <div className="space-y-4">
      {/* Curation Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onStatusFilterChange('PENDING_REVIEW')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === 'PENDING_REVIEW'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <span>{t('voiceCurationReviewQueue')}</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-500/30 px-1.5 py-0.2 font-mono text-[10px] text-amber-200">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange('APPROVED')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <span>{t('voiceCurationApproved')}</span>
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange('REJECTED')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <X className="h-3.5 w-3.5 text-rose-400" />
            <span>Rejeitadas</span>
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange('ALL')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <span>Todas</span>
          </button>
        </div>

        {/* Search & Bulk Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-44">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por locutor..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-1.5 pl-8 pr-3 text-xs text-zinc-200 outline-none focus:border-indigo-500"
            />
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
              <span className="text-[11px] font-mono text-zinc-400 mr-1">
                {selectedIds.length} sel.
              </span>
              <button
                type="button"
                onClick={() => handleExecuteBulk('APPROVE')}
                disabled={isSavingReview}
                className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                <Check className="h-3 w-3" />
                <span>{t('voiceCurationBulkApprove')}</span>
              </button>
              <button
                type="button"
                onClick={() => handleExecuteBulk('REJECT')}
                disabled={isSavingReview}
                className="flex items-center gap-1 rounded bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-500 disabled:opacity-40"
              >
                <X className="h-3 w-3" />
                <span>{t('voiceCurationBulkReject')}</span>
              </button>
            </div>
          )}

          <div className="hidden lg:flex items-center gap-1 text-[11px] text-zinc-500 font-mono px-2 py-1 rounded bg-zinc-950 border border-zinc-800/80">
            <span>Atalhos:</span>
            <kbd className="rounded bg-zinc-800 px-1 text-zinc-300">A</kbd>
            <span>Aprovar</span>
            <kbd className="rounded bg-zinc-800 px-1 text-zinc-300">R</kbd>
            <span>Rejeitar</span>
          </div>
        </div>
      </div>

      {/* Select All Checkbar */}
      {filteredSamples.length > 0 && (
        <div className="flex items-center justify-between px-2 text-xs text-zinc-400">
          <button
            type="button"
            onClick={handleSelectAll}
            className="flex items-center gap-1.5 hover:text-zinc-200"
          >
            {selectedIds.length === filteredSamples.length ? (
              <CheckSquare className="h-4 w-4 text-indigo-400" />
            ) : (
              <Square className="h-4 w-4 text-zinc-600" />
            )}
            <span>
              {selectedIds.length === filteredSamples.length
                ? 'Desmarcar todas'
                : `Selecionar todas (${filteredSamples.length})`}
            </span>
          </button>
          <span>{filteredSamples.length} amostras na visualização</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 text-zinc-400 gap-2 text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
          <span>Carregando fila de curadoria...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredSamples.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 py-16 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400">
            <Mic className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">
              {statusFilter === 'PENDING_REVIEW'
                ? 'Nenhuma amostra aguardando revisão'
                : 'Nenhuma amostra encontrada'}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mt-1">
              {statusFilter === 'PENDING_REVIEW'
                ? 'Você pode criar novos recortes a partir de vídeos diarizados na aba de Treinamento.'
                : 'Tente alterar os filtros de status ou a busca por locutor.'}
            </p>
          </div>
        </div>
      )}

      {/* Samples List */}
      {!isLoading && filteredSamples.length > 0 && (
        <div className="space-y-3">
          {filteredSamples.map((sample) => {
            const isSelected = selectedIds.includes(sample.id);
            const isFocused = focusedSampleId === sample.id;
            const isAdjusting = adjustingSampleId === sample.id;
            const speakerName =
              (sample.metadata?.speaker_name as string) ||
              sample.speaker_label ||
              'Locutor Sem Nome';
            const sampleText = (sample.metadata?.text as string) || null;
            const qualityData = sample.quality || {};
            const speechRatio = typeof qualityData.speech_ratio === 'number' ? qualityData.speech_ratio : null;
            const speechSec = typeof qualityData.speech_seconds === 'number' ? qualityData.speech_seconds : null;
            const hasModelNeural = sample.embedding_model?.includes('wespeaker');

            // Audio endpoint
            const audioSrc = sample.has_audio !== false
              ? `${API_BASE_URL}/api/voice-recognition/samples/${sample.id}/audio`
              : '';

            return (
              <div
                key={sample.id}
                onClick={() => setFocusedSampleId(sample.id)}
                className={`rounded-2xl border transition p-4 space-y-3 ${
                  isFocused
                    ? 'border-indigo-500/80 bg-zinc-900/80 shadow-md shadow-indigo-950/20'
                    : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(sample.id);
                      }}
                      className="text-zinc-400 hover:text-zinc-200"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-indigo-400" />
                      ) : (
                        <Square className="h-4 w-4 text-zinc-600" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-100 text-sm">
                          {speakerName}
                        </span>
                        {sample.speaker_label && (
                          <span className="font-mono text-xs text-zinc-400">
                            ({sample.speaker_label})
                          </span>
                        )}

                        {/* Status Badge */}
                        {sample.status === 'PENDING_REVIEW' && (
                          <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                            {t('voiceCurationPendingBadge')}
                          </span>
                        )}
                        {sample.status === 'APPROVED' && (
                          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-300 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Aprovada
                          </span>
                        )}
                        {sample.status === 'REJECTED' && (
                          <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-mono text-rose-300 flex items-center gap-1">
                            <X className="h-3 w-3" />
                            Rejeitada
                          </span>
                        )}
                      </div>

                      {/* Source & Timings */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                        <span>{sample.source_type}</span>
                        {sample.start_time !== null && sample.start_time !== undefined && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span>
                              {formatTime(sample.start_time)} –{' '}
                              {formatTime(sample.end_time ?? sample.start_time)}
                            </span>
                          </>
                        )}
                        {typeof sample.duration_seconds === 'number' && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="text-zinc-300 font-semibold">
                              {sample.duration_seconds.toFixed(1)}s
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quality & Model Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {speechRatio !== null && (
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[11px] border ${
                          speechRatio >= 0.7
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                        title="Densidade de fala útil no trecho (VAD)"
                      >
                        VAD {Math.round(speechRatio * 100)}%
                      </span>
                    )}

                    {speechSec !== null && (
                      <span className="rounded bg-zinc-800/80 px-2 py-0.5 font-mono text-[11px] text-zinc-300 border border-zinc-700/50">
                        {speechSec.toFixed(1)}s fala
                      </span>
                    )}

                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[10px] border flex items-center gap-1 ${
                        hasModelNeural
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      <Cpu className="h-2.5 w-2.5" />
                      <span>{hasModelNeural ? 'Neural ResNet-34' : 'Espectral'}</span>
                    </span>
                  </div>
                </div>

                {/* Transcription Text if present */}
                {sampleText && (
                  <p className="rounded-lg bg-zinc-950/70 border border-zinc-800/60 p-2.5 text-xs text-zinc-300 italic leading-relaxed">
                    &ldquo;{sampleText}&rdquo;
                  </p>
                )}

                {/* Audio Player */}
                {audioSrc ? (
                  <div className="pt-1">
                    <VoiceClipPlayer
                      src={audioSrc}
                      duration={sample.duration_seconds}
                      title={`${speakerName} · ${sample.duration_seconds?.toFixed(1) ?? ''}s`}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-amber-400/80 bg-amber-950/20 border border-amber-800/30 px-3 py-2 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span>Áudio WAV não disponível em disco para este registro legado.</span>
                  </div>
                )}

                {/* Crop Adjustment Inline Panel */}
                {isAdjusting && (
                  <div className="rounded-xl border border-indigo-500/40 bg-zinc-950 p-3 space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-indigo-300">
                      <span className="flex items-center gap-1.5">
                        <Scissors className="h-3.5 w-3.5" />
                        <span>Ajustar Minutagem do Trecho</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setAdjustingSampleId(null)}
                        className="text-zinc-500 hover:text-zinc-300"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">
                          Início: {formatTime(adjustedStart)} ({adjustedStart.toFixed(1)}s)
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setAdjustedStart((prev) => Math.max(0, Math.round((prev - 1) * 10) / 10))}
                            className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700"
                          >
                            -1s
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdjustedStart((prev) => Math.max(0, Math.round((prev - 0.5) * 10) / 10))}
                            className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700"
                          >
                            -0.5s
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdjustedStart((prev) => Math.round((prev + 0.5) * 10) / 10)}
                            className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700"
                          >
                            +0.5s
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdjustedStart((prev) => Math.round((prev + 1) * 10) / 10)}
                            className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700"
                          >
                            +1s
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">
                          Fim: {formatTime(adjustedEnd)} ({adjustedEnd.toFixed(1)}s)
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setAdjustedEnd((prev) => Math.max(adjustedStart + 1, Math.round((prev - 1) * 10) / 10))}
                            className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700"
                          >
                            -1s
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdjustedEnd((prev) => Math.max(adjustedStart + 1, Math.round((prev - 0.5) * 10) / 10))}
                            className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700"
                          >
                            -0.5s
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdjustedEnd((prev) => Math.round((prev + 0.5) * 10) / 10)}
                            className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700"
                          >
                            +0.5s
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdjustedEnd((prev) => Math.round((prev + 1) * 10) / 10)}
                            className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700"
                          >
                            +1s
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Preview adjusted audio player */}
                    {sample.source_id && (
                      <div className="border-t border-zinc-800 pt-2">
                        <div className="text-[11px] text-zinc-400 mb-1">
                          Prévia do áudio com novos limites:
                        </div>
                        <VoiceClipPlayer
                          src={`${API_BASE_URL}/api/voice-recognition/preview?video_id=${sample.source_id}&start_time=${adjustedStart}&end_time=${adjustedEnd}`}
                          duration={adjustedEnd - adjustedStart}
                          title={`Prévia (${(adjustedEnd - adjustedStart).toFixed(1)}s)`}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Actions row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/60 pt-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartAdjust(sample)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        isAdjusting
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                          : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <Scissors className="h-3.5 w-3.5" />
                      <span>{isAdjusting ? 'Fechar Ajuste' : t('voiceCurationAdjustCrop')}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSavingReview}
                      onClick={() => handleReject(sample)}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-40"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>{t('voiceCurationRejectBtn')}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSavingReview}
                      onClick={() => handleApprove(sample)}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 shadow-sm"
                    >
                      {isSavingReview && focusedSampleId === sample.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {isAdjusting ? 'Salvar e Aprovar Recorte' : t('voiceCurationApproveBtn')}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
