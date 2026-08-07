import React, { useState } from 'react';
import { X, Sparkles, Plus, Radio, Home, TrendingDown, BarChart3, Terminal, AppWindow } from 'lucide-react';
import { AppId } from '../../types';

interface CustomAppBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTab: (appId: AppId, title: string, iconName: string) => void;
}

export const CustomAppBuilderModal: React.FC<CustomAppBuilderModalProps> = ({
  isOpen,
  onClose,
  onAddTab
}) => {
  const [appTitle, setAppTitle] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<AppId>('signalcatcher');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appTitle) return;

    onAddTab(selectedPreset, appTitle, selectedPreset);
    setAppTitle('');
    onClose();
  };

  const presets = [
    { id: 'signalcatcher' as AppId, title: 'SignalCatcher Ingestor', desc: 'Captura diária de vídeos & fontes YouTube', icon: Radio, color: 'text-cyan-400' },
    { id: 'smarthome' as AppId, title: 'Casa Inteligente Hub', desc: 'Controle de lâmpadas, climatização e sensores IoT', icon: Home, color: 'text-emerald-400' },
    { id: 'followers' as AppId, title: 'Perda de Seguidores', desc: 'Detecção de churn e taxas de retenção', icon: TrendingDown, color: 'text-rose-400' },
    { id: 'creatordash' as AppId, title: 'Analytics de Criadores', desc: 'Gráficos comparativos com Recharts e D3', icon: BarChart3, color: 'text-purple-400' },
    { id: 'fastapi' as AppId, title: 'FastAPI REST Sandbox', desc: 'Testador de endpoints e gerador Python', icon: Terminal, color: 'text-amber-400' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950 overflow-hidden font-mono text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2 text-slate-100">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h3 className="font-bold text-sm tracking-tight">Nova Aba de Aplicação no Hub</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-slate-400 mb-1.5 font-bold">Título da Aba no Workspace</label>
            <input
              type="text"
              required
              value={appTitle}
              onChange={(e) => setAppTitle(e.target.value)}
              placeholder="Ex: SignalCatcher - Servidor Produção"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1.5 font-bold">Selecione o Módulo Base / Preset</label>
            <div className="space-y-2">
              {presets.map((p) => {
                const IconComponent = p.icon;
                const isSelected = selectedPreset === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPreset(p.id);
                      if (!appTitle) setAppTitle(p.title);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-500 text-slate-100 font-bold shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <IconComponent className={`w-5 h-5 ${p.color} shrink-0`} />
                    <div>
                      <div className="text-slate-200 font-sans font-medium">{p.title}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{p.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold hover:from-cyan-400 hover:to-blue-500 transition-all shadow-md shadow-cyan-500/20"
            >
              Criar e Abrir Aba
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
