import React, { useState, useEffect } from 'react';
import { 
  Search, 
  X, 
  Radio, 
  Home, 
  TrendingDown, 
  BarChart3, 
  Terminal, 
  Play, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { CapturedVideo, ContentSource, SmartDevice, ApiEndpoint } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  captures: CapturedVideo[];
  sources: ContentSource[];
  devices: SmartDevice[];
  endpoints: ApiEndpoint[];
  onSelectApp: (appId: string, customTitle?: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  captures,
  sources,
  devices,
  endpoints,
  onSelectApp
}) => {
  const [query, setQuery] = useState('');

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

  const filteredCaptures = captures.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.sourceName.toLowerCase().includes(query.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredSources = sources.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  const filteredDevices = devices.filter(
    (d) =>
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.room.toLowerCase().includes(query.toLowerCase())
  );

  const filteredEndpoints = endpoints.filter(
    (e) =>
      e.path.toLowerCase().includes(query.toLowerCase()) ||
      e.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-16 px-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/80 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-slate-800 flex items-center gap-3 bg-slate-950/60">
          <Search className="w-5 h-5 text-cyan-400 shrink-0 animate-pulse" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite para buscar vídeos, fontes, dispositivos IoT ou APIs..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none font-mono"
            autoFocus
          />
          <button
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
              Aplicações do Hub
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => {
                  onSelectApp('signalcatcher', 'SignalCatcher Ingestor');
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/60 hover:bg-cyan-950/60 border border-slate-700/60 hover:border-cyan-500/50 text-slate-200 transition-all text-left"
              >
                <Radio className="w-4 h-4 text-cyan-400" />
                <span className="truncate">SignalCatcher</span>
              </button>

              <button
                onClick={() => {
                  onSelectApp('smarthome', 'Casa Inteligente Hub');
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/60 hover:bg-emerald-950/60 border border-slate-700/60 hover:border-emerald-500/50 text-slate-200 transition-all text-left"
              >
                <Home className="w-4 h-4 text-emerald-400" />
                <span className="truncate">Casa Inteligente</span>
              </button>

              <button
                onClick={() => {
                  onSelectApp('followers', 'Perda de Seguidores');
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/60 hover:bg-rose-950/60 border border-slate-700/60 hover:border-rose-500/50 text-slate-200 transition-all text-left"
              >
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <span className="truncate">Seguidores</span>
              </button>

              <button
                onClick={() => {
                  onSelectApp('creatordash', 'Analytics Criadores');
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/60 hover:bg-purple-950/60 border border-slate-700/60 hover:border-purple-500/50 text-slate-200 transition-all text-left"
              >
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <span className="truncate">Dashboards</span>
              </button>
            </div>
          </div>

          {/* Captured Videos Matches */}
          {filteredCaptures.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider mb-1.5 px-2 flex justify-between">
                <span>Vídeos Ingeridos no PostgreSQL ({filteredCaptures.length})</span>
              </div>
              <div className="space-y-1">
                {filteredCaptures.slice(0, 4).map((cap) => (
                  <div
                    key={cap.id}
                    onClick={() => {
                      onSelectApp('signalcatcher', 'SignalCatcher Ingestor');
                      onClose();
                    }}
                    className="p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-transparent hover:border-slate-700 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Play className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <div className="truncate">
                        <div className="text-slate-200 font-sans font-medium truncate">{cap.title}</div>
                        <div className="text-[11px] text-slate-400">{cap.sourceName} • {cap.publishedAt.slice(0, 10)}</div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 shrink-0">
                      {cap.postgresRecordId}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REST API Endpoints */}
          {filteredEndpoints.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider mb-1.5 px-2">
                FastAPI REST API ({filteredEndpoints.length})
              </div>
              <div className="space-y-1">
                {filteredEndpoints.map((ep) => (
                  <div
                    key={ep.path}
                    onClick={() => {
                      onSelectApp('fastapi', 'FastAPI REST Sandbox');
                      onClose();
                    }}
                    className="p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-transparent hover:border-slate-700 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        ep.method === 'GET' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-blue-950 text-blue-400 border border-blue-800'
                      }`}>
                        {ep.method}
                      </span>
                      <span className="text-slate-200 font-mono truncate">{ep.path}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Smart Home Devices */}
          {filteredDevices.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider mb-1.5 px-2">
                Casa Inteligente Node ({filteredDevices.length})
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {filteredDevices.slice(0, 4).map((dev) => (
                  <div
                    key={dev.id}
                    onClick={() => {
                      onSelectApp('smarthome', 'Casa Inteligente Hub');
                      onClose();
                    }}
                    className="p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-transparent hover:border-slate-700 cursor-pointer flex items-center justify-between"
                  >
                    <span className="text-slate-300 truncate">{dev.name}</span>
                    <span className="text-[10px] text-emerald-400 font-bold">{dev.room}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between font-mono">
          <span>Use <strong>ESC</strong> para sair</span>
          <span>NexusHub Python FastAPI Connector</span>
        </div>
      </div>
    </div>
  );
};
