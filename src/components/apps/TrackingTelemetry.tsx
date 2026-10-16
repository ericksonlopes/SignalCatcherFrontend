import React, {useEffect, useState} from 'react';
import {API_BASE_URL, apiFetch} from '../../api';
import {getTranslation} from '../../locales';
import {TranslationKeys} from '../../locales/pt';
import {LanguageMode} from '../../types';

interface JobTelemetry {
    id: string;
    pending: boolean;
    running: boolean;
    last_duration_seconds: number | null;
    last_error: string | null;
    runs: number;
    failures: number;
}

interface Metrics {
    oldest_queued_age_seconds: number;
    retries_exhausted: number;
    deletions_pending: number;
    expired_reservations: number;
    deletions_exhausted: number;
    jobs: JobTelemetry[];
}

interface TrackingTelemetryProps {
    readonly language: LanguageMode;
    readonly onAddLog: (source: string, level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}

interface CounterItem {
    readonly label: TranslationKeys;
    readonly value: number;
    readonly attention: boolean;
    readonly duration?: boolean;
}

const jobNames: Record<string, TranslationKeys> = {
    youtube_monitor_channels: 'monitorJob', youtube_extract_and_download: 'pipelineJob',
    youtube_extract_metadata: 'metadataJob', youtube_download_videos: 'downloadJob',
    youtube_process_errors: 'retryJob', youtube_promote_scheduled: 'scheduledJob',
    youtube_delete_contents: 'deletionJob',
};

function formatDuration(seconds: number): string {
    const rounded = Math.max(0, Math.round(seconds));
    if (rounded < 60) return `${rounded} s`;
    if (rounded < 3600) return `${Math.floor(rounded / 60)} min ${rounded % 60} s`;
    return `${Math.floor(rounded / 3600)} h ${Math.floor((rounded % 3600) / 60)} min`;
}

function getWorkerStatusKey(workerReady: boolean | null): TranslationKeys {
    if (workerReady === null) return 'checkingHealth';
    if (workerReady) return 'workerReady';
    return 'workerUnavailable';
}

function getJobStatusClass(job: JobTelemetry): string {
    if (job.running) return 'text-blue-400';
    if (job.pending) return 'text-amber-400';
    if (job.last_error) return 'text-rose-400';
    return 'text-zinc-400';
}

function getJobStatusKey(job: JobTelemetry): TranslationKeys {
    if (job.running) return 'jobRunning';
    if (job.pending) return 'jobQueued';
    if (job.last_error) return 'jobFailed';
    return 'jobIdle';
}

function getJobActionKey(job: JobTelemetry, requesting: string | null): TranslationKeys {
    if (requesting === job.id || job.pending) return 'jobQueued';
    if (job.running) return 'jobRunning';
    return 'jobRun';
}

interface JobsTableProps {
    readonly jobs: readonly JobTelemetry[];
    readonly requesting: string | null;
    readonly onRequestJob: (id: string) => void;
    readonly t: (key: TranslationKeys) => string;
}

function JobsTable({jobs, requesting, onRequestJob, t}: Readonly<JobsTableProps>) {
    return (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-left text-xs">
                <caption className="sr-only">{t('trackingJobsTitle')}</caption>
                <thead className="bg-zinc-950/50 text-zinc-400">
                <tr>
                    <th scope="col" className="p-3 font-medium">{t('jobName')}</th>
                    <th scope="col" className="p-3 font-medium">{t('jobRuns')}</th>
                    <th scope="col" className="p-3 font-medium">{t('jobFailures')}</th>
                    <th scope="col" className="p-3 font-medium whitespace-nowrap">{t('jobLastDuration')}</th>
                    <th scope="col"><span className="sr-only">{t('jobRun')}</span></th>
                </tr>
                </thead>
                <tbody>{jobs.map(job => {
                    const jobName = jobNames[job.id] ? t(jobNames[job.id]) : job.id;
                    const statusClass = getJobStatusClass(job);
                    const statusKey = getJobStatusKey(job);
                    const actionKey = getJobActionKey(job, requesting);
                    return (
                        <tr key={job.id} className="border-t border-zinc-800 align-top hover:bg-zinc-800/30">
                            <td className="p-3 min-w-48">
                                <p className="font-medium">{jobName}</p>
                                <p className={`text-xs mt-1 ${statusClass}`}>{t(statusKey)}</p>
                                {job.last_error && <details className="mt-2 text-rose-400">
                                    <summary className="cursor-pointer">{t('errorDetails')}</summary>
                                    <p className="mt-2 max-w-md break-words whitespace-pre-wrap">{job.last_error}</p>
                                </details>}
                            </td>
                            <td className="p-3 tabular-nums">{job.runs}</td>
                            <td className={`p-3 tabular-nums ${job.failures > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>{job.failures}</td>
                            <td className="p-3 whitespace-nowrap tabular-nums">{job.last_duration_seconds === null ? '—' : formatDuration(job.last_duration_seconds)}</td>
                            <td className="p-3">
                                <button disabled={requesting !== null || job.pending || job.running}
                                        aria-label={`${t('jobRun')}: ${jobName}`}
                                        onClick={() => onRequestJob(job.id)}
                                        className="px-3 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">{t(actionKey)}</button>
                            </td>
                        </tr>
                    );
                })}</tbody>
            </table>
        </div>
    );
}

export function TrackingTelemetry({language, onAddLog}: Readonly<TrackingTelemetryProps>) {
    const {t} = getTranslation(language);
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [workerReady, setWorkerReady] = useState<boolean | null>(null);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [requesting, setRequesting] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        let loading = false;

        async function refresh() {
            if (loading) return;
            loading = true;
            try {
                const health = await apiFetch(`${API_BASE_URL}/ready`);
                if (active) setWorkerReady(health.ok);
                const response = await apiFetch(`${API_BASE_URL}/metrics`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json() as Metrics;
                if (active) {
                    setMetrics(data);
                    setUpdatedAt(new Date());
                    setError('');
                }
            } catch (reason) {
                if (active) {
                    setWorkerReady(false);
                    setMetrics(null);
                    setError(reason instanceof Error ? reason.message : String(reason));
                }
            } finally {
                loading = false;
            }
        }

        void refresh();
        const interval = window.setInterval(() => void refresh(), 5000);
        return () => {
            active = false;
            window.clearInterval(interval);
        };
    }, [language]);

    async function requestJob(id: string) {
        setRequesting(id);
        setMessage('');
        setError('');
        try {
            const response = await apiFetch(`${API_BASE_URL}/api/youtube/scheduler/jobs/${encodeURIComponent(id)}/run`, {method: 'POST'});
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            setMessage(t('jobQueued'));
            setMetrics(previous => previous ? {...previous, jobs: previous.jobs.map(job => job.id === id ? {...job, pending: true} : job)} : previous);
            onAddLog('SignalCatcher', 'success', `${jobNames[id] ? t(jobNames[id]) : id}: ${t('jobQueued')}`);
        } catch (reason) {
            const details = reason instanceof Error ? reason.message : String(reason);
            setError(details);
            onAddLog('SignalCatcher', 'error', details);
        } finally {
            setRequesting(null);
        }
    }

    const counters: CounterItem[] = metrics ? [
        {label: 'queueOldestAge', value: metrics.oldest_queued_age_seconds, attention: false, duration: true},
        {label: 'queueExhausted', value: metrics.retries_exhausted, attention: metrics.retries_exhausted > 0},
        {label: 'queueDeletions', value: metrics.deletions_pending, attention: false},
        {label: 'queueExpired', value: metrics.expired_reservations, attention: metrics.expired_reservations > 0},
        {label: 'queueDeletionExhausted', value: metrics.deletions_exhausted, attention: metrics.deletions_exhausted > 0},
    ] : [];

    return <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
                <h3 className="text-sm font-semibold">{t('trackingJobsTitle')}</h3>
                {updatedAt && <p className="text-xs text-zinc-400 mt-1">{t('lastUpdated')} · {updatedAt.toLocaleTimeString(language === 'pt' ? 'pt-BR' : 'en-US')}</p>}
            </div>
            <output className={`rounded-full px-3 py-1.5 text-xs font-medium border ${workerReady === true ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-amber-400 border-amber-500/30 bg-amber-500/10'}`}>
                {t(getWorkerStatusKey(workerReady))}
            </output>
        </div>
        {error && <p role="alert" className="rounded-xl p-3 border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs break-words">{error}</p>}
        {message && <output className="text-emerald-400 text-sm">{message}</output>}
        {metrics && <>
            <dl className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-5 gap-3">
                {counters.map(counter => <div key={counter.label} className={`rounded-xl border p-4 ${counter.attention ? 'border-rose-500/30 bg-rose-500/5' : 'border-zinc-800 bg-zinc-950/50'}`}>
                    <dt className="text-xs text-zinc-400">{t(counter.label)}</dt>
                    <dd className={`text-2xl font-semibold mt-2 tabular-nums ${counter.attention ? 'text-rose-400' : 'text-zinc-100'}`}>{counter.duration ? formatDuration(counter.value) : counter.value}</dd>
                </div>)}
            </dl>
            <JobsTable jobs={metrics.jobs} requesting={requesting} onRequestJob={(id) => void requestJob(id)} t={t} />
        </>}
    </section>;
}

