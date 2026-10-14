import React from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  PlayCircle,
  RefreshCw,
  ServerCrash,
  Sparkles,
  Trash
} from 'lucide-react';
import { LanguageMode } from '../../types';
import { TrackingTelemetry } from './TrackingTelemetry';

interface PipelineStepDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  animate?: boolean;
}

const PIPELINE_MAIN_FLOW: PipelineStepDef[] = [
  { id: 'STARTED', label: 'STARTED', icon: PlayCircle, color: 'text-zinc-400', bg: 'bg-zinc-400/10', border: 'border-zinc-400/20' },
  { id: 'PENDING_METADATA_EXTRACTION', label: 'PENDING METADATA EXTRACTION', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
  { id: 'EXTRACTING_METADATA', label: 'EXTRACTING METADATA', icon: Loader2, color: 'text-amber-300', bg: 'bg-amber-300/10', border: 'border-amber-300/20', animate: true },
  { id: 'METADATA_EXTRACTED', label: 'METADATA EXTRACTED', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  { id: 'PENDING_DOWNLOAD', label: 'PENDING DOWNLOAD', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  { id: 'DOWNLOADING', label: 'DOWNLOADING', icon: Loader2, color: 'text-blue-300', bg: 'bg-blue-300/10', border: 'border-blue-300/20', animate: true },
  { id: 'DOWNLOADED', label: 'DOWNLOADED', icon: CheckCircle2, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20' },
  { id: 'COMPLETED', label: 'COMPLETED', icon: Sparkles, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
];

const PIPELINE_EXCEPTIONS: PipelineStepDef[] = [
  { id: 'MEMBERS_ONLY', label: 'MEMBERS ONLY', icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { id: 'AGE_RESTRICTED', label: 'AGE RESTRICTED', icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { id: 'PRIVATE_VIDEO', label: 'PRIVATE VIDEO', icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { id: 'COPYRIGHT_REMOVED', label: 'COPYRIGHT REMOVED', icon: ServerCrash, color: 'text-red-600', bg: 'bg-red-600/10', border: 'border-red-600/20' },
  { id: 'ACCOUNT_TERMINATED', label: 'ACCOUNT TERMINATED', icon: ServerCrash, color: 'text-red-600', bg: 'bg-red-600/10', border: 'border-red-600/20' },
  { id: 'VIDEO_REMOVED', label: 'VIDEO REMOVED', icon: ServerCrash, color: 'text-red-600', bg: 'bg-red-600/10', border: 'border-red-600/20' },
];

const PIPELINE_OTHER: PipelineStepDef[] = [
  { id: 'ERROR', label: 'ERROR', icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  { id: 'REPROCESSING', label: 'REPROCESSING', icon: RefreshCw, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', animate: true },
  { id: 'DELETED', label: 'DELETED', icon: Trash, color: 'text-zinc-600', bg: 'bg-zinc-600/10', border: 'border-zinc-600/20' },
];

const StepCard: React.FC<{ step: PipelineStepDef; count: number }> = ({ step, count }) => (
  <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-zinc-700 transition-all shadow-sm">
    <div className="flex items-start justify-between">
      <div className={`p-2.5 rounded-xl border ${step.bg} ${step.border} ${step.color}`}>
        <step.icon className={`w-5 h-5 ${step.animate ? 'animate-spin' : ''}`} />
      </div>
    </div>
    <div>
      <div className="text-2xl font-black text-zinc-100 tracking-tight">{count}</div>
      <div className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-wider h-6 flex items-center">{step.label}</div>
    </div>
  </div>
);

export interface PipelineTrackingViewProps {
  language?: LanguageMode;
  statusCounts?: Record<string, number>;
  onAddLog: (sourceApp: string, level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  t: (key: any) => string;
}

export const PipelineTrackingView: React.FC<PipelineTrackingViewProps> = ({
  language = 'en',
  statusCounts = {},
  onAddLog,
  t,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-fuchsia-500/10 rounded-xl border border-fuchsia-500/20 text-fuchsia-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-100">{t('trackingPipelineTitle') || 'Tracking de Pipeline'}</h3>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">{t('trackingPipelineDesc') || 'Visão geral do processamento do YouTube Catcher Engine'}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* FLUXO PRINCIPAL */}
        <div className="bg-zinc-950/40 p-4 rounded-3xl border border-zinc-800/60">
          <h4 className="text-xs font-bold text-zinc-500 mb-4 uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            {t('trackingMainFlow') || 'Fluxo Principal de Captura'}
          </h4>

          <div className="flex items-center justify-between w-full gap-2 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900/50">
            {PIPELINE_MAIN_FLOW.map((step, idx) => {
              const count = statusCounts[step.id] || 0;
              const hasNext = idx < PIPELINE_MAIN_FLOW.length - 1;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex-1 min-w-[176px] bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 flex flex-col gap-2.5 hover:border-zinc-700 transition-all shadow-sm shrink-0 relative">
                    <div className="flex items-start justify-between">
                      <div className={`p-2.5 rounded-xl border ${step.bg} ${step.border} ${step.color}`}>
                        <step.icon className={`w-4 h-4 ${step.animate ? 'animate-spin' : ''}`} />
                      </div>
                    </div>

                    <div>
                      <div className="text-2xl font-bold text-zinc-100 tracking-tight tabular-nums">{count}</div>
                      <div className="text-[11px] font-medium text-zinc-400 mt-1 uppercase tracking-normal leading-snug min-h-8 flex items-center break-words">{step.label}</div>
                    </div>
                  </div>

                  {hasNext && (
                    <div className="flex shrink-0 text-zinc-700 mx-1">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* CONTROLE E MANUTENÇÃO */}
        <div className="bg-zinc-950/40 p-4 rounded-3xl border border-zinc-800/60">
          <h4 className="text-xs font-bold text-zinc-500 mb-4 uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
            {t('trackingMaintenance') || 'Manutenção e Ciclo de Vida'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {PIPELINE_OTHER.map((step) => (
              <StepCard key={step.id} step={step} count={statusCounts[step.id] || 0} />
            ))}
          </div>
        </div>

        {/* EXCEÇÕES E ESTADOS TERMINAIS */}
        <div className="bg-zinc-950/40 p-4 rounded-3xl border border-zinc-800/60">
          <h4 className="text-xs font-bold text-zinc-500 mb-4 uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            {t('trackingExceptions') || 'Exceções e Estados Terminais'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {PIPELINE_EXCEPTIONS.map((step) => (
              <StepCard key={step.id} step={step} count={statusCounts[step.id] || 0} />
            ))}
          </div>
        </div>
      </div>
      <TrackingTelemetry language={language === 'pt' ? 'pt' : 'en'} onAddLog={onAddLog} />
    </div>
  );
};
