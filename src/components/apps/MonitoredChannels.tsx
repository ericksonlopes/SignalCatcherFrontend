import React, {useState} from 'react';
import {ExternalLink, Loader2, Pause, Play, Plus, Radio, Search, X} from 'lucide-react';
import {ContentSource, LanguageMode} from '../../types';
import {getTranslation} from '../../locales';

interface MonitoredChannelsProps {
    sources: ContentSource[];
    language: LanguageMode;
    onToggle: (id: string) => Promise<void>;
    onAdd: () => void;
}

type ChannelFilter = 'all' | 'active' | 'paused' | 'error';

function channelAddress(source: ContentSource): string {
    try {
        const url = new URL(source.url);
        return `${url.hostname.replace(/^www\./, '')}${decodeURIComponent(url.pathname).replace(/\/$/, '')}`;
    } catch {return source.channelId || source.url;}
}

export const MonitoredChannels: React.FC<MonitoredChannelsProps> = ({sources, language, onToggle, onAdd}) => {
    const {t} = getTranslation(language);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<ChannelFilter>('all');
    const [pending, setPending] = useState<Set<string>>(new Set());
    const active = sources.filter(source => source.status === 'active').length;
    const errors = sources.filter(source => source.status === 'error').length;
    const counts: Record<ChannelFilter, number> = {all: sources.length, active, error: errors, paused: sources.length - active - errors};
    const needle = query.trim().toLocaleLowerCase();
    const visible = sources.filter(source => {
        const status = source.status === 'active' ? 'active' : source.status === 'error' ? 'error' : 'paused';
        return (filter === 'all' || filter === status) &&
            `${source.name} ${source.channelId} ${source.url}`.toLocaleLowerCase().includes(needle);
    });
    const clearFilters = () => {setQuery(''); setFilter('all');};
    async function toggle(id: string): Promise<void> {
        if (pending.has(id)) return;
        setPending(previous => new Set(previous).add(id));
        try {await onToggle(id);} finally {
            setPending(previous => {const next = new Set(previous); next.delete(id); return next;});
        }
    }

    return <section className="space-y-4" aria-labelledby="monitored-heading">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 row-span-2">
                <h3 id="monitored-heading" className="text-sm font-semibold text-zinc-100">{t('monitoredSources')}</h3>
                <p className="mt-1 text-xs text-zinc-400">{t('monitoredDescription')}</p>
            </div>
            <button onClick={onAdd} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500 shrink-0">
                <Plus className="size-4" />{t('monitoredAdd')}
            </button>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="p-3 border-b border-zinc-800 flex flex-col lg:flex-row gap-3 lg:items-center">
                <label className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 lg:max-w-sm w-full focus-within:border-indigo-500/50">
                    <Search className="size-4 text-zinc-400 shrink-0" />
                    <input value={query} onChange={event => setQuery(event.target.value)} aria-label={t('monitoredSearch')}
                        placeholder={t('monitoredSearch')} className="bg-transparent text-xs text-zinc-100 min-w-0 w-full outline-none" />
                    {query && <button onClick={() => setQuery('')} aria-label={t('monitoredClearFilters')} className="text-zinc-400"><X className="size-3.5" /></button>}
                </label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                    {(['all', 'active', 'paused', 'error'] as const).map(value => <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value}
                        className={`flex items-center gap-2 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs ${filter === value ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'border-transparent text-zinc-400 hover:bg-zinc-800'}`}>
                        {t(value === 'all' ? 'monitoredAll' : value === 'active' ? 'monitoredActive' : value === 'error' ? 'monitoredError' : 'monitoredPaused')}
                        <span className="tabular-nums text-[11px] rounded-md bg-zinc-800 px-1.5 py-0.5">{counts[value]}</span>
                    </button>)}
                </div>
            </div>
            {visible.length ? <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 p-3">{visible.map(source => {
                const isActive = source.status === 'active';
                const isError = source.status === 'error';
                const busy = pending.has(source.id);
                return <li key={source.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1.5 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 hover:border-zinc-700 transition-colors min-w-0">
                    <div aria-hidden="true" className="row-span-2 size-8 flex items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-800 text-zinc-300 text-xs font-semibold shrink-0">{source.name.trim().slice(0, 2).toLocaleUpperCase() || 'YT'}</div>
                    <div className="min-w-0 row-span-2">
                        <p className="text-xs font-semibold text-zinc-100 truncate" title={source.name}>{source.name}</p>
                        <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${t('monitoredOpenChannel')}: ${source.name}`}
                            className="mt-1 inline-flex max-w-full items-center gap-1.5 text-[11px] text-zinc-400 hover:text-indigo-400">
                            <span className="truncate">{channelAddress(source)}</span><ExternalLink className="size-3 shrink-0" />
                        </a>
                    </div>
                    <span className={`col-start-3 row-start-1 justify-self-end inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-medium ${isActive ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : isError ? 'border-rose-500/20 bg-rose-500/5 text-rose-400' : 'border-amber-500/20 bg-amber-500/5 text-amber-400'}`}>
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{t(isActive ? 'monitoredActive' : isError ? 'monitoredError' : 'monitoredPaused')}
                    </span>
                    <button disabled={busy} onClick={() => void toggle(source.id)} aria-label={`${t(isActive ? 'monitoredPause' : 'monitoredResume')}: ${source.name}`}
                        className="col-start-3 row-start-2 inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-wait justify-self-end">
                        {busy ? <Loader2 className="size-3.5 animate-spin" /> : isActive ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                        {t(busy ? 'monitoredUpdating' : isActive ? 'monitoredPause' : 'monitoredResume')}
                    </button>
                </li>;
            })}</ul> : <div className="px-4 py-12 text-center">
                <Radio className="size-6 mx-auto mb-3 text-zinc-500" />
                <p className="text-sm font-medium text-zinc-200">{t(sources.length ? 'monitoredNoResults' : 'monitoredEmpty')}</p>
                <p className="mt-1 text-xs text-zinc-400">{!sources.length && t('monitoredEmptyHelp')}</p>
                <button onClick={sources.length ? clearFilters : onAdd} className="mt-4 text-xs text-indigo-400 hover:underline">{t(sources.length ? 'monitoredClearFilters' : 'monitoredAdd')}</button>
            </div>}
            <p className="border-t border-zinc-800 px-4 py-2 text-[11px] text-zinc-400">{t('monitoredShowing')}: {visible.length} / {sources.length}</p>
        </div>
    </section>;
};
