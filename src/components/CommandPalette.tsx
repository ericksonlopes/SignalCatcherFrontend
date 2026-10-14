import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Radio, 
  Mic,
  Play, 
  Tv
} from 'lucide-react';
import { CapturedVideo, ContentSource, ApiEndpoint, AppId } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  captures: CapturedVideo[];
  sources: ContentSource[];
  endpoints: ApiEndpoint[];
  onSelectApp: (appId: AppId, customTitle?: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  captures,
  sources,
  endpoints,
  onSelectApp
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          setQuery('');
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const searchQuery = query.toLowerCase();

  const filteredCaptures = captures.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery) ||
      c.sourceName.toLowerCase().includes(searchQuery) ||
      c.tags.some((t) => t.toLowerCase().includes(searchQuery))
  );

  const filteredSources = sources.filter((s) =>
    s.name.toLowerCase().includes(searchQuery) ||
    s.url.toLowerCase().includes(searchQuery)
  );

  const filteredEndpoints = endpoints.filter(
    (e) =>
      e.path.toLowerCase().includes(searchQuery) ||
      e.description.toLowerCase().includes(searchQuery)
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-16 px-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl shadow-indigo-950/80 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-slate-800 flex items-center gap-3 bg-slate-950/60">
          <Search className="w-5 h-5 text-indigo-400 shrink-0 animate-pulse" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite para buscar vídeos, canais ou endpoints..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none font-mono"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-3 overflow-y-auto space-y-4 flex-1 text-xs font-mono">
          {/* Quick App Shortcut Switches */}
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 px-2">
              Aplicações
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onSelectApp('signalcatcher', 'SignalCatcher Ingestor');
                  onClose();
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 hover:bg-indigo-950/60 border border-slate-700/60 hover:border-indigo-500/50 text-slate-200 transition-all text-left"
              >
                <Radio className="w-4 h-4 text-indigo-400" />
                <span className="truncate font-medium">SignalCatcher (YouTube)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectApp('diarization', 'Diarização');
                  onClose();
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 hover:bg-indigo-950/60 border border-slate-700/60 hover:border-indigo-500/50 text-slate-200 transition-all text-left"
              >
                <Mic className="w-4 h-4 text-indigo-400" />
                <span className="truncate font-medium">Diarização</span>
              </button>
            </div>
          </div>

          {/* Captured Videos Matches */}
          {filteredCaptures.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider mb-1.5 px-2 flex justify-between">
                <span>Vídeos Ingeridos ({filteredCaptures.length})</span>
              </div>
              <div className="space-y-1">
                {filteredCaptures.slice(0, 5).map((cap) => (
                  <button
                    type="button"
                    key={cap.id}
                    onClick={() => {
                      onSelectApp('signalcatcher', 'SignalCatcher Ingestor');
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-transparent hover:border-slate-700 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Play className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <div className="truncate">
                        <div className="text-slate-200 font-sans font-medium truncate">{cap.title}</div>
                        <div className="text-[11px] text-slate-400">{cap.sourceName} • {cap.publishedAt.slice(0, 10)}</div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 shrink-0">
                      {cap.postgresRecordId}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Channels Matches */}
          {filteredSources.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider mb-1.5 px-2">
                Canais Monitorados ({filteredSources.length})
              </div>
              <div className="space-y-1">
                {filteredSources.slice(0, 4).map((source) => (
                  <button
                    type="button"
                    key={source.id}
                    onClick={() => {
                      onSelectApp('signalcatcher', 'SignalCatcher Ingestor');
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-transparent hover:border-slate-700 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Tv className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-slate-200 font-sans truncate">{source.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[200px]">{source.url}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* REST API Endpoints */}
          {filteredEndpoints.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider mb-1.5 px-2">
                FastAPI REST Endpoints ({filteredEndpoints.length})
              </div>
              <div className="space-y-1">
                {filteredEndpoints.map((ep) => (
                  <div
                    key={ep.path}
                    className="p-2 rounded-lg bg-slate-800/40 border border-transparent flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        ep.method === 'GET' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-blue-950 text-blue-400 border border-blue-800'
                      }`}>
                        {ep.method}
                      </span>
                      <span className="text-slate-200 font-mono truncate">{ep.path}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 truncate max-w-xs">{ep.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between font-mono">
          <span>Use <strong>ESC</strong> para sair</span>
          <span>SignalCatcher Command Hub</span>
        </div>
      </div>
    </div>
  );
};
