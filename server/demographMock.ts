import {Router} from 'express';
import {randomUUID} from 'node:crypto';
import type {DemoArtifact, DemoDatasetId, DemoFileSchema, DemoGraphSchema, DemoRun} from '../src/demographTypes';

const ids: DemoDatasetId[] = ['deputies', 'votings', 'votes', 'histories', 'topics'];

/** Deterministic local fixtures; this router never calls the public source or Neo4j. */
export function demographMock(): Router {
  const router = Router();
  const runs: DemoRun[] = [];
  const artifacts = new Map<string, {artifact: DemoArtifact; rows: Record<string, unknown>[]; schema: DemoFileSchema}>();
  let graph: DemoGraphSchema = {observed_at: null, stale: false, nodes: [], relationships: [], constraints: []};
  function create(operation: DemoRun['operation'], datasets: DemoDatasetId[], start?: string, end?: string, extractionId?: string) {
    const id = randomUUID();
    const run: DemoRun = {id, operation, extraction_id: extractionId || id,
      parameters: {datasets, start, end}, status: 'running', stage: 'starting', progress: {},
      completed_stages: [], cancel_requested: false, schema_stale: false, error: null,
      created_at: new Date().toISOString(), started_at: new Date().toISOString(), finished_at: null, artifacts: [], issues: []};
    runs.unshift(run);
    return run;
  }
  function fixture(run: DemoRun, dataset: DemoDatasetId) {
    const record: Record<string, unknown> = dataset === 'deputies' ? {id: 1, nome: 'Parlamentar de demonstração', siglaUf: 'SP', idLegislatura: 57}
      : dataset === 'votes' ? {idVotacao: '1-1', deputado_id: 1, voto: 'Abstenção'}
      : dataset === 'votings' ? {id: '1-1', data: run.parameters.start, descricao: 'Votação de demonstração'}
      : dataset === 'histories' ? {id: 1, dataHora: `${run.parameters.start}T12:00:00`, siglaPartido: 'EXEMPLO'}
      : {codTema: 1, tema: 'Tema de demonstração'};
    const file: DemoArtifact = {id: randomUUID(), extraction_id: run.extraction_id, dataset_id: dataset,
      path: `${run.extraction_id}/${dataset}/demo.json`, format: 'json', checksum: '0'.repeat(64),
      bytes: JSON.stringify(record).length, records: 1, source_url: 'https://dadosabertos.camara.leg.br/api/v2/',
      collected_at: new Date().toISOString(), metadata_json: {mock: true}};
    const schema: DemoFileSchema = {records: 1, presence_unit: 'occurrences', fields: Object.entries(record).map(([path, value]) => ({
      path, types: [typeof value === 'number' ? 'integer' : 'string'], present: 1, nulls: 0,
      examples: [String(value)], inferred_types: [],
    }))};
    artifacts.set(file.id, {artifact: file, rows: [record], schema});
    run.artifacts?.push(file);
  }
  const timer = setInterval(() => {
    for (const run of runs.filter(item => item.status === 'running')) {
    run.status = 'running'; run.started_at ||= new Date().toISOString();
    if (run.operation === 'analysis') {
      run.progress.analysis = {analysis_key: `majority_sim_nao_v1:${run.parameters.start}:${run.parameters.end}:${run.parameters.min_party_votes}:${run.parameters.min_common}`,
        observed_start_date: run.parameters.start, observed_end_date: run.parameters.end,
        included_votings: 30, included_votes: 3000, parties: 2, historical_party_corrections: 0,
        compared_pairs: 1, sufficient_pairs: (run.parameters.min_common ?? 30) <= 30 ? 1 : 0, excluded: {}};
      run.progress.analysis_complete = true; run.stage = 'finished'; run.status = 'completed';
      run.finished_at = new Date().toISOString(); continue;
    }
    if (run.operation !== 'load' && run.operation !== 'schema') {
      const next = run.parameters.datasets.find(dataset => !run.completed_stages.includes(`extract:${dataset}`));
      if (next) {
        run.stage = `extract:${next}`; fixture(run, next); run.completed_stages.push(run.stage);
        run.progress.files_saved = run.artifacts?.length;
        if (next === 'topics') {
          run.progress.resources_phase = 'proposition_topics';
          run.progress.resources_done = 1; run.progress.resources_total = 1;
        }
        continue;
      }
      run.progress.extraction_complete = true;
    }
    if (run.operation !== 'extract' && !run.progress.load_complete) {
      run.stage = 'load'; run.progress.load_complete = true;
      run.progress.load = {read: run.artifacts?.length || 0, outside_period: 0, rejected: 0,
        processed: run.artifacts?.length || 0, duplicates: 0};
      run.progress.load_by_dataset = Object.fromEntries(run.parameters.datasets.map(dataset => [dataset,
        {read: 1, outside_period: 0, rejected: 0, processed: 1, duplicates: 0}]));
      continue;
    }
    if (run.operation !== 'extract') {
      const props = [{path: 'camara_id', types: ['integer'], inferred_types: [], present: 1, nulls: 0, examples: ['1']}];
      graph = {observed_at: new Date().toISOString(), stale: false,
        nodes: [{label: 'Person', count: 1, properties: props}, {label: 'Voting', count: 1, properties: props}],
        relationships: [{source: 'Person', type: 'VOTED_IN', target: 'Voting', count: 1,
          properties: [{path: 'choice', types: ['string'], inferred_types: [], present: 1, nulls: 0, examples: ['Abstenção']}]}],
        constraints: [{name: 'demograph_person', type: 'UNIQUENESS', labelsOrTypes: ['Person'], properties: ['camara_id']}]};
    }
    run.status = 'completed'; run.stage = 'finished'; run.finished_at = new Date().toISOString();
    }
  }, 1500);
  timer.unref();
  function catalog(versionPage = 1) {
    return ids.map(id => {const versions = runs
      .filter(run => ['extract', 'pipeline'].includes(run.operation) && run.parameters.datasets.includes(id))
      .map(run => {
        const files = run.artifacts?.filter(file => file.dataset_id === id) || [];
        return {extraction_id: run.id, created_at: run.created_at, parameters: run.parameters, status: run.status,
          extraction_complete: run.completed_stages.includes(`extract:${id}`), files: files.length,
          records: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0),
          last_load: runs.find(load => load.extraction_id === run.id && ['load', 'pipeline'].includes(load.operation) && load.status === 'completed') || null};
      });
      return {id, source: 'CAMARA_DOS_DEPUTADOS', versions: versions.slice((versionPage - 1) * 20, versionPage * 20),
        total_versions: versions.length, version_page: versionPage,
        last_ingestion: runs.find(run => run.parameters.datasets.includes(id) && ['pipeline', 'load'].includes(run.operation) && run.status === 'completed') || null};
    });
  }
  router.get('/datasets', (req, res) => {res.json({items: catalog(Math.max(1, Number(req.query.version_page) || 1))});});
  router.get('/datasets/:id', (req, res) => {
    const item = catalog(Math.max(1, Number(req.query.version_page) || 1)).find(item => item.id === req.params.id);
    if (!item) return res.status(404).json({detail: 'Dataset not found.'});
    return res.json(item);
  });
  router.post('/runs', (req, res) => {
    const selection = req.body.datasets as unknown;
    if (!Array.isArray(selection) || !selection.length || selection.some(id => !ids.includes(id)) ||
      !['extract', 'pipeline'].includes(req.body.operation) || !/^\d{4}-\d{2}-\d{2}$/.test(req.body.start || '') ||
      !/^\d{4}-\d{2}-\d{2}$/.test(req.body.end || '') || req.body.start > req.body.end) {
      return res.status(422).json({detail: 'Invalid extraction request.'});
    }
    const resolved = new Set<DemoDatasetId>(selection as DemoDatasetId[]);
    if (resolved.has('votes') || resolved.has('topics')) resolved.add('votings');
    if (resolved.has('histories') && !resolved.has('votes')) resolved.add('deputies');
    const run = create(req.body.operation, ids.filter(id => resolved.has(id)), req.body.start, req.body.end);
    return res.status(202).json({id: run.id, status: 'running'});
  });
  router.post('/analyses/party-similarity', (req, res) => {
    const {start, end, min_party_votes = 1, min_common = 30} = req.body;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '') || !/^\d{4}-\d{2}-\d{2}$/.test(end || '') || start > end || end > new Date().toISOString().slice(0, 10) ||
      !Number.isInteger(min_party_votes) || min_party_votes < 1 || min_party_votes > 1000 || !Number.isInteger(min_common) || min_common < 1 || min_common > 100000) {
      return res.status(422).json({detail: 'Invalid analysis request.'});
    }
    const run = create('analysis', [], start, end);
    run.parameters.min_party_votes = min_party_votes; run.parameters.min_common = min_common;
    return res.status(202).json({id: run.id, status: 'running'});
  });
  router.get('/runs', (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1), pageSize = Math.min(100, Math.max(1, Number(req.query.page_size) || 20));
    const filtered = runs.filter(run => !req.query.status || run.status === req.query.status);
    res.json({items: filtered.slice((page - 1) * pageSize, page * pageSize).map(({artifacts: _files, issues: _issues, ...run}) => run), total: filtered.length, page, page_size: pageSize});
  });
  router.get('/runs/:id', (req, res) => {
    const run = runs.find(item => item.id === req.params.id);
    return run ? res.json(run) : res.status(404).json({detail: 'Run not found.'});
  });
  router.post('/runs/:id/cancel', (req, res) => {
    const run = runs.find(item => item.id === req.params.id);
    if (!run) return res.status(404).json({detail: 'Run not found.'});
    if (!['queued', 'running'].includes(run.status)) return res.status(409).json({detail: 'Run has already finished.'});
    run.status = 'cancelled'; run.cancel_requested = true; run.finished_at = new Date().toISOString();
    return res.status(202).json({id: run.id, status: 'cancel_requested'});
  });
  router.post('/runs/:id/retry', (req, res) => {
    const run = runs.find(item => item.id === req.params.id);
    if (!run) return res.status(404).json({detail: 'Run not found.'});
    if (!['queued', 'failed', 'cancelled'].includes(run.status)) return res.status(409).json({detail: 'Run cannot be resumed.'});
    run.status = 'running'; run.stage = 'starting'; run.cancel_requested = false; run.finished_at = null;
    return res.status(202).json({id: run.id, status: 'running'});
  });
  router.delete('/extractions/:id', (req, res) => {
    const original = runs.find(run => run.id === req.params.id && ['extract', 'pipeline'].includes(run.operation));
    if (!original) return res.status(404).json({detail: 'Extraction not found.'});
    const associated = runs.filter(run => run.extraction_id === original.id);
    if (associated.some(run => ['running', 'deleting'].includes(run.status)) || runs.some(run => run.status === 'running' && ['pipeline', 'load', 'schema', 'analysis'].includes(run.operation))) {
      return res.status(409).json({detail: 'Wait for active runs to finish.'});
    }
    const files = original.artifacts?.length ?? 0;
    for (const [id, file] of artifacts) if (file.artifact.extraction_id === original.id) artifacts.delete(id);
    for (let index = runs.length - 1; index >= 0; index--) if (runs[index].extraction_id === original.id) runs.splice(index, 1);
    if (!runs.some(run => ['pipeline', 'load'].includes(run.operation) && run.progress.load_complete)) {
      graph = {observed_at: new Date().toISOString(), stale: false, nodes: [], relationships: [], constraints: graph.constraints};
    }
    return res.json({id: original.id, status: 'deleted', files});
  });
  router.post('/extractions/:id/load', (req, res) => {
    const original = runs.find(run => run.id === req.params.id);
    if (!original) return res.status(404).json({detail: 'Extraction not found.'});
    if (!original.progress.extraction_complete || original.operation === 'load') return res.status(409).json({detail: 'Extraction is incomplete.'});
    const run = create('load', original.parameters.datasets, original.parameters.start, original.parameters.end, original.id);
    run.artifacts = original.artifacts;
    return res.status(202).json({id: run.id, status: 'running'});
  });
  router.get('/artifacts/:id/:action', (req, res) => {
    const file = artifacts.get(req.params.id);
    if (!file) return res.status(404).json({detail: 'Artifact not found.'});
    if (req.params.action === 'schema') return res.json(file.schema);
    if (req.params.action === 'preview') return res.json({items: file.rows, limit: 50, total: 1});
    if (req.params.action === 'download') return res.attachment('demo.json').json({dados: file.rows});
    return res.status(404).json({detail: 'Unknown action.'});
  });
  router.get('/schema', (_req, res) => {res.json(graph);});
  router.post('/schema/refresh', (_req, res) => {
    const run = create('schema', []);
    res.status(202).json({id: run.id, status: 'running'});
  });
  router.get('/health', (_req, res) => {res.json({execution: 'api', storage: true, neo4j: 'online'});});
  return router;
}
