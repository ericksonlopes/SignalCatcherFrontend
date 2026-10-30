import React, {useEffect, useRef, useState} from 'react';
import {Cloud, HardDrive, History, Loader2, X} from 'lucide-react';
import {getTranslation} from '../../locales';
import {TranslationKeys} from '../../locales/pt';
import {CapturedVideo, LanguageMode, StorageEvent, StorageLocation, StoragePage} from '../../types';
import {storageRequest} from '../../storageApi';

export const locationKeys: Record<string, TranslationKeys> = {
    LOCAL: 'storageLocal', DRIVE: 'storageDrive', BOTH: 'storageBoth', NONE: 'storageNone',
};

const eventKeys: Record<string, TranslationKeys> = {
    LOCATION_CHANGED: 'storageLocationChanged', LOCAL_SAVED: 'storageLocalSaved',
    TEMPORARY_SAVED: 'storageTemporarySaved', TEMPORARY_REMOVED: 'storageTemporaryRemoved',
    TEMPORARY_REMOVE_FAILED: 'storageTemporaryRemoveFailed',
    LOCAL_DELETED: 'storageLocalDeleted', UPLOAD_QUEUED: 'storageUploadQueued',
    UPLOAD_STARTED: 'storageUploadStarted', UPLOAD_COMPLETED: 'storageUploadCompleted',
    UPLOAD_FAILED: 'storageUploadFailed', UPLOAD_RETRY_QUEUED: 'storageUploadQueued',
    RESTORE_QUEUED: 'storageRestoreQueued', RESTORE_RETRY_QUEUED: 'storageRestoreQueued',
    RESTORE_STARTED: 'storageRestoreStarted', RESTORE_COMPLETED: 'storageRestoreCompleted',
    RESTORE_FAILED: 'storageRestoreFailed',
};

export function StorageBadge({location, language = 'en', translate}: Readonly<{
    location?: StorageLocation | null; language?: LanguageMode;
    translate?: (key: TranslationKeys) => string;
}>) {
    const t = translate || getTranslation(language).t;
    const cloud = location === 'DRIVE' || location === 'BOTH';
    return <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium ${
        cloud ? 'border-sky-500/30 bg-sky-500/10 text-sky-300' : 'border-zinc-700 bg-zinc-900 text-zinc-400'
    }`}>
    {cloud ? <Cloud className="size-3"/> : <HardDrive className="size-3"/>}
        {t(locationKeys[location || 'UNKNOWN'] || 'storageUnknown')}
  </span>;
}

export function StorageHistory({externalId, language, onClose}: Readonly<{
    externalId: string; language: LanguageMode; onClose: () => void;
}>) {
    const {t} = getTranslation(language);
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const element = dialog.current;
        element?.showModal();
        return () => element?.close();
    }, []);
    const [data, setData] = useState<StoragePage<StorageEvent> | null>(null);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    useEffect(() => {
        const controller = new AbortController();
        let loading = false;

        async function refresh() {
            if (loading) return;
            loading = true;
            try {
                const next = await storageRequest<StoragePage<StorageEvent>>(
                    `content/${encodeURIComponent(externalId)}/storage-history?page=${page}&limit=25`,
                    {signal: controller.signal},
                );
                if (!controller.signal.aborted) {
                    setData(next);
                    setError('');
                }
            } catch (reason) {
                if (!controller.signal.aborted) setError(String(reason instanceof Error ? reason.message : reason));
            } finally {
                loading = false;
            }
        }

        setData(null);
        void refresh();
        const timer = window.setInterval(() => void refresh(), 5000);
        return () => {
            controller.abort();
            window.clearInterval(timer);
        };
    }, [externalId, page]);
    return <dialog ref={dialog} onCancel={onClose} aria-modal="true" aria-label={t('storageHistory')}
                   className="fixed inset-0 z-[120] m-auto w-[min(95vw,48rem)] max-h-[85vh] rounded-2xl border border-zinc-700 bg-zinc-950 p-5 text-zinc-100 shadow-2xl overflow-y-auto backdrop:bg-black/60">
        <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold">{t('storageHistory')} · {externalId}</h3>
            <button onClick={onClose} aria-label={t('storageClose')} className="rounded-lg p-2 hover:bg-zinc-800"><X
                className="size-4"/></button>
        </div>
        {error && <p role="alert" className="text-rose-400 text-sm mb-3">{error}</p>}
        {!data && !error && <p className="text-zinc-400 text-sm">{t('storageLoading')}</p>}
        {data?.items.length === 0 && <p className="text-zinc-400 text-sm">{t('storageHistoryEmpty')}</p>}
        <ol className="space-y-3">{data?.items.map(item => <li key={item.id}
                                                               className="border-l-2 border-sky-500/40 pl-4 py-2">
            <p className="text-sm">{eventKeys[item.action] ? t(eventKeys[item.action]) : item.action}</p>
            <time dateTime={item.created_at}
                  className="text-xs text-zinc-500">{new Date(item.created_at).toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US')}</time>
            {item.new_location &&
                <p className="mt-1 text-xs text-sky-300">{item.previous_location && `${t(locationKeys[item.previous_location])} → `}{t(locationKeys[item.new_location])}</p>}
            {item.details && <p className="text-xs text-rose-300 mt-1 break-words">{item.details}</p>}
        </li>)}</ol>
        <div className="flex items-center justify-between mt-4 text-xs">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}
                    className="p-2 disabled:opacity-40">{t('storagePrevious')}</button>
            <span>{page} / {Math.max(1, Math.ceil((data?.total || 0) / 25))}</span>
            <button disabled={!data || page * 25 >= data.total} onClick={() => setPage(page + 1)}
                    className="p-2 disabled:opacity-40">{t('storageNext')}</button>
        </div>
    </dialog>;
}

export function StorageDetails({video, language}: Readonly<{ video: CapturedVideo; language: LanguageMode }>) {
    const {t} = getTranslation(language);
    const [history, setHistory] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');

    async function restore() {
        setBusy(true);
        setMessage('');
        try {
            await storageRequest('drive-backups/restore', {
                method: 'POST',
                body: JSON.stringify({external_ids: [video.id]})
            });
            setMessage(t('storageRestoreQueued'));
        } catch (reason) {
            setMessage(reason instanceof Error ? reason.message : t('storageRequestError'));
        } finally {
            setBusy(false);
        }
    }

    return <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-medium">{t('storageTitle')}</h4>
            <StorageBadge location={video.storageLocation} language={language}/>
        </div>
        {video.filePath && <div className="text-xs text-zinc-400 break-all"><p>{t('storageLocalPath')}</p><code
            className="text-zinc-200">{video.filePath}</code></div>}
        <div className="flex flex-wrap items-center gap-3 text-xs">
            {video.driveUrl && <a href={video.driveUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-sky-300 hover:underline">{t('storageOpenDrive')}</a>}
            {video.driveUrl && video.storageLocation !== 'BOTH' &&
                <button disabled={busy || video.deletionRequested} onClick={() => void restore()}
                        className="rounded-lg border border-zinc-700 px-3 py-2 disabled:opacity-40">{busy ?
                    <Loader2 className="size-4 animate-spin"/> : t('storageRestore')}</button>}
            <button onClick={() => setHistory(true)} className="flex items-center gap-1 text-zinc-300 hover:text-white">
                <History className="size-3.5"/>{t('storageHistory')}</button>
        </div>
        {message && <p role="status" className="text-xs text-sky-300">{message}</p>}
        {history && <StorageHistory externalId={video.id} language={language} onClose={() => setHistory(false)}/>}
    </section>;
}
