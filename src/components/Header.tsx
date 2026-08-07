import React from 'react';
import { 
  Activity, 
  Terminal, 
  Server, 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  Zap
} from 'lucide-react';
import { ThemeMode } from '../types';

interface HeaderProps {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  isBackendConnected: boolean;
  setIsBackendConnected: (connected: boolean) => void;
  latency: number;
  onOpenCommandPalette: () => void;
  onToggleNotifications: () => void;
  unreadCount: number;
  isSimulatingLive: boolean;
  setIsSimulatingLive: (sim: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  setTheme,
  isBackendConnected,
  setIsBackendConnected,
  latency,
  onOpenCommandPalette,
  onToggleNotifications,
  unreadCount,
  isSimulatingLive,
  setIsSimulatingLive
}) => {
  return (
    <header className="border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-4 sticky top-0 z-40 text-zinc-100">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3 min-w-max">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-cyan-600 to-emerald-500 p-0.5 shadow-md shadow-indigo-500/20">
          <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
            <Zap className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-zinc-100 via-indigo-200 to-cyan-300 bg-clip-text text-transparent">
              SignalCatcher
            </h1>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Bento v2.4
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
            <Server className="w-3 h-3 text-emerald-400" />
            <span>Python FastAPI Hub</span>
          </p>
        </div>
      </div>

      {/* Center Search & Quick Command Palette Trigger */}
      <div className="hidden md:flex items-center flex-1 max-w-md">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all text-xs group shadow-inner"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Buscar aplicações, fontes, jobs ou endpoints...</span>
          </span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-300 rounded-md border border-zinc-700">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Status Metrics & Quick Action Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Mode Toggle */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          <button
            onClick={() => setTheme('cyberpunk')}
            className={`p-1.5 rounded-lg transition-colors ${theme === 'cyberpunk' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:text-zinc-200'}`}
            title="Modo Bento Dark"
          >
            <Zap className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme('oled')}
            className={`p-1.5 rounded-lg transition-colors ${theme === 'oled' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
            title="Modo OLED Black"
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`p-1.5 rounded-lg transition-colors ${theme === 'light' ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'}`}
            title="Modo Light Bento"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Notification Bell */}
        <button
          onClick={onToggleNotifications}
          className="relative p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-indigo-400 transition-colors"
          title="Notificações & Eventos do Sistema"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold font-mono px-1 rounded-full min-w-4 h-4 flex items-center justify-center animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
