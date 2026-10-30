import React, {useDeferredValue, useEffect, useState} from 'react';
import {Cloud, History, Loader2, Pause, Play, RefreshCw} from 'lucide-react';
import {getTranslation} from '../../locales';
import {TranslationKeys} from '../../locales/pt';
import {DriveOAuthStatus, LanguageMode, StorageMode, StoragePage, StorageSummary, StorageTransfer} from '../../types';
import {storageRequest} from '../../storageApi';
import {locationKeys, StorageBadge, StorageHistory} from './StorageDetails';

const stateKeys: Record<string, TranslationKeys> = {
    PENDING: 'storagePending', RUNNING: 'storageRunning', COMPLETED: 'storageCompleted',
    ERROR: 'storageError', MISSING_FILE: 'storageMissing',
};
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed';
const inputClass = 'rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-sky-500';

export function formatStorageBytes(bytes?: number | null): string {
    if (bytes == null) return '—';
    if (bytes < 1024) return `${bytes} B`;
    const unit = Math.min(4, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / 1024 ** unit).toFixed(unit > 1 ? 1 : 0)} ${['B', 'KiB', 'MiB', 'GiB', 'TiB'][unit]}`;
}

export function StoragePanel({language}: Readonly<{ language: LanguageMode }>) {
    const {t} = getTranslation(language);
    const [summary, setSummary] = useState<StorageSummary | null>(null);
    const [oauth, setOAuth] = useState<DriveOAuthStatus | null>(null);
    const [data, setData] = useState<StoragePage<StorageTransfer> | null>(null);
    const [mode, setMode] = useState<StorageMode>('BOTH');
    const [limit, setLimit] = useState('');
    const [initialized, setInitialized] = useState(false);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('');
    const [location, setLocation] = useState('');
    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search);
    const [selected, setSelected] = useState<string[]>([]);
    const [historyId, setHistoryId] = useState<string | null>(null);
    const [updated, setUpdated] = useState<Date | null>(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [refresh, setRefresh] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setData(null);
        let loading = false;

        async function poll() {
            if (loading) return;
            loading = true;
            try {
                const params = new URLSearchParams({page: String(page), limit: '25', search: deferredSearch});
                if (status) params.set('status', status);
                if (location) params.set('location', location);
                const [nextSummary, nextData, nextOAuth] = await Promise.all([
                    storageRequest<StorageSummary>('drive-backups/summary', {signal: controller.signal}),
                    storageRequest<StoragePage<StorageTransfer>>(`drive-backups?${params}`, {signal: controller.signal}),
                    storageRequest<DriveOAuthStatus>('drive-oauth/status', {signal: controller.signal}),
                ]);
                if (controller.signal.aborted) return;
                setSummary(nextSummary);
                setData(nextData);
                setUpdated(new Date());
                setError('');
                setOAuth(nextOAuth);
                if (!initialized) {
                    setMode(nextSummary.mode);
                    setLimit(nextSummary.max_upload_mib_per_second == null ? '' : String(nextSummary.max_upload_mib_per_second));
                    setInitialized(true);
                }
            } catch (reason) {
                if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : t('storageRequestError'));
            } finally {
                loading = false;
            }
        }

        void poll();
        const timer = window.setInterval(() => void poll(), 5000);
        return () => {
            controller.abort();
            window.clearInterval(timer);
        };
    }, [page, status, location, deferredSearch, refresh, initialized]);

    useEffect(() => {
        setSelected([]);
    }, [page, status, location, deferredSearch]);

    async function action(path: string, body: object, success: TranslationKeys, method = 'POST') {
        setBusy(true);
        setMessage('');
        setError('');
        try {
            await storageRequest(path, {method, body: JSON.stringify(body)});
            setMessage(t(success));
            setSelected([]);
            setRefresh(value => value + 1);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : t('storageRequestError'));
        } finally {
            setBusy(false);
        }
    }

    const restorable = [...new Set((data?.items || []).filter(row => row.drive_url && row.storage_location !== 'BOTH').map(row => row.external_id))];
    const counterKeys: TranslationKeys[] = ['storagePending', 'storageRunning', 'storageCompleted', 'storageError', 'storageMissing'];
    const states = ['PENDING', 'RUNNING', 'COMPLETED', 'ERROR', 'MISSING_FILE'];
    const dateLocale = language === 'pt' ? 'pt-BR' : 'en-US';

    return <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6 space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3"><Cloud className="size-6 text-sky-400 shrink-0 mt-1"/>
                <div>
                    <h3 className="text-base font-semibold">{t('storageTitle')}</h3>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xl">{t('storageDescription')}</p>
                    {updated &&
                        <p className="text-xs text-zinc-500 mt-1">{t('storageUpdated')} · {updated.toLocaleTimeString(dateLocale)}</p>}
                </div>
            </div>
            <button className={buttonClass} disabled={busy} onClick={() => setRefresh(value => value + 1)}><RefreshCw
                className="size-3.5"/>{t('storageRefresh')}</button>
        </header>
        {error && <p role="alert"
                     className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 p-3 text-xs break-words">{error}</p>}
        {message && <p role="status" className="text-emerald-300 text-xs">{message}</p>}
        {!summary && !error && <p className="flex items-center gap-2 text-zinc-400 text-xs"><Loader2
            className="size-4 animate-spin"/>{t('storageLoading')}</p>}
        {summary && <>
            <div
                className={`rounded-xl border p-3 text-xs ${summary.drive_ready ? 'border-sky-500/25 bg-sky-500/5 text-sky-200' : 'border-amber-500/25 bg-amber-500/5 text-amber-200'}`}>
                <p className="font-medium">{t(summary.drive_ready ? 'storageReady' : 'storageAuthPending')}{summary.drive_info.account && ` · ${summary.drive_info.account}`}</p>
                {!summary.drive_ready && <p className="mt-1 text-zinc-400">{t('storageSetupHelp')}</p>}
                {oauth?.configured && oauth.connect_url && <div className="mt-3 space-y-2">
                    <a href={oauth.connect_url} target="_blank" rel="noopener noreferrer"
                       className={`${buttonClass} border-sky-500/40 bg-sky-500/10 text-sky-200`}>
                        <Cloud className="size-4"/>{t(summary.drive_ready ? 'storageReconnect' : 'storageConnect')}
                    </a>
                    <p className="text-xs text-zinc-400">{t('storageOAuthConsent')}</p>
                </div>}
                {oauth && !oauth.configured && <details className="mt-3 text-zinc-400">
                    <summary className="cursor-pointer text-amber-200">{t('storageOAuthSetup')}</summary>
                    <p className="mt-2 leading-relaxed">{t('storageOAuthInstructions')}</p>
                    <p className="mt-3">{t('storageOAuthRedirect')}</p>
                    <code className="block mt-1 select-all break-all text-zinc-200">{oauth.redirect_uri}</code>
                    <a href="https://console.cloud.google.com/apis/credentials?project=signalcatcher-505023"
                       target="_blank" rel="noopener noreferrer"
                       className="inline-block mt-3 underline text-sky-300">{t('storageOAuthConsole')}</a>
                </details>}
                {summary.last_error && <p className="mt-2 whitespace-pre-wrap break-words">{summary.last_error}</p>}
                {summary.drive_info.folder_url &&
                    <a className="inline-block mt-2 underline" href={summary.drive_info.folder_url} target="_blank"
                       rel="noopener noreferrer">{summary.drive_info.folder_name || t('storageOpenDrive')}</a>}
            </div>
            <form onSubmit={event => {
                event.preventDefault();
                void action('storage-settings', {
                    mode, max_upload_mib_per_second: limit === '' ? null : Number(limit),
                }, 'storageSaved', 'PATCH');
            }} className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4 space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-2 text-xs text-zinc-400">{t('storageMode')}
                        <select className={inputClass} value={mode} disabled={busy}
                                onChange={event => setMode(event.target.value as StorageMode)}>
                            <option value="LOCAL">{t('storageLocal')}</option>
                            <option value="BOTH">{t('storageBoth')}</option>
                            <option value="DRIVE" disabled={!summary.drive_ready}>{t('storageDrive')}</option>
                        </select>
                    </label>
                    <label className="flex flex-col gap-2 text-xs text-zinc-400">{t('storageLimit')}
                        <input type="number" min="0.1" max="10000" step="0.1" className={inputClass} value={limit}
                               disabled={busy}
                               placeholder={t('storageUnlimited')} onChange={event => setLimit(event.target.value)}/>
                    </label>
                    <button type="submit" disabled={busy || !initialized}
                            className={`${buttonClass} bg-sky-500/10 text-sky-300 border-sky-500/30`}>{t('storageSave')}</button>
                    <button type="button" disabled={busy} className={buttonClass}
                            onClick={() => void action('storage-settings', {uploads_paused: !summary.uploads_paused}, 'storageSaved', 'PATCH')}>
                        {summary.uploads_paused ? <Play className="size-3.5"/> :
                            <Pause className="size-3.5"/>}{t(summary.uploads_paused ? 'storageResume' : 'storagePause')}
                    </button>
                </div>
                <p className="text-xs text-zinc-500">{t('storageKeepExisting')}</p>
                {summary.uploads_paused && <p className="text-xs text-amber-300">{t('storagePaused')}</p>}
            </form>
            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[['storageFree', formatStorageBytes(summary.drive_info.free_bytes)],
                    ['storageUsed', formatStorageBytes(summary.drive_info.used_bytes)],
                    ['storageQueuedBytes', formatStorageBytes(summary.queued_bytes)],
                    ['storageCatalog', summary.catalog_updated_at ? new Date(summary.catalog_updated_at).toLocaleString(dateLocale) : t('storageCatalogPending')]].map(([key, value]) =>
                    <div key={key} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                        <dt className="text-xs text-zinc-500">{t(key as TranslationKeys)}</dt>
                        <dd className="text-sm font-medium mt-2 break-words">{value}</dd>
                    </div>)}
            </dl>
            {summary.catalog_error && <p role="alert"
                                         className="text-xs text-amber-300 break-words">{t('storageCatalog')}: {summary.catalog_error}</p>}
            <div className="flex flex-wrap gap-2">{Object.entries(locationKeys).map(([key, label]) => <span key={key}
                                                                                                            className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">{t(label)} · {summary.locations[key] || 0}</span>)}</div>
            <dl className="grid grid-cols-2 sm:grid-cols-5 gap-2">{states.map((state, index) => <div key={state}
                                                                                                     className="rounded-lg bg-zinc-950/50 border border-zinc-800 p-3">
                <dt className="text-xs text-zinc-500">{t(counterKeys[index])}</dt>
                <dd className={`text-xl font-semibold tabular-nums mt-1 ${state === 'ERROR' ? 'text-rose-300' : 'text-zinc-100'}`}>{summary.transfers[state] || 0}</dd>
            </div>)}</dl>
            <div className="flex flex-wrap gap-2 items-center">
                <input className={`${inputClass} flex-1 min-w-40`} aria-label={t('storageSearch')}
                       placeholder={t('storageSearch')} value={search} onChange={event => {
                    setSearch(event.target.value);
                    setPage(1);
                }}/>
                <select aria-label={t('storageAllStates')} className={inputClass} value={status} onChange={event => {
                    setStatus(event.target.value);
                    setPage(1);
                }}>
                    <option value="">{t('storageAllStates')}</option>
                    {states.map(state => <option key={state}
                                                 value={state}>{t(stateKeys[state])} ({summary.transfers[state] || 0})</option>)}
                </select>
                <select aria-label={t('storageAllLocations')} className={inputClass} value={location}
                        onChange={event => {
                            setLocation(event.target.value);
                            setPage(1);
                        }}>
                    <option value="">{t('storageAllLocations')}</option>
                    {Object.entries(locationKeys).map(([key, label]) => <option key={key}
                                                                                value={key}>{t(label)} ({summary.locations[key] || 0})</option>)}
                </select>
                <button disabled={busy} className={buttonClass}
                        onClick={() => void action('drive-backups/retry-errors', {}, 'storageRetryQueued')}>{t('storageRetry')}</button>
                <button disabled={busy || selected.length === 0} className={buttonClass}
                        onClick={() => void action('drive-backups/restore', {external_ids: selected}, 'storageRestoreQueued')}>{t('storageRestoreSelected')} ({selected.length})
                </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full text-left text-xs">
                    <caption className="sr-only">{t('storageTitle')}</caption>
                    <thead className="bg-zinc-950/60 text-zinc-400">
                    <tr>
                        <th className="p-3"><input type="checkbox" aria-label={t('storageSelectAll')}
                                                   checked={restorable.length > 0 && restorable.every(id => selected.includes(id))}
                                                   disabled={busy || !restorable.length}
                                                   onChange={event => setSelected(event.target.checked ? restorable : [])}/>
                        </th>
                        <th className="p-3">{t('storageVideo')}</th>
                        <th className="p-3">{t('storageOperation')}</th>
                        <th className="p-3">{t('storageProgress')}</th>
                        <th className="p-3">{t('storageActions')}</th>
                    </tr>
                    </thead>
                    <tbody>{data?.items.map(row => <tr key={row.id}
                                                       className="border-t border-zinc-800 align-top hover:bg-zinc-800/20">
                        <td className="p-3"><input type="checkbox" aria-label={`${t('storageSelect')}: ${row.title}`}
                                                   checked={selected.includes(row.external_id)}
                                                   disabled={busy || !restorable.includes(row.external_id)}
                                                   onChange={event => setSelected(current => event.target.checked ? [...new Set([...current, row.external_id])] : current.filter(id => id !== row.external_id))}/>
                        </td>
                        <td className="p-3 min-w-64 max-w-sm"><p
                            className="font-medium text-zinc-200 line-clamp-2">{row.title}</p><p
                            className="text-zinc-500 mt-1">{row.origin} · {row.external_id}</p>
                            <div className="mt-2"><StorageBadge location={row.storage_location} language={language}/>
                            </div>
                        </td>
                        <td className="p-3"><p>{t(row.operation === 'UPLOAD' ? 'storageUpload' : 'storageRestore')}</p>
                            <p className={`mt-1 ${row.status === 'ERROR' || row.status === 'MISSING_FILE' ? 'text-rose-300' : 'text-zinc-500'}`}>{t(stateKeys[row.status])}</p>
                        </td>
                        <td className="p-3 min-w-40">
                            <progress className="w-full accent-sky-500" max={Math.max(1, row.total_bytes)}
                                      value={row.bytes_transferred}
                                      aria-label={`${t('storageProgress')}: ${row.title}`}/>
                            <p className="mt-1 tabular-nums text-zinc-400">{formatStorageBytes(row.bytes_transferred)} / {formatStorageBytes(row.total_bytes)}</p>{row.error &&
                            <details className="mt-2 text-rose-300">
                                <summary className="cursor-pointer">{t('errorDetails')}</summary>
                                <p className="mt-1 max-w-sm break-words whitespace-pre-wrap">{row.error}</p></details>}
                        </td>
                        <td className="p-3">
                            <div className="flex flex-col gap-2 items-start">
                                {row.drive_url && <a href={row.drive_url} target="_blank" rel="noopener noreferrer"
                                                     className="text-sky-300 hover:underline whitespace-nowrap">{t('storageOpenDrive')}</a>}
                                <button className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-100"
                                        onClick={() => setHistoryId(row.external_id)}><History
                                    className="size-3.5"/>{t('storageHistory')}</button>
                                {restorable.includes(row.external_id) && <button disabled={busy} className={buttonClass}
                                                                                 onClick={() => void action('drive-backups/restore', {external_ids: [row.external_id]}, 'storageRestoreQueued')}>{t('storageRestore')}</button>}
                            </div>
                        </td>
                    </tr>)}</tbody>
                </table>
                {data?.items.length === 0 &&
                    <p className="p-6 text-center text-xs text-zinc-500">{t('storageNoTransfers')}</p>}
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-400">
                <button className={buttonClass} disabled={page === 1}
                        onClick={() => setPage(page - 1)}>{t('storagePrevious')}</button>
                <span>{page} / {Math.max(1, Math.ceil((data?.total || 0) / 25))} · {data?.total || 0}</span>
                <button className={buttonClass} disabled={!data || page * 25 >= data.total}
                        onClick={() => setPage(page + 1)}>{t('storageNext')}</button>
            </div>
        </>}
        {historyId && <StorageHistory externalId={historyId} language={language} onClose={() => setHistoryId(null)}/>}
    </section>;
}
