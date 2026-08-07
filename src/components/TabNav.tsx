import React from 'react';
import { 
  X, 
  Pin, 
  Plus, 
  Radio, 
  Home, 
  TrendingDown, 
  BarChart3, 
  Terminal, 
  Sparkles,
  Layers
} from 'lucide-react';
import { AppTab } from '../types';

interface TabNavProps {
  tabs: AppTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onTogglePin: (tabId: string) => void;
}

export const TabNav: React.FC<TabNavProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onTogglePin
}) => {
  const getTabIcon = (appId: string) => {
    switch (appId) {
      case 'signalcatcher':
        return <Radio className="w-3.5 h-3.5 text-cyan-400" />;
      case 'smarthome':
        return <Home className="w-3.5 h-3.5 text-emerald-400" />;
      case 'followers':
        return <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
      case 'creatordash':
        return <BarChart3 className="w-3.5 h-3.5 text-purple-400" />;
      case 'fastapi':
        return <Terminal className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  return (
    <div className="bg-[#09090b] border-b border-zinc-800/80 px-4 pt-2.5 pb-2 flex items-center gap-2 overflow-x-auto scrollbar-none select-none">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all border ${
                isActive
                  ? 'bg-zinc-800/90 border-zinc-700 text-zinc-100 shadow-sm shadow-black/40 z-10'
                  : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
              }`}
            >
              {/* Active Dot */}
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              )}

              {/* Icon */}
              <span>{getTabIcon(tab.appId)}</span>

              {/* Title */}
              <span className="truncate max-w-32 sm:max-w-44 font-mono text-[12px]">
                {tab.title}
              </span>

              {/* Pin Indicator */}
              {tab.isPinned ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(tab.id);
                  }}
                  className="text-indigo-400 hover:text-indigo-200 p-0.5"
                  title="Unpin tab"
                >
                  <Pin className="w-3 h-3 fill-indigo-400/20 rotate-45" />
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(tab.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 p-0.5 transition-opacity"
                  title="Pin tab"
                >
                  <Pin className="w-3 h-3" />
                </button>
              )}

              {/* Close Button (if not last or pinned) */}
              {!tab.isPinned && tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="opacity-60 group-hover:opacity-100 hover:bg-zinc-800 hover:text-rose-400 rounded p-0.5 text-zinc-400 transition-colors"
                  title="Fechar aba"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* App Workspace Count Badge */}
      <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-xl shrink-0">
        <Layers className="w-3.5 h-3.5 text-indigo-400" />
        <span>{tabs.length} Abas Bento</span>
      </div>
    </div>
  );
};
