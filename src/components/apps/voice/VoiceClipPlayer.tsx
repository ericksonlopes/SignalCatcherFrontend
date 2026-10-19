import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface VoiceClipPlayerProps {
  readonly src: string;
  readonly duration?: number | null;
  readonly title?: string;
  readonly compact?: boolean;
  readonly onEnded?: () => void;
}

export const VoiceClipPlayer: React.FC<VoiceClipPlayerProps> = ({
  src,
  duration: expectedDuration,
  title,
  compact = false,
  onEnded,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [actualDuration, setActualDuration] = useState(expectedDuration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.25 | 1.5>(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Reset state when audio source changes
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [src]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        setIsLoading(true);
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Failed to play audio clip:', err);
        setIsPlaying(false);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const toggleRate = () => {
    const nextRate: Record<number, 1 | 1.25 | 1.5> = {
      1: 1.25,
      1.25: 1.5,
      1.5: 1,
    };
    const rate = nextRate[playbackRate];
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatSec = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
  };

  const effectiveDuration = actualDuration || expectedDuration || 0;
  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/80 px-2 py-1 text-xs font-mono">
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
          onLoadedMetadata={() =>
            audioRef.current && setActualDuration(audioRef.current.duration || 0)
          }
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
            onEnded?.();
          }}
        />
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-sm"
          title={isPlaying ? 'Pausar' : 'Ouvir amostra'}
        >
          {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
        </button>
        <span className="text-[11px] text-zinc-300">
          {formatSec(currentTime)} / {formatSec(effectiveDuration)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/90 p-3 text-xs shadow-inner">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() =>
          audioRef.current && setActualDuration(audioRef.current.duration || 0)
        }
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          onEnded?.();
        }}
      />

      {title && (
        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
          <span className="truncate">{title}</span>
          <span className="font-mono text-zinc-500">
            {formatSec(currentTime)} / {formatSec(effectiveDuration)}
          </span>
        </div>
      )}

      {/* Progress & Waveform Simulation Bar */}
      <div className="relative flex items-center group">
        <input
          type="range"
          min={0}
          max={effectiveDuration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-2 transition-all"
        />
        <div
          className="absolute left-0 top-0 h-1.5 bg-indigo-500 rounded-lg pointer-events-none group-hover:h-2 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            disabled={isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 transition shadow"
            title={isPlaying ? 'Pausar (Espaço)' : 'Tocar (Espaço)'}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition"
            title="Reiniciar"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleRate}
            className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-300 hover:bg-zinc-800 transition border border-zinc-700/60"
            title="Velocidade de reprodução"
          >
            {playbackRate}x
          </button>
        </div>

        <div className="flex items-center gap-2 text-zinc-400">
          <span className="font-mono text-[11px] text-zinc-400">
            {formatSec(currentTime)} / {formatSec(effectiveDuration)}
          </span>
          <button
            type="button"
            onClick={toggleMute}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition"
            title={isMuted ? 'Ativar som' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5 text-rose-400" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
