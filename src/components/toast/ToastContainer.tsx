import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X, Zap } from 'lucide-react';
import { useToast } from './ToastContext';
import { ToastNotification, ToastType } from '../../types';

interface ToastItemProps {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const duration = toast.duration ?? 4500;
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(duration);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (duration <= 0 || duration === Infinity) return;

    let lastTick = Date.now();

    const updateTimer = () => {
      if (!isPaused) {
        const now = Date.now();
        const delta = now - lastTick;
        lastTick = now;
        remainingTimeRef.current -= delta;

        const percent = Math.max(0, (remainingTimeRef.current / duration) * 100);
        setProgress(percent);

        if (remainingTimeRef.current <= 0) {
          onDismiss(toast.id);
          return;
        }
      } else {
        lastTick = Date.now();
      }

      animationFrameRef.current = requestAnimationFrame(updateTimer);
    };

    animationFrameRef.current = requestAnimationFrame(updateTimer);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [duration, isPaused, onDismiss, toast.id]);

  const getTypeConfig = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
          borderColor: 'border-emerald-500/40 hover:border-emerald-500/60',
          glow: 'shadow-emerald-950/50',
          badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          progressBar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
          defaultTitle: 'Sucesso',
        };
      case 'error':
        return {
          icon: <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />,
          borderColor: 'border-rose-500/40 hover:border-rose-500/60',
          glow: 'shadow-rose-950/50',
          badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          progressBar: 'bg-gradient-to-r from-rose-500 to-red-400',
          defaultTitle: 'Erro',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
          borderColor: 'border-amber-500/40 hover:border-amber-500/60',
          glow: 'shadow-amber-950/50',
          badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          progressBar: 'bg-gradient-to-r from-amber-500 to-orange-400',
          defaultTitle: 'Aviso',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-4 h-4 text-cyan-400 shrink-0" />,
          borderColor: 'border-cyan-500/40 hover:border-cyan-500/60',
          glow: 'shadow-cyan-950/50',
          badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
          progressBar: 'bg-gradient-to-r from-cyan-500 to-indigo-400',
          defaultTitle: 'Informação',
        };
    }
  };

  const config = getTypeConfig(toast.type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.92, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`relative group overflow-hidden w-full bg-zinc-950/95 backdrop-blur-xl border rounded-2xl p-3.5 shadow-2xl ${config.borderColor} ${config.glow} transition-colors pointer-events-auto text-zinc-100 font-sans`}
    >
      <div className="flex items-start gap-3">
        {/* Type Icon Badge */}
        <div className={`p-2 rounded-xl border shrink-0 ${config.badgeBg} flex items-center justify-center`}>
          {config.icon}
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5 truncate">
              {toast.title || config.defaultTitle}
            </span>
            <span className="text-[10px] font-mono text-zinc-500 shrink-0">
              {new Date(toast.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed break-words font-medium">
            {toast.message}
          </p>

          {/* Action Button if provided */}
          {toast.action && (
            <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex justify-end">
              <button
                onClick={() => {
                  toast.action?.onClick();
                  onDismiss(toast.id);
                }}
                className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 transition-colors flex items-center gap-1"
              >
                <Zap className="w-3 h-3 text-indigo-400" />
                {toast.action.label}
              </button>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => onDismiss(toast.id)}
          className="p-1 -mr-1 -mt-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors shrink-0"
          title="Fechar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress countdown bar */}
      {duration > 0 && duration !== Infinity && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-800/60 overflow-hidden">
          <div
            className={`h-full ${config.progressBar} transition-all duration-75`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </motion.div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast, clearAllToasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0">
      {toasts.length > 2 && (
        <div className="flex justify-end pointer-events-auto pr-1">
          <button
            onClick={clearAllToasts}
            className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 hover:text-zinc-200 bg-zinc-900/90 hover:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-800 shadow-md backdrop-blur-md transition-all"
          >
            Limpar todos ({toasts.length})
          </button>
        </div>
      )}
      <AnimatePresence mode="popLayout">
        {toasts.map((item) => (
          <ToastItem key={item.id} toast={item} onDismiss={dismissToast} />
        ))}
      </AnimatePresence>
    </div>
  );
};
