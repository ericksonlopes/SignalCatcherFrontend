import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Flame,
  Loader2,
  Play,
  Scissors,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { API_BASE_URL, apiFetch } from '../../../api';
import type { LanguageMode, SuggestedClip } from '../../../types';
import { getTranslation } from '../../../locales';
import { VoiceClipPlayer } from './VoiceClipPlayer';
import { formatTime } from '../diarization/transcript';

interface VoiceSuggestedClipsProps {
  readonly diarizationId: string;
  readonly speakerLabel: string;
  readonly onSelectClip: (clip: SuggestedClip) => void;
  readonly language?: LanguageMode;
}

export const VoiceSuggestedClips: React.FC<VoiceSuggestedClipsProps> = ({
  diarizationId,
  speakerLabel,
  onSelectClip,
  language = 'pt',
}) => {
  const { t } = getTranslation(language);

  const [clips, setClips] = useState<SuggestedClip[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!diarizationId || !speakerLabel) {
      setClips([]);
      return;
    }

    let isMounted = true;
    const fetchSuggestedClips = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await apiFetch(
          `${API_BASE_URL}/api/voice-recognition/diarization/${encodeURIComponent(
            diarizationId,
          )}/speakers/${encodeURIComponent(speakerLabel)}/suggested-clips`,
        );
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { detail?: string };
          throw new Error(err.detail || `HTTP ${res.status}`);
        }
        const data: SuggestedClip[] = await res.json();
        if (isMounted) {
          setClips(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(String(err));
          setClips([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSuggestedClips();

    return () => {
      isMounted = false;
    };
  }, [diarizationId, speakerLabel]);

  if (!diarizationId || !speakerLabel) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-zinc-950/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <h4 className="text-xs font-semibold text-zinc-100">
            {t('voiceCurationSuggestedClips')} ({speakerLabel})
          </h4>
        </div>
        <span className="text-[11px] text-zinc-400 font-mono">
          Top {clips.length} trechos limpos
        </span>
      </div>

      <p className="text-[11px] text-zinc-400 leading-normal">
        {t('voiceCurationSuggestedClipsDesc')}
      </p>

      {isLoading && (
        <div className="flex items-center justify-center py-6 text-zinc-400 gap-2 text-xs">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
          <span>Buscando melhores falas do locutor...</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-950/30 border border-rose-800/40 p-2.5 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="truncate">{errorMessage}</span>
        </div>
      )}

      {!isLoading && !errorMessage && clips.length === 0 && (
        <div className="py-4 text-center text-xs text-zinc-500">
          Nenhum trecho de boa qualidade sugerido para {speakerLabel}.
        </div>
      )}

      {!isLoading && clips.length > 0 && (
        <div className="space-y-2.5">
          {clips.map((clip, index) => {
            const previewUrl = `${API_BASE_URL}/api/voice-recognition/preview?video_id=${encodeURIComponent(
              diarizationId,
            )}&start_time=${clip.start}&end_time=${clip.end}`;

            return (
              <div
                key={`${clip.start}-${clip.end}-${index}`}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2 hover:border-zinc-700 transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-zinc-300 font-semibold">
                      {formatTime(clip.start)} – {formatTime(clip.end)}
                    </span>
                    <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[10px] text-indigo-300 border border-indigo-500/20">
                      {clip.duration.toFixed(1)}s
                    </span>

                    {clip.quality_hint === 'good' && (
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Flame className="h-2.5 w-2.5" />
                        Ideal
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectClip(clip)}
                    className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-500 transition"
                  >
                    <Scissors className="h-3 w-3" />
                    <span>Usar para Treinar</span>
                  </button>
                </div>

                {clip.text && (
                  <p className="text-xs text-zinc-300 italic line-clamp-2 leading-relaxed">
                    &ldquo;{clip.text}&rdquo;
                  </p>
                )}

                <div className="pt-1">
                  <VoiceClipPlayer
                    src={previewUrl}
                    duration={clip.duration}
                    compact={true}
                    title={`Trecho ${index + 1} (${clip.duration.toFixed(1)}s)`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
