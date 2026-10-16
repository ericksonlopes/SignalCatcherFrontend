import React, {useEffect, useRef, useState} from 'react';
import {Bell, Search, Trash2, X} from 'lucide-react';
import {LanguageMode, SystemLog} from '../types';
import {getTranslation} from '../locales';
import {notificationStyle} from './notificationStyle';

interface NotificationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    logs: SystemLog[];
    onClearLogs: () => void;
    language?: LanguageMode;
}

type FilterLevel = 'all' | 'error' | 'warning' | 'info' | 'success';

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({isOpen, onClose, logs, onClearLogs, language = 'pt'}) => {
    const {t} = getTranslation(language);
    const panel = useRef<HTMLElement>(null);
    const close = useRef(onClose);
    close.current = onClose;
    const [filter, setFilter] = useState<FilterLevel>('all');
    const [query, setQuery] = useState('');

    const getFilterLabel = (lvl: FilterLevel) => {
        if (lvl === 'all') return t('notificationFilterAll');
        if (lvl === 'error') return t('notificationFilterErrors');
        if (lvl === 'warning') return t('notificationFilterWarnings');
        if (lvl === 'info') return t('notificationFilterInfo');
        return t('notificationFilterSuccess');
    };

    useEffect(() => {
        if (!isOpen) return;
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        panel.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {event.preventDefault(); close.current();}
            if (event.key !== 'Tab') return;
            const elements = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, [tabindex="0"]');
            if (!elements?.length) return;
            const first = elements[0]; const last = elements[elements.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
                event.preventDefault(); last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) {
                event.preventDefault(); first.focus();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = previousOverflow;
            previousFocus?.focus();
        };
    }, [isOpen]);

    if (!isOpen) return null;
    const search = query.trim().toLocaleLowerCase();
    const visible = logs.filter(log => (filter === 'all' || log.level === filter) &&
        `${log.sourceApp} ${log.message}`.toLocaleLowerCase().includes(search));

    return <div className="fixed inset-0 z-[130] flex justify-end">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} aria-hidden="true" />
        <aside role="dialog" aria-modal="true" ref={panel} tabIndex={-1} aria-labelledby="notifications-heading"
            className="relative z-10 flex w-full max-w-md flex-col bg-zinc-950 text-zinc-100 border-l border-zinc-800 shadow-2xl font-sans m-0 p-0 h-full">
            <header className="flex items-center gap-2 border-b border-zinc-800 p-4 shrink-0">
                <Bell aria-hidden="true" className="size-4 text-indigo-400 shrink-0" />
                <h2 id="notifications-heading" className="text-sm font-semibold flex-1 min-w-0">{t('notificationsTitle')}</h2>
                <button disabled={!logs.length} onClick={onClearLogs} aria-label={t('toastClearAll')} title={t('toastClearAll')}
                    className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"><Trash2 className="size-4" /></button>
                <button onClick={onClose} aria-label={t('notificationClose')} className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800"><X className="size-4" /></button>
            </header>
            <div className="p-4 border-b border-zinc-800 space-y-3 shrink-0">
                <label className="flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 bg-zinc-900/50">
                    <Search className="size-4 text-zinc-400 shrink-0" />
                    <input value={query} onChange={event => setQuery(event.target.value)} aria-label={t('notificationSearch')}
                        placeholder={t('notificationSearch')} className="w-full min-w-0 bg-transparent text-xs outline-none" />
                </label>
                <div className="flex gap-1.5 flex-wrap">
                    {(['all', 'error', 'warning', 'info', 'success'] as const).map(level => <button key={level} aria-pressed={filter === level} onClick={() => setFilter(level)}
                        className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${filter === level ? 'border-indigo-500/50 text-indigo-300 bg-indigo-500/20 font-medium' : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'}`}>
                        {getFilterLabel(level)}
                    </button>)}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
                {visible.length === 0 ? <p className="py-12 text-center text-xs text-zinc-400">{t('notificationEmpty')}</p> :
                    <ul className="space-y-2">{visible.map(log => {
                        const style = notificationStyle[log.level] ?? notificationStyle.info;
                        const {Icon, color, title} = style;
                        return <li key={log.id} className="flex gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                            <Icon aria-hidden="true" className={`size-4 shrink-0 mt-0.5 ${color}`} />
                            <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-start gap-2 text-[11px]">
                                    <span className="font-semibold text-zinc-200 break-words">{log.sourceApp}</span>
                                    <time className="text-zinc-400 shrink-0 tabular-nums">{log.timestamp}</time>
                                </div>
                                <span className={`text-[11px] ${color}`}>{t(title)}</span>
                                <p className="mt-1 text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap [overflow-wrap:anywhere]">{log.message}</p>
                            </div>
                        </li>;
                    })}</ul>}
            </div>
            <footer className="border-t border-zinc-800 px-4 py-3 text-xs text-zinc-400 shrink-0">{t('notificationSession')} · {visible.length}/{logs.length}</footer>
        </aside>
    </div>;
};
