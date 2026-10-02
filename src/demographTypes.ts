export type DemoDatasetId = 'deputies' | 'votings' | 'votes' | 'histories' | 'topics';
export type DemoRunStatus = 'queued' | 'running' | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled' | 'deleting' | 'delete_failed';
export interface DemoField {
  path: string; types: string[]; present: number; nulls: number; examples: string[]; inferred_types: string[];
}
export interface DemoFileSchema { records: number; fields: DemoField[]; presence_unit: string }
export interface DemoArtifact {
  id: string; extraction_id: string; dataset_id: DemoDatasetId; path: string; format: string;
  checksum: string; bytes: number; records: number; source_url: string; collected_at: string;
  metadata_json: Record<string, unknown>;
}
export interface DemoRun {
  id: string; extraction_id: string; operation: 'extract' | 'pipeline' | 'load' | 'schema';
  parameters: {datasets: DemoDatasetId[]; start?: string; end?: string}; status: DemoRunStatus;
  stage: string; progress: { issues?: number; files_saved?: number; current_file?: string;
    bytes_received?: number; bytes_total?: string | null; resources_done?: number; resources_total?: number;
    load?: Record<'read' | 'outside_period' | 'rejected' | 'processed' | 'duplicates', number>;
    extraction_complete?: boolean; load_complete?: boolean;
    load_by_dataset?: Partial<Record<DemoDatasetId, Record<'read' | 'outside_period' | 'rejected' | 'processed' | 'duplicates', number>>>; };
  completed_stages: string[]; cancel_requested: boolean; schema_stale: boolean; error: string | null;
  created_at: string; started_at: string | null; finished_at: string | null;
  artifacts?: DemoArtifact[];
  issues?: {id: string; message: string; context: Record<string, unknown>; created_at: string}[];
}
export interface DemoVersion {
  extraction_id: string; created_at: string; parameters: DemoRun['parameters']; status: DemoRunStatus;
  extraction_complete: boolean; files: number; records: number; bytes: number; last_load: DemoRun | null;
}
export interface DemoDataset { id: DemoDatasetId; source: string; versions: DemoVersion[]; total_versions: number; version_page: number; last_ingestion: DemoRun | null }
export interface DemoNode {label: string; count: number; properties: DemoField[]}
export interface DemoRelationship {source: string; type: string; target: string; count: number; properties: DemoField[]}
export interface DemoGraphSchema {
  observed_at: string | null; stale: boolean; nodes: DemoNode[]; relationships: DemoRelationship[];
  constraints: {name: string; type: string; labelsOrTypes: string[]; properties: string[]}[];
}
export interface DemoHealth {execution: 'api'; storage: boolean; neo4j: 'online' | 'unavailable' | 'unconfigured'}
