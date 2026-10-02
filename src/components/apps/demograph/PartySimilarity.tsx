import React, {useState} from 'react';
import type {TranslationKeys} from '../../../locales/pt';
import type {DemoRun} from '../../../demographTypes';

type Translate = (key: TranslationKeys) => string;
type Parameters = {start: string; end: string; min_party_votes: number; min_common: number};
const input = 'rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm min-w-0';

export function PartySimilarityForm({t, busy, today, submit}: {
  t: Translate; busy: boolean; today: string; submit: (parameters: Parameters) => void;
}) {
  const [start, setStart] = useState('2023-02-01');
  const [end, setEnd] = useState(today);
  const [minimum, setMinimum] = useState(30);
  const [partyMinimum, setPartyMinimum] = useState(1);
  return <form className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3" onSubmit={event => {
    event.preventDefault(); submit({start, end, min_common: minimum, min_party_votes: partyMinimum});
  }}>
    <h2 className="font-medium">{t('dgPartySimilarity')}</h2>
    <p className="text-sm text-zinc-400">{t('dgAnalysisDescription')}</p>
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-xs text-zinc-400">{t('dgStart')}<input required className={input} type="date" value={start} max={end} onChange={event => setStart(event.target.value)} /></label>
      <label className="grid gap-1 text-xs text-zinc-400">{t('dgEnd')}<input required className={input} type="date" value={end} min={start} max={today} onChange={event => setEnd(event.target.value)} /></label>
      <label className="grid gap-1 text-xs text-zinc-400">{t('dgMinCommon')}<input required className={`${input} w-32`} type="number" min={1} max={100000} value={minimum} onChange={event => setMinimum(Number(event.target.value))} /></label>
      <label className="grid gap-1 text-xs text-zinc-400">{t('dgMinPartyVotes')}<input required className={`${input} w-32`} type="number" min={1} max={1000} value={partyMinimum} onChange={event => setPartyMinimum(Number(event.target.value))} /></label>
      <button disabled={busy} className="min-h-10 rounded-lg border border-indigo-500 bg-indigo-600 px-3 text-sm disabled:opacity-40" type="submit">{t('dgAnalyze')}</button>
    </div>
    <p className="text-xs text-zinc-500">{t('dgAnalysisCriteria')}</p>
    <code className="block break-all text-xs text-indigo-300">majority_sim_nao_v1:{start}:{end}:{partyMinimum}:{minimum}</code>
  </form>;
}

export function PartySimilarityReport({run, t}: {run: DemoRun; t: Translate}) {
  const report = run.progress.analysis;
  if (!report) return null;
  const exclusions: Record<string, TranslationKeys> = {
    without_roll_call_evidence: 'dgExcludeEvidence', outside_legislature: 'dgExcludeLegislature',
    non_binary_vote: 'dgExcludeNonBinary', invalid_vote: 'dgIssueInvalid', duplicate_vote: 'dgDuplicates',
    fewer_than_100_binary_votes: 'dgExcludeSmallVoting', unresolved_historical_party: 'dgExcludeHistory',
  };
  return <div className="rounded-xl border border-zinc-800 p-4 space-y-2 text-sm">
    <h3 className="font-medium">{t('dgPartySimilarity')}</h3>
    <code className="block break-all text-xs text-indigo-300">{report.analysis_key}</code>
    <p>{t('dgAnalysisCoverage')}: {report.observed_start_date ?? '—'} → {report.observed_end_date ?? '—'}</p>
    <p>{t('dgIncludedVotings')}: {report.included_votings.toLocaleString()} · {t('dgIncludedVotes')}: {report.included_votes.toLocaleString()}</p>
    <p>{t('dgParties')}: {report.parties} · {t('dgSufficientPairs')}: {report.sufficient_pairs} / {report.compared_pairs}</p>
    <p>{t('dgHistoryCorrections')}: {report.historical_party_corrections.toLocaleString()}</p>
    {!report.sufficient_pairs && <p className="text-amber-300">{t('dgNoComparablePairs')}</p>}
    <ul className="text-xs text-zinc-400 space-y-1">{Object.entries(report.excluded).filter(([, count]) => count > 0).map(([reason, count]) =>
      <li key={reason}>{exclusions[reason] ? t(exclusions[reason]) : reason}: {count.toLocaleString()}</li>)}</ul>
    <p className="text-xs text-zinc-500">{t('dgAnalysisRecalculate')}</p>
  </div>;
}
