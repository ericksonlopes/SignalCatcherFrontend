import React, {useMemo, useState} from 'react';
import {ExternalLink, Search, Video, X, Youtube} from 'lucide-react';
import {ContentSource, LanguageMode} from '../../types';
import {getTranslation} from '../../locales';

export const SavedChannels: React.FC<{channels: ContentSource[]; language: LanguageMode}> = ({channels, language}) => {
    const {t} = getTranslation(language);
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<'name' | 'videos'>('name');
    const visible = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase();
        return channels.filter(channel => `${channel.name} ${channel.channelId} ${channel.url} ${channel.channelUrl || ''}`.toLocaleLowerCase().includes(needle))
            .sort((a, b) => (sort === 'videos' ? b.totalCaptured - a.totalCaptured : 0) || a.name.localeCompare(b.name, language, {sensitivity: 'base'}));
    }, [channels, query, sort, language]);

    return <section className="space-y-4" aria-labelledby="saved-channels-heading">
        <div>
            <h3 id="saved-channels-heading" className="text-sm font-semibold text-zinc-100">{t('savedChannels')}</h3>
            <p className="mt-1 text-xs text-zinc-400">{t('savedChannelsDescription')}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="p-3 border-b border-zinc-800 flex flex-col sm:flex-row gap-3 sm:items-center">
                <label className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 sm:max-w-sm w-full focus-within:border-indigo-500/50">
                    <Search className="size-4 text-zinc-400 shrink-0" />
                    <input value={query} onChange={event => setQuery(event.target.value)} aria-label={t('monitoredSearch')}
                        placeholder={t('monitoredSearch')} className="bg-transparent text-xs text-zinc-100 min-w-0 w-full outline-none" />
                    {query && <button onClick={() => setQuery('')} aria-label={t('monitoredClearFilters')} className="text-zinc-400"><X className="size-3.5" /></button>}
                </label>
                <select aria-label={t('savedChannelsSort')} value={sort} onChange={event => setSort(event.target.value === 'videos' ? 'videos' : 'name')}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
                    <option value="name">{t('savedChannelsSortName')}</option>
                    <option value="videos">{t('savedChannelsSortVideos')}</option>
                </select>
            </div>
            {visible.length ? <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 p-3">
                {visible.map(channel => {
                    const url = channel.channelUrl || channel.url || `https://www.youtube.com/${channel.channelId.startsWith('UC') ? 'channel/' : '@'}${channel.channelId.replace(/^@/, '')}`;
                    return <li key={channel.id} className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 hover:border-zinc-700 transition-colors min-w-0">
                        <div aria-hidden="true" className="size-8 flex items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-800 text-zinc-300 text-xs font-semibold shrink-0">{channel.name.trim().slice(0, 2).toLocaleUpperCase() || 'YT'}</div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-zinc-100 truncate" title={channel.name}>{channel.name}</p>
                            <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${t('monitoredOpenChannel')}: ${channel.name}`}
                                title={url} className="mt-1 inline-flex max-w-full items-center gap-1.5 text-[11px] text-zinc-400 hover:text-indigo-400">
                                <span className="truncate">{channel.channelId}</span><ExternalLink className="size-3 shrink-0" />
                            </a>
                        </div>
                        <div title={t('vidsSaved')} className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-right">
                            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-200 tabular-nums font-medium"><Video aria-hidden="true" className="size-3 text-zinc-400" />{channel.totalCaptured.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US')}</span>
                            <p className="text-[10px] text-zinc-400">{t('vidsSaved')}</p>
                        </div>
                    </li>;
                })}
            </ul> : <div className="px-4 py-12 text-center">
                <Youtube className="size-6 mx-auto mb-3 text-zinc-500" />
                <p className="text-sm font-medium text-zinc-200">{t(channels.length ? 'monitoredNoResults' : 'savedChannelsEmpty')}</p>
                {query && <button onClick={() => setQuery('')} className="mt-4 text-xs text-indigo-400 hover:underline">{t('monitoredClearFilters')}</button>}
            </div>}
            <p className="border-t border-zinc-800 px-4 py-2 text-[11px] text-zinc-400">{t('monitoredShowing')}: {visible.length} / {channels.length}</p>
        </div>
    </section>;
};
