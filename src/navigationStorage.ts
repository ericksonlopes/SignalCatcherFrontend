import {AppTab} from './types';

const WORKSPACE_KEY = 'signalcatcher_workspace_v1';
const SECTION_KEY = 'signalcatcher_section_v1';
const DEFAULT_TAB: AppTab = {id: 'tab-1', appId: 'signalcatcher', title: 'SignalCatcher Ingestor', icon: 'radio', isPinned: true};
const APP_IDS = new Set(['signalcatcher', 'diarization', 'demograph', 'smarthome', 'followers', 'creatordash', 'fastapi']);
export type CaptureSection = 'captures' | 'saved_channels' | 'sources' | 'tracking';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function readWorkspace(): {tabs: AppTab[]; activeTabId: string} {
    try {
        const value: unknown = JSON.parse(sessionStorage.getItem(WORKSPACE_KEY) || 'null');
        if (isRecord(value) && Array.isArray(value.tabs)) {
            const ids = new Set<string>();
            const tabs: AppTab[] = [];
            for (const item of value.tabs.slice(0, 50)) {
                if (!isRecord(item) || typeof item.id !== 'string' || !item.id || ids.has(item.id) ||
                    typeof item.appId !== 'string' || !APP_IDS.has(item.appId) ||
                    typeof item.title !== 'string' || typeof item.icon !== 'string') continue;
                ids.add(item.id);
                tabs.push({id: item.id, appId: item.appId, title: item.title, icon: item.icon, isPinned: item.isPinned === true});
            }
            if (tabs.length) return {tabs, activeTabId: tabs.find(tab => tab.id === value.activeTabId)?.id || tabs[0].id};
        }
    } catch {
        // Storage can be unavailable or contain an older navigation format.
    }
    return {tabs: [{...DEFAULT_TAB}], activeTabId: DEFAULT_TAB.id};
}

export function saveWorkspace(tabs: AppTab[], activeTabId: string): void {
    try {
        sessionStorage.setItem(WORKSPACE_KEY, JSON.stringify({
            tabs: tabs.map(({id, appId, title, icon, isPinned}) => ({id, appId, title, icon, isPinned})),
            activeTabId,
        }));
    } catch {
        // Navigation remains usable when browser storage is disabled.
    }
}

export function readCaptureSection(): CaptureSection {
    try {
        const value = sessionStorage.getItem(SECTION_KEY);
        if (value === 'saved_channels' || value === 'sources' || value === 'tracking') return value;
    } catch {
        // Fall back to the initial section when storage is unavailable.
    }
    return 'captures';
}

export function saveCaptureSection(section: CaptureSection): void {
    try {sessionStorage.setItem(SECTION_KEY, section);} catch {
        // Persistence is optional; navigation still works without storage.
    }
}
