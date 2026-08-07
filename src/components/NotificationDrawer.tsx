import React from 'react';
import { X, CheckCircle2, AlertTriangle, Info, AlertOctagon, Trash2, Terminal } from 'lucide-react';
import { SystemLog } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: SystemLog[];
  onClearLogs: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs
}) => {
  if (!isOpen) return null;

  const getLogIcon = (level: SystemLog['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'error':
        return <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-cyan-400 shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-slate-900 border-l border-cyan-500/30 shadow-2xl shadow-cyan-950/80 flex flex-col text-slate-100 font-mono animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h2 className="font-bold text-sm tracking-tight">Logs & Notificações Hub</h2>
        </div>
        <div className="flex items-center gap-1">
          {logs.length > 0 && (
            <button
              onClick={onClearLogs}
              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Limpar todos os logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs Feed */}
      <div className="p-3 overflow-y-auto flex-1 space-y-2 text-xs">
        {logs.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            Nenhum evento registrado recentemente
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-2.5 hover:border-slate-700 transition-colors"
            >
              {getLogIcon(log.level)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                  <span className="font-semibold text-cyan-400">{log.sourceApp}</span>
                  <span>{log.timestamp}</span>
                </div>
                <p className="text-slate-300 leading-relaxed break-words font-sans text-xs">
                  {log.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-500 text-center">
        FastAPI Async Event Loop Sync • PostgreSQL DB Connected
      </div>
    </div>
  );
};
