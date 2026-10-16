import {useInfiniteVideos} from './hooks/useInfiniteVideos';
import {readWorkspace, saveWorkspace} from './navigationStorage';
import {API_BASE_URL, apiFetch} from './api';
import {createLogId} from './logId';
import React, {useEffect, useRef, useState} from 'react';
import {Fingerprint, Mic, Radio, Sparkles} from 'lucide-react';
import {Header} from './components/Header';
import {CommandPalette} from './components/CommandPalette';
import {NotificationDrawer} from './components/NotificationDrawer';
import {SignalCatcherApp} from './components/apps/SignalCatcherApp';
import {DiarizationApp} from './components/apps/DiarizationApp';
import {SemanticSearchApp} from './components/apps/SemanticSearchApp';
import {VoiceRecognitionApp} from './components/apps/VoiceRecognitionApp';
import {ToastContainer, ToastProvider, useToast} from './components/toast';

import {
  AppId,
  AppTab,
  ContentSource,
  LanguageMode,
  SystemLog,
  ThemeMode
} from './types';

import { FASTAPI_ENDPOINTS } from './data/initialData';

function getThemeClasses(theme: ThemeMode): string {
  if (theme === 'oled') return 'bg-black text-zinc-100';
  if (theme === 'light') return 'bg-zinc-100 text-zinc-900';
  return 'bg-[#09090b] text-zinc-100';
}

function SignalCatcherHub() {
  const { toast } = useToast();

  useEffect(() => {
    document.title = "SignalCatcher";
  }, []);

  const [stepFilter, setStepFilter] = useState('COMPLETED');
  const [channelFilter, setChannelFilter] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isFetchingChannels, setIsFetchingChannels] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [totalStatusCount, setTotalStatusCount] = useState<number>(0);
  const [totalSavedCount, setTotalSavedCount] = useState<number>(0);
  const [totalMonitoredCount, setTotalMonitoredCount] = useState<number>(0);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const initialChannelsFetched = useRef(false);

  const {captures, setCaptures, isInitialLoading: isFetchingVideos, isLoadingMore,
    hasMore, error: videoLoadError, loadMore} = useInfiniteVideos(
      stepFilter, debouncedSearchQuery, channelFilter, refreshTrigger,
    );

  useEffect(() => {
    if (!initialChannelsFetched.current) {
      setIsFetchingChannels(true);
    }
    apiFetch(`${API_BASE_URL}/api/youtube/monitored_channels`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data)) {
          const fetchedSources: ContentSource[] = data.map((item: any) => ({
            id: item.id.toString(),
            name: item.name || 'Unknown Channel',
            url: item.url,
            channelId: item.url,
            avatar: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=150&auto=format&fit=crop&q=80',
            subscriberCount: 0,
            lastCaptured: new Date().toISOString(),
            status: item.active ? 'active' : 'inactive',
            intervalMinutes: 60,
            totalCaptured: 0
          }));
          setSources(fetchedSources);
        }
      })
      .catch(err => console.error("Failed to fetch monitored channels", err))
      .finally(() => {
        setIsFetchingChannels(false);
        initialChannelsFetched.current = true;
      });
      
    // Fetch Saved Channels
    apiFetch(`${API_BASE_URL}/api/youtube/channels`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data)) {
          const fetchedChannels: ContentSource[] = data.map((item: any) => ({
            id: item.id.toString(),
            name: item.title || item.name || 'Unknown Saved Channel',
            url: item.custom_url || item.url || '',
            channelId: item.external_id || item.channel_id || item.id.toString(),
            channelUrl: item.channel_url || '',
            avatar: item.thumbnail_url || 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=150&auto=format&fit=crop&q=80',
            subscriberCount: item.subscriber_count || 0,
            lastCaptured: item.created_at || new Date().toISOString(),
            status: 'active',
            intervalMinutes: 0,
            totalCaptured: item.video_count || 0
          }));
          setSavedChannels(fetchedChannels);
        }
      })
      .catch(err => console.error("Failed to fetch saved channels", err));
      
    // Fetch Global Stats
    apiFetch(`${API_BASE_URL}/api/youtube/content/status-count`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.status_counts) setStatusCounts(data.status_counts);
          if (data.total_videos !== undefined) setTotalStatusCount(data.total_videos);
          if (data.total_saved_channels !== undefined) setTotalSavedCount(data.total_saved_channels);
          if (data.total_monitored_channels !== undefined) setTotalMonitoredCount(data.total_monitored_channels);
        }
      })
      .catch(err => console.error("Failed to fetch stats", err));
  }, [refreshTrigger]);

  // Data Refresh Interval
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Theme & Language State
  const [theme, setTheme] = useState<ThemeMode>('cyberpunk');
  const [language, setLanguage] = useState<LanguageMode>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('signalcatcher_language') : null;
    return (saved === 'pt' || saved === 'en') ? (saved as LanguageMode) : 'en';
  });

  useEffect(() => {
    try {
      localStorage.setItem('signalcatcher_language', language);
    } catch {
      // ignore storage errors
    }
  }, [language]);
  
  // Backend Status Simulation
  const [isBackendConnected] = useState<boolean>(true);
  const [latency, setLatency] = useState<number>(12);
  const [isSimulatingLive, setIsSimulatingLive] = useState<boolean>(true);

  // App Tabs State
  const [initialWorkspace] = useState(readWorkspace);
  const [tabs, setTabs] = useState<AppTab[]>(initialWorkspace.tabs);
  const [activeTabId, setActiveTabId] = useState<string>(initialWorkspace.activeTabId);

  useEffect(() => {saveWorkspace(tabs, activeTabId);}, [tabs, activeTabId]);

  // Datasets State
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [savedChannels, setSavedChannels] = useState<ContentSource[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);

  // Modal & Drawer Toggles
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  // Unread logs counter
  const [unreadLogsCount, setUnreadLogsCount] = useState<number>(0);

  // Add system log helper
  const addLog = (sourceApp: string, level: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const newLog: SystemLog = {
      id: createLogId(),
      timestamp: new Date().toTimeString().slice(0, 8),
      sourceApp,
      level,
      message
    };
    setLogs((prev) => [newLog, ...prev].slice(0, 200));
    if (!isNotificationsOpen) setUnreadLogsCount((prev) => Math.min(200, prev + 1));

    // Trigger reactive Toast notification
    if (!isNotificationsOpen) toast[level](message, sourceApp, {
      action: {
        label: language === 'pt' ? 'Ver Logs' : 'View Logs',
        onClick: () => {
          setIsNotificationsOpen(true);
          setUnreadLogsCount(0);
        }
      }
    });
  };

  // Live Stream Event Simulation Effect
  useEffect(() => {
    if (!isSimulatingLive) return;

    const interval = setInterval(() => {
      // Fluctuate latency slightly using safe PRNG
      const randomOffset = typeof crypto !== 'undefined' && crypto.getRandomValues
        ? (crypto.getRandomValues(new Uint32Array(1))[0] % 12)
        : 6;
      setLatency(randomOffset + 8);
    }, 10000);

    return () => clearInterval(interval);
  }, [isSimulatingLive]);

  const handleAddTab = (appId: AppId, title: string) => {
    const newTabId = `tab-${Date.now()}`;
    const newTab: AppTab = {
      id: newTabId,
      appId,
      title,
      icon: appId
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTabId);
    addLog('Hub Workspace', 'info', `Aba criada: ${title}`);
  };

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Theme styling wrapper
  const themeClasses = getThemeClasses(theme);

  const getAppletIcon = (appId: string) => {
    switch (appId) {
      case 'signalcatcher': return <Radio className="w-4 h-4" />;
      case 'diarization': return <Mic className="w-4 h-4" />;
      case 'search': return <Sparkles className="w-4 h-4" />;
      case 'voice_recognition': return <Fingerprint className="w-4 h-4" />;
      default: return <Radio className="w-4 h-4" />;
    }
  };

  return (
    <div data-theme={theme} className={`${(activeTab.appId === 'diarization' || activeTab.appId === 'search' || activeTab.appId === 'voice_recognition') ? 'h-dvh overflow-hidden' : 'min-h-screen'} flex flex-col font-sans ${themeClasses} selection:bg-indigo-500 selection:text-white`}>
      {/* Top Header */}
      <Header
        theme={theme}
        setTheme={setTheme}
        language={language}
        setLanguage={setLanguage}
        isBackendConnected={isBackendConnected}
        latency={latency}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onToggleNotifications={() => {
          setIsNotificationsOpen(!isNotificationsOpen);
          setUnreadLogsCount(0);
        }}
        unreadCount={unreadLogsCount}
        isSimulatingLive={isSimulatingLive}
        setIsSimulatingLive={setIsSimulatingLive}
      />

      {/* Main Workspace with Side Rail + Bento Content Area */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
        {/* Bento Mini Side Rail */}
        <aside aria-label={language === 'pt' ? 'Aplicações' : 'Applications'} className="flex md:flex-col items-center py-2 md:py-4 px-2 md:w-16 overflow-x-auto md:overflow-visible bg-[#09090b] border-b md:border-b-0 md:border-r border-zinc-800/80 gap-3 shrink-0">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest text-center mb-1 hidden md:block">
            APPS
          </div>

          {[
            { id: 'signalcatcher' as const, name: 'SignalCatcher' },
            { id: 'diarization' as const, name: language === 'pt' ? 'Diarização' : 'Diarization' },
            { id: 'voice_recognition' as const, name: language === 'pt' ? 'Reconhecimento de Voz' : 'Voice Recognition' },
            { id: 'search' as const, name: language === 'pt' ? 'Vetorização & Busca' : 'Vectorization & Search' },
          ].map((app) => {
            const isAppActive = activeTab.appId === app.id;
            const existingTab = tabs.find((t) => t.appId === app.id);

            return (
              <button
                key={app.id}
                aria-label={app.name}
                aria-current={isAppActive ? 'page' : undefined}
                onClick={() => {
                  if (existingTab) {
                    setActiveTabId(existingTab.id);
                  } else {
                    handleAddTab(app.id, app.name);
                  }
                }}
                className={`group relative p-2.5 rounded-xl border transition-all ${
                  isAppActive
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400 shadow-md shadow-indigo-600/10'
                    : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
                title={app.name}
              >
                {getAppletIcon(app.id)}
                
                {/* Active Indicator Dot */}
                {isAppActive && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-400" />
                )}

                {/* Tooltip */}
                <span className="absolute hidden md:block left-16 bg-zinc-900 text-zinc-100 text-xs px-2.5 py-1 rounded-md border border-zinc-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-mono shadow-lg">
                  {app.name}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Workspace Active Tab View */}
        <main className={`flex-1 min-w-0 min-h-0 relative bg-[#09090b] ${(activeTab.appId === 'diarization' || activeTab.appId === 'voice_recognition' || activeTab.appId === 'search') ? 'flex overflow-hidden' : 'overflow-y-auto p-2 sm:p-4 md:p-6'}`}>
          {activeTab.appId === 'signalcatcher' && (
            <SignalCatcherApp
              language={language}
              sources={sources}
              setSources={setSources}
              savedChannels={savedChannels}
              captures={captures}
              setCaptures={setCaptures}
              onAddLog={addLog}
              hasMoreVideos={hasMore}
              isLoadingMoreVideos={isLoadingMore}
              videoLoadError={videoLoadError}
              onLoadMoreVideos={loadMore}
              stepFilter={stepFilter}
              onStepFilterChange={setStepFilter}
              channelFilter={channelFilter}
              onChannelFilterChange={setChannelFilter}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onOpenNotifications={() => {
                setIsNotificationsOpen(true);
                setUnreadLogsCount(0);
              }}
              onRefresh={() => setRefreshTrigger(prev => prev + 1)}
              isLoadingData={isFetchingVideos || isFetchingChannels}
              statusCounts={statusCounts}
              totalStatusCount={totalStatusCount}
              totalSavedCount={totalSavedCount}
              totalMonitoredCount={totalMonitoredCount}
            />
          )}

          {activeTab.appId === 'diarization' && (
            <DiarizationApp 
              language={language}
              onAddLog={addLog}
            />
          )}

          {activeTab.appId === 'search' && (
            <SemanticSearchApp
              language={language}
              onAddLog={addLog}
            />
          )}

          {activeTab.appId === 'voice_recognition' && (
            <VoiceRecognitionApp
              language={language}
              onAddLog={addLog}
            />
          )}
        </main>
      </div>

      {/* Modals & Overlays */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        captures={captures}
        sources={sources}
        endpoints={FASTAPI_ENDPOINTS}
        onSelectApp={(appId, title) => {
          handleAddTab(appId, title || appId);
        }}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        logs={logs}
        language={language}
        onClearLogs={() => {setLogs([]); setUnreadLogsCount(0);}}
      />

      {/* Global Reactive Toast Notifications */}
      <ToastContainer language={language} hidden={isNotificationsOpen} />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <SignalCatcherHub />
    </ToastProvider>
  );
}
