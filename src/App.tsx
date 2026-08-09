import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Home, 
  TrendingDown, 
  BarChart3, 
  Terminal, 
  Plus, 
  LayoutGrid,
  Sparkles
} from 'lucide-react';
import { Header } from './components/Header';
import { CommandPalette } from './components/CommandPalette';
import { NotificationDrawer } from './components/NotificationDrawer';
import { SignalCatcherApp } from './components/apps/SignalCatcherApp';
import { SmartHomeApp } from './components/apps/SmartHomeApp';
import { FollowerAnalyticsApp } from './components/apps/FollowerAnalyticsApp';
import { CreatorDashboardsApp } from './components/apps/CreatorDashboardsApp';
import { CustomAppBuilderModal } from './components/apps/CustomAppBuilderModal';

import { 
  AppTab, 
  ThemeMode, 
  LanguageMode,
  ContentSource, 
  CapturedVideo, 
  ScheduledJob, 
  SmartDevice, 
  FollowerStats, 
  CreatorMetric, 
  SystemLog 
} from './types';

import { 
  INITIAL_SOURCES, 
  INITIAL_CAPTURES, 
  INITIAL_JOBS, 
  INITIAL_DEVICES, 
  INITIAL_FOLLOWER_HISTORY, 
  INITIAL_CREATORS, 
  INITIAL_LOGS, 
  FASTAPI_ENDPOINTS 
} from './data/initialData';

export default function App() {
  useEffect(() => {
    document.title = "SignalCatcher";
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(20);
  const [stepFilter, setStepFilter] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isFetchingVideos, setIsFetchingVideos] = useState(false);
  const [isFetchingChannels, setIsFetchingChannels] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://eriberry.local:5001';

  const initialVideosFetched = useRef(false);
  const initialChannelsFetched = useRef(false);

  useEffect(() => {
    if (!initialVideosFetched.current) {
      setIsFetchingVideos(true);
    }
    const stepQuery = stepFilter ? `&step=${stepFilter}` : '';
    const searchQueryParam = debouncedSearchQuery ? `&search=${encodeURIComponent(debouncedSearchQuery)}` : '';
    fetch(`${API_BASE_URL}/api/youtube/content?page=${currentPage}&limit=${limit}${stepQuery}${searchQueryParam}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.items) {
          const fetchedCaptures: CapturedVideo[] = data.items.map((item: any) => ({
            id: item.id || `vid-${Math.random()}`,
            sourceId: 'api',
            sourceName: item.channel_name || 'YouTube API',
            sourceAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
            title: item.title,
            videoUrl: item.url,
            thumbnail: item.thumbnail || '',
            createdAt: item.created_at,
            publishedAt: item.published_at || item.publishedAt || new Date().toISOString(),
            duration: item.duration || '0:00',
            views: 0,
            likes: 0,
            commentsCount: 0,
            status: item.step || 'PENDING_DOWNLOAD',
            postgresRecordId: item.id || '',
            tags: item.tags || [],
            summary: '',
            description: item.description || '',
            sentimentScore: 0
          }));
          setCaptures(fetchedCaptures);
          if (data.total_pages) {
            setTotalPages(data.total_pages);
          }
        }
      })
      .catch(err => console.error("Failed to fetch API data", err))
      .finally(() => {
        setIsFetchingVideos(false);
        initialVideosFetched.current = true;
      });
  }, [currentPage, refreshTrigger, limit, stepFilter, debouncedSearchQuery]);

  useEffect(() => {
    if (!initialChannelsFetched.current) {
      setIsFetchingChannels(true);
    }
    fetch(`${API_BASE_URL}/api/youtube/channels`)
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
      .catch(err => console.error("Failed to fetch channels", err))
      .finally(() => {
        setIsFetchingChannels(false);
        initialChannelsFetched.current = true;
      });
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
  const [language, setLanguage] = useState<LanguageMode>('pt');
  
  // Backend Status Simulation
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);
  const [latency, setLatency] = useState<number>(12);
  const [isSimulatingLive, setIsSimulatingLive] = useState<boolean>(true);

  // App Tabs State
  const [tabs, setTabs] = useState<AppTab[]>([
    { id: 'tab-1', appId: 'signalcatcher', title: 'SignalCatcher Ingestor', icon: 'radio', isPinned: true }
  ]);

  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  // Datasets State
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [captures, setCaptures] = useState<CapturedVideo[]>([]);
  const [jobs, setJobs] = useState<ScheduledJob[]>(INITIAL_JOBS);
  const [devices, setDevices] = useState<SmartDevice[]>(INITIAL_DEVICES);
  const [followerHistory, setFollowerHistory] = useState<FollowerStats[]>(INITIAL_FOLLOWER_HISTORY);
  const [creators, setCreators] = useState<CreatorMetric[]>(INITIAL_CREATORS);
  const [logs, setLogs] = useState<SystemLog[]>(INITIAL_LOGS);

  // Modal & Drawer Toggles
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isNewAppModalOpen, setIsNewAppModalOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  // Unread logs counter
  const [unreadLogsCount, setUnreadLogsCount] = useState<number>(0);

  // Add system log helper
  const addLog = (sourceApp: string, level: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const newLog: SystemLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toTimeString().slice(0, 8),
      sourceApp,
      level,
      message
    };
    setLogs((prev) => [newLog, ...prev]);
    setUnreadLogsCount((prev) => prev + 1);
  };

  // Live Stream Event Simulation Effect
  useEffect(() => {
    if (!isSimulatingLive) return;

    const interval = setInterval(() => {
      // Fluctuate latency slightly
      setLatency(Math.floor(Math.random() * 12) + 8);
    }, 10000);

    return () => clearInterval(interval);
  }, [isSimulatingLive]);

  // Tab Handlers
  const handleSelectTab = (tabId: string) => {
    setActiveTabId(tabId);
  };

  const handleCloseTab = (tabId: string) => {
    if (tabs.length <= 1) return;
    const nextTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(nextTabs);

    if (activeTabId === tabId) {
      setActiveTabId(nextTabs[0].id);
    }
  };

  const handleTogglePin = (tabId: string) => {
    setTabs(
      tabs.map((t) => {
        if (t.id === tabId) return { ...t, isPinned: !t.isPinned };
        return t;
      })
    );
  };

  const handleAddTab = (appId: string, title: string) => {
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

  const handleTriggerJob = (jobId: string) => {
    setJobs(
      jobs.map((j) => {
        if (j.id === jobId) {
          addLog('SignalCatcher', 'info', `Disparando job de background [${j.name}] via FastAPI...`);
          return {
            ...j,
            status: 'running',
            lastRun: new Date().toISOString(),
            executionCount: j.executionCount + 1
          };
        }
        return j;
      })
    );

    setTimeout(() => {
      setJobs((prevJobs) =>
        prevJobs.map((j) => (j.id === jobId ? { ...j, status: 'idle' } : j))
      );
      addLog('SignalCatcher', 'success', `Job de background [${jobId}] executado com sucesso e persistido no PostgreSQL.`);
    }, 1500);
  };

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Theme styling wrapper
  const themeClasses = 
    theme === 'oled' 
      ? 'bg-black text-zinc-100' 
      : theme === 'light' 
      ? 'bg-zinc-100 text-zinc-900' 
      : 'bg-[#09090b] text-zinc-100';

  const getAppletIcon = (appId: string) => {
    switch (appId) {
      case 'signalcatcher': return <Radio className="w-4 h-4" />;
      case 'smarthome': return <Home className="w-4 h-4" />;
      case 'followers': return <TrendingDown className="w-4 h-4" />;
      case 'creatordash': return <BarChart3 className="w-4 h-4" />;
      case 'fastapi': return <Terminal className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans ${themeClasses} selection:bg-indigo-500 selection:text-white`}>
      {/* Top Header */}
      <Header
        theme={theme}
        setTheme={setTheme}
        language={language}
        setLanguage={setLanguage}
        isBackendConnected={isBackendConnected}
        setIsBackendConnected={setIsBackendConnected}
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
      <div className="flex-1 flex overflow-hidden relative">
        {/* Bento Mini Side Rail */}
        <aside className="hidden md:flex flex-col items-center py-4 px-2 w-16 bg-[#09090b] border-r border-zinc-800/80 gap-3 shrink-0">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest text-center mb-1">
            APPS
          </div>

          {[
            { id: 'signalcatcher', name: 'SignalCatcher', disabled: false },
            { id: 'smarthome', name: 'Casa Inteligente', disabled: true },
            { id: 'followers', name: 'Seguidores', disabled: true },
            { id: 'creatordash', name: 'Criadores', disabled: true }
          ].map((app) => {
            const isAppActive = activeTab.appId === app.id;
            const existingTab = tabs.find((t) => t.appId === app.id);

            return (
              <button
                key={app.id}
                disabled={app.disabled}
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
                    : app.disabled
                      ? 'bg-zinc-900/30 border-zinc-800/40 text-zinc-600 cursor-not-allowed'
                      : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
                title={app.disabled ? `${app.name} (Em breve)` : app.name}
              >
                {getAppletIcon(app.id)}
                
                {/* Active Indicator Dot */}
                {isAppActive && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                )}

                {/* Tooltip */}
                <span className="absolute left-16 bg-zinc-900 text-zinc-100 text-xs px-2.5 py-1 rounded-md border border-zinc-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-mono shadow-lg">
                  {app.name}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Workspace Active Tab View */}
        <main className="flex-1 overflow-y-auto relative p-2 sm:p-4 md:p-6 bg-[#09090b]">
          {activeTab.appId === 'signalcatcher' && (
            <SignalCatcherApp
              language={language}
              sources={sources}
              setSources={setSources}
              captures={captures}
              setCaptures={setCaptures}
              jobs={jobs}
              setJobs={setJobs}
              onTriggerJob={handleTriggerJob}
              onAddLog={addLog}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              limit={limit}
              onLimitChange={setLimit}
              stepFilter={stepFilter}
              onStepFilterChange={setStepFilter}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onOpenNotifications={() => {
                setIsNotificationsOpen(true);
                setUnreadLogsCount(0);
              }}
              onRefresh={() => setRefreshTrigger(prev => prev + 1)}
              isLoadingData={isFetchingVideos || isFetchingChannels}
            />
          )}

          {activeTab.appId === 'smarthome' && (
            <SmartHomeApp
              devices={devices}
              setDevices={setDevices}
              onAddLog={addLog}
            />
          )}

          {activeTab.appId === 'followers' && (
            <FollowerAnalyticsApp
              history={followerHistory}
              onAddLog={addLog}
            />
          )}

          {activeTab.appId === 'creatordash' && (
            <CreatorDashboardsApp creators={creators} />
          )}
        </main>
      </div>

      {/* Modals & Overlays */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        captures={captures}
        sources={sources}
        devices={devices}
        endpoints={FASTAPI_ENDPOINTS}
        onSelectApp={(appId, title) => {
          handleAddTab(appId, title || appId);
        }}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        logs={logs}
        onClearLogs={() => setLogs([])}
      />

      <CustomAppBuilderModal
        isOpen={isNewAppModalOpen}
        onClose={() => setIsNewAppModalOpen(false)}
        onAddTab={handleAddTab}
      />
    </div>
  );
}
