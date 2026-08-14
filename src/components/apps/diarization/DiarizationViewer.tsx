import React, { useState } from 'react';
import { Play, Pause, FastForward, Rewind, Download, Edit3, Settings, Check, X } from 'lucide-react';
import { DiarizationVideo } from '../DiarizationApp';

interface DiarizationSegment {
  id: string;
  speakerId: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
}

interface Speaker {
  id: string;
  name: string;
  color: string;
}



interface DiarizationViewerProps {
  video: DiarizationVideo;
  onClose?: () => void;
}

export const DiarizationViewer: React.FC<DiarizationViewerProps> = ({ video, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(15); // dummy time for visual demo
  const [speakers, setSpeakers] = useState<Speaker[]>(() => {
    if (video.result_json?.speakers) {
      const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-purple-500', 'bg-blue-500'];
      return video.result_json.speakers.map((id: string, index: number) => ({
        id,
        name: id === 'UNKNOWN' ? 'Desconhecido' : `Locutor ${index + 1}`,
        color: colors[index % colors.length]
      }));
    }
    return [];
  });
  
  const segments: DiarizationSegment[] = React.useMemo(() => {
    if (video.result_json?.segments) {
      return video.result_json.segments.map((seg: any, idx: number) => ({
        id: `seg-${idx}`,
        speakerId: seg.speaker,
        startTime: seg.start,
        endTime: seg.end,
        text: seg.text
      }));
    }
    return [];
  }, [video.result_json]);
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startEditSpeaker = (speaker: Speaker) => {
    setEditingSpeakerId(speaker.id);
    setEditName(speaker.name);
  };

  const saveSpeakerName = () => {
    if (editingSpeakerId && editName.trim()) {
      setSpeakers(prev => prev.map(s => s.id === editingSpeakerId ? { ...s, name: editName.trim() } : s));
    }
    setEditingSpeakerId(null);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/80 border-l border-zinc-800/80">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-zinc-800/80 bg-zinc-900/50">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-zinc-100">{video.title}</h2>
          <span className="text-sm text-zinc-400 mt-1">{video.channelName} • Diarização Concluída</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-300 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" /> Exportar
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              className="lg:hidden flex items-center justify-center p-2 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Transcript Area */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Audio Player (Mock) */}
          <div className="flex flex-col gap-3 p-6 border-b border-zinc-800/80 bg-zinc-900/30">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-transform active:scale-95"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
              </button>
              
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex justify-between text-xs font-mono text-zinc-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(video.result_json?.duration || 0)}</span>
                </div>
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden relative cursor-pointer">
                  <div className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full" style={{ width: '25%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Transcript List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {segments.map((segment) => {
              const speaker = speakers.find(s => s.id === segment.speakerId);
              const isActive = currentTime >= segment.startTime && currentTime <= segment.endTime;
              
              return (
                <div 
                  key={segment.id} 
                  className={`flex gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                    isActive 
                      ? 'bg-zinc-800/50 border-indigo-500/30 shadow-sm' 
                      : 'bg-zinc-900/20 border-transparent hover:bg-zinc-900/40'
                  }`}
                >
                  {/* Speaker Avatar / Badge */}
                  <div className="shrink-0 flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner ${speaker?.color || 'bg-zinc-600'}`}>
                      {speaker?.name.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-semibold text-sm text-zinc-200">{speaker?.name || segment.speakerId}</span>
                      <span className="text-[11px] font-mono text-zinc-500 bg-zinc-900/50 px-1.5 py-0.5 rounded">
                        {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                      </span>
                    </div>
                    <p className={`text-base leading-relaxed ${isActive ? 'text-zinc-100' : 'text-zinc-400'}`}>
                      {segment.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Speaker Management */}
        <div className="w-80 border-l border-zinc-800/80 bg-zinc-900/20 flex flex-col hidden xl:flex">
          <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between">
            <h3 className="font-bold text-zinc-200">Locutores</h3>
            <Settings className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="p-4 space-y-3 overflow-y-auto">
            {speakers.map(speaker => (
              <div key={speaker.id} className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 flex flex-col gap-2 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${speaker.color}`} />
                    <span className="text-[10px] font-mono text-zinc-500">{speaker.id}</span>
                  </div>
                  <button 
                    onClick={() => startEditSpeaker(speaker)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                {editingSpeakerId === speaker.id ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveSpeakerName()}
                      autoFocus
                      className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-200 outline-none focus:border-indigo-500"
                    />
                    <button onClick={saveSpeakerName} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg">
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="font-medium text-zinc-200 text-sm">{speaker.name}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
