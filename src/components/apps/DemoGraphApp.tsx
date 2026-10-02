import React, {useEffect, useRef, useState} from 'react';
import {Database, Download, FileJson, Loader2, Network, Play, RefreshCw, Trash2, X} from 'lucide-react';
import {API_BASE_URL, apiFetch} from '../../api';
import type {LanguageMode} from '../../types';
import type {DemoArtifact, DemoDataset, DemoDatasetId, DemoField, DemoFileSchema,
  DemoGraphSchema, DemoHealth, DemoNode, DemoRelationship, DemoRun, DemoRunStatus} from '../../demographTypes';
import {getTranslation} from '../../locales';
import type {TranslationKeys} from '../../locales/pt';
import {SchemaDiagram} from './demograph/SchemaDiagram';

const api = `${API_BASE_URL}/api/demograph`;
const button = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 text-sm hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed';
const input = 'rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm min-w-0';
const panel = 'rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5';
const datasets: DemoDatasetId[] = ['deputies', 'votings', 'votes', 'histories', 'topics'];
const datasetKeys: Record<DemoDatasetId, TranslationKeys> = {
  deputies: 'dgDeputies', votings: 'dgVotings', votes: 'dgVotes', histories: 'dgHistories', topics: 'dgTopics',
};
const statuses: Record<DemoRunStatus, TranslationKeys> = {
  queued: 'dgQueued', running: 'dgRunning', completed: 'dgCompleted', completed_with_errors: 'dgCompletedErrors',
  failed: 'dgFailed', cancelled: 'dgCancelled', deleting: 'dgDeleting', delete_failed: 'dgDeleteFailed',
};
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`${api}${path}`, init);
  if (!response.ok) {
    const body: {detail?: unknown} = await response.json().catch(() => ({}));
    const {t} = getTranslation(localStorage.getItem('signalcatcher_language') || 'en');
    const errors: Record<string, TranslationKeys> = {
      'Wait for execution or cancellation to finish before deleting.': 'dgDeleteBusy',
      'Wait for the current graph operation to finish before deleting.': 'dgDeleteGraphBusy',
      'Cannot delete: a retained artifact is missing, changed or unsafe.': 'dgDeleteIntegrity',
      'Deletion failed. Check storage and Neo4j, then retry deletion.': 'dgDeleteUnavailable',
      'Wait for active runs to finish.': 'dgDeleteBusy',
    };
    throw new Error(typeof body.detail === 'string' ? (errors[body.detail] ? t(errors[body.detail]) : body.detail) : `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}
function size(bytes: number) {return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;}
const localDate = (at: Date) => `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;

function Fields({fields, t}: {fields: DemoField[]; t: (key: TranslationKeys) => string}) {
  return <div className="overflow-auto"><table className="w-full text-xs text-left">
    <thead className="text-zinc-400"><tr>{['dgField', 'dgTypes', 'dgInferred', 'dgPresent', 'dgNulls', 'dgExamples'].map(key =>
      <th className="p-2 border-b border-zinc-800" key={key}>{t(key as TranslationKeys)}</th>)}</tr></thead>
    <tbody>{fields.map(field => <tr key={field.path} className="border-b border-zinc-800/50">
      <td className="p-2 font-mono">{field.path}</td><td className="p-2">{field.types.join(', ')}</td>
      <td className="p-2">{field.inferred_types.join(', ') || '—'}</td><td className="p-2">{field.present}</td>
      <td className="p-2">{field.nulls}</td><td className="p-2 max-w-sm break-words">{field.examples.join(' · ')}</td>
    </tr>)}</tbody>
  </table></div>;
}

export function DemoGraphApp({language = 'pt', onAddLog}: {
  language?: LanguageMode;
  onAddLog: (app: string, level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}) {
  const {t} = getTranslation(language);
  const [tab, setTab] = useState<'catalog' | 'runs' | 'schema'>('catalog');
  const [catalog, setCatalog] = useState<DemoDataset[]>([]);
  const [runs, setRuns] = useState<DemoRun[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [health, setHealth] = useState<DemoHealth | null>(null);
  const [schema, setSchema] = useState<DemoGraphSchema>({nodes: [], relationships: [], constraints: [], observed_at: null, stale: false});
  const [selectedDataset, setSelectedDataset] = useState<DemoDatasetId | null>(null);
  const [versionPage, setVersionPage] = useState(1);
  const [datasetDetail, setDatasetDetail] = useState<DemoDataset | null>(null);
  const [selectedRun, setSelectedRun] = useState<DemoRun | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DemoRun | null>(null);
  const [artifact, setArtifact] = useState<DemoArtifact | null>(null);
  const [fileSchema, setFileSchema] = useState<DemoFileSchema | null>(null);
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [graphSelection, setGraphSelection] = useState<DemoNode | DemoRelationship | null>(null);
  const [selected, setSelected] = useState<DemoDatasetId[]>(['deputies']);
  const [start, setStart] = useState(`${new Date().getFullYear()}-01-01`);
  const [end, setEnd] = useState(localDate(new Date()));
  const [operation, setOperation] = useState('pipeline');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [filesLimit, setFilesLimit] = useState(30);
  const log = useRef(onAddLog);
  log.current = onAddLog;
  const runId = selectedRun?.id;

  useEffect(() => {
    let disposed = false, fetching = false;
    async function poll() {
      if (fetching || document.hidden) return;
      fetching = true;
      try {
        const [ds, rs, gs, detail] = await Promise.all([
          request<{items: DemoDataset[]}>('/datasets'),
          request<{items: DemoRun[]; total: number}>(`/runs?page=${page}&page_size=20&status=${status}`),
          request<DemoGraphSchema>('/schema'),
          runId ? request<DemoRun>(`/runs/${runId}`) : Promise.resolve(null),
        ]);
        if (!disposed) {
          setCatalog(ds.items); setRuns(rs.items); setTotal(rs.total); setSchema(gs);
          if (detail) setSelectedRun(detail);
          setError('');
        }
      } catch (reason) {if (!disposed) setError(String(reason));}
      finally {fetching = false; if (!disposed) setLoading(false);}
    }
    void poll();
    const timer = window.setInterval(() => {void poll();}, 5000);
    return () => {disposed = true; window.clearInterval(timer);};
  }, [page, status, runId, refresh]);

  useEffect(() => {
    let disposed = false;
    const check = () => {void request<DemoHealth>('/health').then(value => {if (!disposed) setHealth(value);}).catch(() => {if (!disposed) setHealth(null);});};
    check();
    const timer = window.setInterval(check, 30000);
    return () => {disposed = true; window.clearInterval(timer);};
  }, [refresh]);

  useEffect(() => {
    setFilesLimit(30); setArtifact(null); setFileSchema(null); setPreview([]);
  }, [runId]);

  useEffect(() => {
    let disposed = false;
    if (!selectedDataset) {setDatasetDetail(null); return;}
    void request<DemoDataset>(`/datasets/${selectedDataset}?version_page=${versionPage}`)
      .then(value => {if (!disposed) setDatasetDetail(value);})
      .catch(reason => {if (!disposed) setError(String(reason));});
    return () => {disposed = true;};
  }, [selectedDataset, versionPage, catalog]);

  useEffect(() => {
    if (!artifact) return;
    let disposed = false;
    setFileSchema(null); setPreview([]);
    void Promise.all([
      request<DemoFileSchema>(`/artifacts/${artifact.id}/schema`),
      request<{items: Record<string, unknown>[]}>(`/artifacts/${artifact.id}/preview`),
    ]).then(([fs, pv]) => {if (!disposed) {setFileSchema(fs); setPreview(pv.items);}})
      .catch(reason => {if (!disposed) setError(String(reason));});
    return () => {disposed = true;};
  }, [artifact?.id]);

  async function command(path: string, body?: unknown) {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await request<{id: string}>(path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: body ? JSON.stringify(body) : undefined});
      const message = t(path.endsWith('/cancel') ? 'dgCancelNotice' : 'dgStartedNotice');
      setNotice(message); log.current('DemoGraph', 'info', message);
      setRefresh(value => value + 1);
      if (path === '/runs' || path.includes('/load') || path === '/schema/refresh') {
        const detail = await request<DemoRun>(`/runs/${result.id}`);
        setSelectedRun(detail); setTab('runs');
      }
    } catch (reason) {setError(String(reason)); log.current('DemoGraph', 'error', String(reason));}
    finally {setBusy(false);}
  }
  async function openRun(id: string) {
    try {setSelectedRun(await request<DemoRun>(`/runs/${id}`));}
    catch (reason) {setError(String(reason));}
  }
  async function removeExtraction() {
    if (!deleteTarget) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await request(`/extractions/${deleteTarget.extraction_id}`, {method: 'DELETE'});
      setSelectedRun(null); setArtifact(null); setFileSchema(null); setPreview([]); setGraphSelection(null);
      setDeleteTarget(null); setRefresh(value => value + 1);
      setNotice(t('dgDeletedNotice')); log.current('DemoGraph', 'success', t('dgDeletedNotice'));
    } catch (reason) {
      setError(String(reason)); setDeleteTarget(null); setRefresh(value => value + 1);
      log.current('DemoGraph', 'error', String(reason));
    } finally {setBusy(false);}
  }
  const dateTime = (value: string | null) => value ? new Date(value).toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US') : '—';
  const statusLabel = (value: DemoRunStatus) => t(statuses[value]);
  const activeDataset = datasetDetail?.id === selectedDataset ? datasetDetail : catalog.find(dataset => dataset.id === selectedDataset);
  function stageLabel(stage: string) {
    const [kind, dataset] = stage.split(':');
    const label = t(kind === 'delete' ? 'dgDeleting' : kind === 'extract' ? 'dgExtractStage' : kind === 'load' ? 'dgLoadStage' : kind === 'schema' ? 'dgSchema' : kind === 'queued' ? 'dgQueued' : kind === 'starting' ? 'dgStarting' : 'dgCompleted');
    return dataset && datasets.includes(dataset as DemoDatasetId) ? `${label}: ${t(datasetKeys[dataset as DemoDatasetId])}` : label;
  }
  const issueKeys: Record<string, TranslationKeys> = {'Invalid record.': 'dgIssueInvalid', 'Source resource unavailable (404).': 'dgIssueMissing', 'Pipeline stopped.': 'dgIssueStopped', 'Schema refresh failed.': 'dgIssueSchema'};

  return <div className="space-y-5 max-w-[1600px] mx-auto text-zinc-200">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold flex items-center gap-3"><Network className="text-indigo-400" />DemoGraph</h1>
        <p className="text-sm text-zinc-400 mt-2">{t('dgDescription')}</p></div>
      <button className={button} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={15} />{t('dgRefresh')}</button>
    </header>
    {health && <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
      <span>{t('dgExecution')}: <b className="text-emerald-400">{t('dgOnline')}</b></span>
      <span>{t('dgStorage')}: {t(health.storage ? 'dgOnline' : 'dgOffline')}</span>
      <span>Neo4j: {t(health.neo4j === 'online' ? 'dgOnline' : health.neo4j === 'unconfigured' ? 'dgUnconfigured' : 'dgOffline')}</span>
      <span>{t('dgLive')}</span>
    </div>}
    <nav className="flex gap-2 border-b border-zinc-800 pb-3" aria-label="DemoGraph">
      {(['catalog', 'runs', 'schema'] as const).map(value => <button key={value} aria-current={tab === value ? 'page' : undefined}
        className={`${button} ${tab === value ? 'bg-indigo-500/15 border-indigo-500 text-indigo-300' : ''}`}
        onClick={() => setTab(value)}>{t(value === 'catalog' ? 'dgCatalog' : value === 'runs' ? 'dgRuns' : 'dgSchema')}</button>)}
    </nav>
    {error && <div role="alert" className="rounded-xl border border-red-900 bg-red-950/30 p-3 text-red-300 text-sm">{error}</div>}
    {notice && <div role="status" className="text-sm text-emerald-400">{notice}</div>}
    {loading && <div className="flex gap-2 text-zinc-400"><Loader2 className="animate-spin" size={18} />{t('dgLoading')}</div>}

    {tab === 'catalog' && <>
      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">{catalog.map(dataset => {
        const version = dataset.versions[0];
        return <button key={dataset.id} className={`${panel} text-left ${selectedDataset === dataset.id ? 'border-indigo-500' : 'hover:border-zinc-600'}`}
          onClick={() => {setSelectedDataset(dataset.id); setVersionPage(1);}}>
          <Database size={20} className="text-indigo-400 mb-3" /><h2 className="font-medium">{t(datasetKeys[dataset.id])}</h2>
          <p className="text-2xl font-semibold mt-3">{(version?.records ?? 0).toLocaleString()}</p>
          <p className="text-xs text-zinc-500">{t('dgRecords')}</p>
          <p className="text-xs text-zinc-400 mt-3">{version ? `${version.files} ${t('dgFiles')} · ${size(version.bytes)}` : '—'}</p>
          <p className="text-xs text-zinc-500 mt-2">{dateTime(version?.created_at ?? null)}</p>
          <p className={`text-xs mt-3 ${version?.last_load ? 'text-emerald-400' : 'text-amber-400'}`}>
            {t(version?.last_load ? 'dgLoaded' : 'dgNotLoaded')}</p>
          {dataset.last_ingestion && <p className="text-xs text-zinc-500 mt-2">{t('dgLastLoad')}: {dateTime(dataset.last_ingestion.finished_at)} · {dataset.last_ingestion.parameters.start} → {dataset.last_ingestion.parameters.end}</p>}
        </button>;
      })}</div>
      <p className="text-xs text-zinc-500">{t('dgCoverage')}</p>
      {catalog.every(dataset => !dataset.versions.length) && <p className={panel}>{t('dgEmpty')}</p>}
      {activeDataset && <section className={panel}><h2 className="font-medium mb-4">{t(datasetKeys[activeDataset.id])} · {t('dgVersion')}</h2>
        <div className="overflow-auto"><table className="w-full text-sm text-left"><tbody>{activeDataset.versions.map(version =>
          <tr key={version.extraction_id} className="border-b border-zinc-800">
            <td className="py-3 pr-4">{dateTime(version.created_at)}<div className="text-xs text-zinc-500">{version.parameters.start} → {version.parameters.end}</div></td>
            <td className="p-3">{version.files} {t('dgFiles')} · {version.records.toLocaleString()}</td>
            <td className="p-3 text-xs">{t(version.extraction_complete ? 'dgExtracted' : 'dgPartial')}<div>{t(version.last_load ? 'dgLoaded' : 'dgNotLoaded')}</div>
              {version.last_load?.progress.load_by_dataset?.[activeDataset.id] && <div className="text-zinc-400">{t('dgProcessed')}: {version.last_load.progress.load_by_dataset[activeDataset.id]!.processed.toLocaleString()} · {t('dgRejected')}: {version.last_load.progress.load_by_dataset[activeDataset.id]!.rejected}</div>}
            </td>
            <td className="p-3"><button className={button} onClick={() => {void openRun(version.extraction_id);}}>{t('dgOpen')}</button></td>
          </tr>)}</tbody></table></div>
        <div className="flex gap-2 mt-3"><button className={button} disabled={versionPage === 1} onClick={() => setVersionPage(value => value - 1)}>{t('dgPrevious')}</button><span className="p-2">{versionPage}</span><button className={button} disabled={versionPage * 20 >= activeDataset.total_versions} onClick={() => setVersionPage(value => value + 1)}>{t('dgNext')}</button></div>
      </section>}
    </>}

    {tab === 'runs' && <>
      <form className={panel} onSubmit={event => {event.preventDefault(); void command('/runs', {operation, datasets: selected, start, end});}}>
        <h2 className="font-medium mb-4">{t('dgNewRun')}</h2>
        <div className="flex flex-wrap gap-4 mb-3">{datasets.map(dataset => <label key={dataset} className="flex gap-2 items-center text-sm">
          <input type="checkbox" checked={selected.includes(dataset)} onChange={event => setSelected(current => event.target.checked ? [...current, dataset] : current.filter(item => item !== dataset))} />{t(datasetKeys[dataset])}
        </label>)}</div>
        <p className="text-xs text-zinc-500 mb-4">{t('dgDependencies')}</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs text-zinc-400">{t('dgStart')}<input required type="date" value={start} max={end} onChange={event => setStart(event.target.value)} className={input} /></label>
          <label className="grid gap-1 text-xs text-zinc-400">{t('dgEnd')}<input required type="date" value={end} min={start} max={localDate(new Date())} onChange={event => setEnd(event.target.value)} className={input} /></label>
          <select aria-label={t('dgStage')} value={operation} onChange={event => setOperation(event.target.value)} className={input}><option value="pipeline">{t('dgPipeline')}</option><option value="extract">{t('dgExtract')}</option></select>
          <button disabled={busy || !selected.length} className={`${button} bg-indigo-600 border-indigo-500`} type="submit"><Play size={15} />{t('dgSubmit')}</button>
        </div>
      </form>
      <section className={panel}>
        <div className="flex justify-between mb-3"><h2>{t('dgRuns')} · {total}</h2><select className={input} value={status} aria-label={t('dgAll')}
          onChange={event => {setStatus(event.target.value); setPage(1);}}><option value="">{t('dgAll')}</option>{Object.keys(statuses).map(value => <option key={value} value={value}>{statusLabel(value as DemoRunStatus)}</option>)}</select></div>
        <div className="overflow-auto"><table className="w-full text-sm text-left"><tbody>{runs.map(run => <tr key={run.id} className="border-b border-zinc-800">
          <td className="py-3 pr-4">{dateTime(run.created_at)}<div className="text-xs text-zinc-500 font-mono">{run.id.slice(0, 8)}</div></td>
          <td className="p-3">{run.operation === 'schema' ? t('dgRefreshSchema') : run.parameters.datasets.map(dataset => t(datasetKeys[dataset])).join(', ')}</td>
          <td className="p-3"><span className={run.status === 'failed' ? 'text-red-400' : run.status.startsWith('completed') ? 'text-emerald-400' : 'text-amber-400'}>{statusLabel(run.status)}</span><div className="text-xs text-zinc-500">{stageLabel(run.stage)}</div></td>
          <td className="p-3"><button className={button} onClick={() => {void openRun(run.id);}}>{t('dgOpen')}</button></td>
        </tr>)}</tbody></table></div>
        {!runs.length && <p className="text-zinc-500 py-4">{t('dgNoRuns')}</p>}
        <div className="flex gap-2 mt-3"><button className={button} disabled={page === 1} onClick={() => setPage(value => value - 1)}>{t('dgPrevious')}</button><span className="p-2">{page}</span><button className={button} disabled={page * 20 >= total} onClick={() => setPage(value => value + 1)}>{t('dgNext')}</button></div>
      </section>
    </>}

    {tab === 'schema' && <section className={`${panel} space-y-4`}>
      <div className="flex flex-wrap gap-3 justify-between"><p className="text-sm text-zinc-400">{t('dgObserved')}: {dateTime(schema.observed_at)}</p>
        <button className={button} disabled={busy} onClick={() => {void command('/schema/refresh');}}><RefreshCw size={15} />{t('dgRefreshSchema')}</button></div>
      {schema.stale && <p className="text-amber-400 text-sm">{t('dgStale')}</p>}
      {!schema.nodes.length ? <p className="text-zinc-500">{t('dgNoSchema')}</p> : <>
        <SchemaDiagram schema={schema} onNode={setGraphSelection} onRelationship={setGraphSelection} />
        <div className="grid lg:grid-cols-2 gap-4">
          <div><h3 className="text-sm mb-2">{t('dgNodes')}</h3><div className="flex flex-wrap gap-2">{schema.nodes.map(node => <button key={node.label} className={button} onClick={() => setGraphSelection(node)}>{node.label} · {node.count.toLocaleString()}</button>)}</div></div>
          <div><h3 className="text-sm mb-2">{t('dgRelationships')}</h3><div className="space-y-1">{schema.relationships.map((relationship, i) => <button key={i} className="block text-xs text-indigo-300 text-left hover:underline" onClick={() => setGraphSelection(relationship)}>{relationship.source} → {relationship.type} → {relationship.target} · {relationship.count.toLocaleString()}</button>)}</div></div>
        </div>
        {graphSelection && <div><h3 className="text-sm my-3">{'label' in graphSelection ? graphSelection.label : graphSelection.type} · {t('dgProperties')}</h3><Fields fields={graphSelection.properties} t={t} /></div>}
        <details><summary className="cursor-pointer text-sm">{t('dgConstraints')}</summary><pre className="text-xs overflow-auto mt-3">{JSON.stringify(schema.constraints, null, 2)}</pre></details>
      </>}
    </section>}

    {selectedRun && <section className={`${panel} space-y-4`}>
      <div className="flex items-center justify-between gap-3"><h2 className="font-medium">{t('dgVersion')} · <span className="font-mono text-sm">{selectedRun.id.slice(0, 8)}</span> · {statusLabel(selectedRun.status)}</h2><button className={button} aria-label={t('dgCancel')} onClick={() => setSelectedRun(null)}><X size={16} /></button></div>
      <div className="flex flex-wrap gap-2">
        {['queued', 'running'].includes(selectedRun.status) && <button className={button} disabled={busy || selectedRun.cancel_requested} onClick={() => {void command(`/runs/${selectedRun.id}/cancel`);}}>{t('dgCancel')}</button>}
        {['queued', 'failed', 'cancelled'].includes(selectedRun.status) && <button className={button} disabled={busy} onClick={() => {void command(`/runs/${selectedRun.id}/retry`);}}>{t('dgRetry')}</button>}
        {['extract', 'pipeline'].includes(selectedRun.operation) && selectedRun.progress.extraction_complete && <button className={button} disabled={busy || ['queued', 'running', 'deleting', 'delete_failed'].includes(selectedRun.status)} onClick={() => {void command(`/extractions/${selectedRun.extraction_id}/load`);}}><Database size={15} />{t('dgLoad')}</button>}
        {selectedRun.operation !== 'schema' && <button className={`${button} text-red-300 border-red-900`} disabled={busy || selectedRun.status === 'running'} onClick={() => setDeleteTarget(selectedRun)}><Trash2 size={15} />{t(['delete_failed', 'deleting'].includes(selectedRun.status) ? 'dgRetryDelete' : 'dgDelete')}</button>}
      </div>
      <p className="text-xs text-zinc-400">{t('dgStage')}: {stageLabel(selectedRun.stage)} · {selectedRun.parameters.start} → {selectedRun.parameters.end}</p>
      {selectedRun.progress.current_file && <div className="text-xs text-zinc-400">{selectedRun.progress.current_file} · {size(selectedRun.progress.bytes_received ?? 0)} / {selectedRun.progress.bytes_total ? size(Number(selectedRun.progress.bytes_total)) : t('dgUnknownTotal')}
        {Number(selectedRun.progress.bytes_total) > 0 && <progress className="w-full mt-2 accent-indigo-500" value={selectedRun.progress.bytes_received ?? 0} max={Number(selectedRun.progress.bytes_total)} />}</div>}
      {selectedRun.progress.resources_total !== undefined && <p className="text-xs text-zinc-400">{selectedRun.progress.resources_done} / {selectedRun.progress.resources_total}</p>}
      {selectedRun.progress.load && <div className="flex flex-wrap gap-4 text-sm">{Object.entries(selectedRun.progress.load).map(([key, value]) => <span key={key}>{t(({read: 'dgRead', outside_period: 'dgOutside', rejected: 'dgRejected', processed: 'dgProcessed', duplicates: 'dgDuplicates'} as Record<string, TranslationKeys>)[key])}: <b>{value.toLocaleString()}</b></span>)}</div>}
      {!!selectedRun.issues?.length && <details><summary className="text-sm text-amber-400 cursor-pointer">{t('dgIssues')} · {selectedRun.progress.issues ?? 0}</summary><ul className="text-xs space-y-2 mt-3">{selectedRun.issues.map(issue => <li key={issue.id}>{issueKeys[issue.message] ? t(issueKeys[issue.message]) : issue.message} <code>{JSON.stringify(issue.context)}</code></li>)}</ul></details>}
      <h3 className="text-sm">{t('dgFiles')} · {selectedRun.artifacts?.length ?? 0}</h3>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">{selectedRun.artifacts?.slice(0, filesLimit).map(file => <button key={file.id} className={`${button} justify-start text-left ${artifact?.id === file.id ? 'border-indigo-500' : ''}`} onClick={() => setArtifact(file)}>
        <FileJson size={16} className="shrink-0" /><span className="truncate">{file.path.split('/').pop()}<span className="block text-xs text-zinc-500">{file.records.toLocaleString()} · {size(file.bytes)}</span></span>
      </button>)}</div>
      {(selectedRun.artifacts?.length ?? 0) > filesLimit && <button className={button} onClick={() => setFilesLimit(value => value + 30)}>{t('dgMore')}</button>}
      {artifact && <div className="space-y-4 border-t border-zinc-800 pt-4">
        <div className="flex flex-wrap gap-3 items-center text-xs"><a className="text-indigo-300 hover:underline break-all" href={artifact.source_url} target="_blank" rel="noreferrer">{t('dgSource')}</a>
          <a className={button} href={`${api}/artifacts/${artifact.id}/download`}><Download size={14} />{t('dgDownload')}</a>
          <span>{dateTime(artifact.collected_at)}</span><code className="break-all text-zinc-500">SHA-256 {artifact.checksum}</code></div>
        <h3 className="text-sm">{t('dgFileSchema')}</h3>
        {fileSchema ? <Fields fields={fileSchema.fields} t={t} /> : <p className="text-zinc-500">{t('dgLoading')}</p>}
        <details><summary className="cursor-pointer text-sm">{t('dgPreview')}</summary><pre className="text-xs max-h-96 overflow-auto bg-zinc-950 rounded-lg p-3 mt-3">{JSON.stringify(preview, null, 2)}</pre></details>
      </div>}
    </section>}
    {deleteTarget && <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div role="alertdialog" aria-modal="true" aria-labelledby="dg-delete-title" aria-describedby="dg-delete-description" className={`${panel} bg-zinc-950 max-w-lg w-full space-y-4`}>
        <h2 id="dg-delete-title" className="font-semibold text-lg">{t('dgDelete')}</h2>
        <p id="dg-delete-description" className="text-sm text-zinc-300">{t('dgDeleteDescription')}</p>
        <p className="font-mono text-xs break-all">{deleteTarget.extraction_id}</p>
        <p className="text-sm text-zinc-400">{deleteTarget.artifacts?.length ?? 0} {t('dgFiles')} · {deleteTarget.parameters.start} → {deleteTarget.parameters.end}</p>
        <div className="flex justify-end gap-2"><button autoFocus className={button} disabled={busy} onClick={() => setDeleteTarget(null)}>{t('dgKeepData')}</button>
          <button className={`${button} text-red-300 border-red-800`} disabled={busy} onClick={() => {void removeExtraction();}}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}{t(busy ? 'dgDeleting' : 'dgConfirmDelete')}</button></div>
      </div>
    </div>}
  </div>;
}
