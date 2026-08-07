import React, { useState, useRef, useEffect } from 'react';
import { 
  Activity, 
  Terminal, 
  Server, 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  Zap,
  Settings,
  Check,
  X,
  Sliders,
  RefreshCw,
  Database,
  Globe
} from 'lucide-react';
import { ThemeMode, LanguageMode } from '../types';
import { getTranslation } from '../locales';

interface HeaderProps {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  language?: LanguageMode;
  setLanguage?: (lang: LanguageMode) => void;
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
  language = 'pt',
  setLanguage,
  isBackendConnected,
  setIsBackendConnected,
  latency,
  onOpenCommandPalette,
  onToggleNotifications,
  unreadCount,
  isSimulatingLive,
  setIsSimulatingLive
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<LanguageMode>(language);
  const settingsRef = useRef<HTMLDivElement>(null);
  const { t } = getTranslation(language);

  useEffect(() => {
    setCurrentLang(language);
  }, [language]);

  const handleSelectLanguage = (lang: LanguageMode) => {
    setCurrentLang(lang);
    if (setLanguage) {
      setLanguage(lang);
    }
  };

  // Close settings popover on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

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
            <span>{t('searchHeaderPlaceholder')}</span>
          </span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-300 rounded-md border border-zinc-700">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Status Metrics & Quick Action Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification Bell */}
        <button
          onClick={onToggleNotifications}
          className="relative p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-indigo-400 transition-colors"
          title={t('notificationsTitle')}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold font-mono px-1 rounded-full min-w-4 h-4 flex items-center justify-center animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Settings Button & Dropdown Popover */}
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all text-xs font-medium ${
              isSettingsOpen 
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white'
            }`}
            title={t('settingsBtn')}
          >
            <Settings className={`w-4 h-4 ${isSettingsOpen ? 'rotate-90 transition-transform duration-300' : ''}`} />
            <span className="hidden sm:inline">{t('settingsBtn')}</span>
          </button>

          {/* Settings Panel Popover */}
          {isSettingsOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">{t('settingsHeader')}</h3>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Theme Settings Section */}
              <div className="space-y-2 mb-4">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  {t('themeLabel')}
                </label>
                
                <div className="grid grid-cols-1 gap-1.5">
                  {/* Cyberpunk / Bento Dark */}
                  <button
                    onClick={() => setTheme('cyberpunk')}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                      theme === 'cyberpunk'
                        ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300 font-semibold'
                        : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <span>{t('bentoDark')}</span>
                    </div>
                    {theme === 'cyberpunk' && <Check className="w-4 h-4 text-indigo-400" />}
                  </button>

                  {/* OLED Black */}
                  <button
                    onClick={() => setTheme('oled')}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                      theme === 'oled'
                        ? 'bg-zinc-800 border-zinc-600 text-zinc-100 font-semibold'
                        : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-200">
                        <Moon className="w-3.5 h-3.5" />
                      </div>
                      <span>{t('oledBlack')}</span>
                    </div>
                    {theme === 'oled' && <Check className="w-4 h-4 text-zinc-300" />}
                  </button>

                  {/* Light Bento */}
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                      theme === 'light'
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 font-semibold'
                        : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                        <Sun className="w-3.5 h-3.5" />
                      </div>
                      <span>{t('lightBento')}</span>
                    </div>
                    {theme === 'light' && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                </div>
              </div>

              {/* Language Settings Section */}
              <div className="space-y-2 mb-4 pt-3 border-t border-zinc-800">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center justify-between mb-1">
                  <span>{t('languageLabel')}</span>
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {/* Portuguese (BR) */}
                  <button
                    onClick={() => handleSelectLanguage('pt')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs transition-all ${
                      currentLang === 'pt'
                        ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300 font-semibold shadow-sm'
                        : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    <span className="text-base">🇧🇷</span>
                    <span className="text-xs">PT-BR</span>
                  </button>

                  {/* English (US) */}
                  <button
                    onClick={() => handleSelectLanguage('en')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs transition-all ${
                      currentLang === 'en'
                        ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300 font-semibold shadow-sm'
                        : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    <span className="text-base">🇺🇸</span>
                    <span className="text-xs">EN-US</span>
                  </button>
                </div>
              </div>

              {/* Additional Options */}
              <div className="pt-3 border-t border-zinc-800 space-y-2">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                  {t('executionPrefLabel')}
                </label>

                <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-xs">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isSimulatingLive ? 'animate-spin' : ''}`} />
                    <span>{t('liveEventStream')}</span>
                  </div>
                  <button
                    onClick={() => setIsSimulatingLive(!isSimulatingLive)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                      isSimulatingLive ? 'bg-indigo-600' : 'bg-zinc-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      isSimulatingLive ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

