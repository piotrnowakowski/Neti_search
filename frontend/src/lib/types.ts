export type SourceKind = "domain" | "url" | "feed" | "pdf" | "search_query";

export type DashboardStats = {
  sources: number;
  watchlists: number;
  documents: number;
  entities: number;
  alerts: number;
  pending_domains: number;
  research_queries: number;
  diff_records: number;
  digest_runs: number;
};

export type Source = {
  id: number;
  kind: SourceKind;
  label: string;
  seed_value: string;
  jurisdiction: string | null;
  source_tier: string;
  crawl_frequency: string;
  trust_score: number;
  allow_flag: boolean;
  deny_flag: boolean;
  status: string;
  next_crawl_at: string | null;
  last_crawl_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_discovery_count: number;
  archived_at: string | null;
  created_at: string;
};

export type SourcePayload = {
  kind: SourceKind;
  label: string;
  seed_value: string;
  jurisdiction: string | null;
  source_tier: string;
  crawl_frequency: string;
  trust_score: number;
  allow_flag: boolean;
  deny_flag: boolean;
  status: string;
};

export type Alert = {
  id: number;
  severity: string;
  summary: string;
  entity_ids: number[];
  document_ids: number[];
  created_at: string;
  seen_at: string | null;
};

export type EntityListItem = {
  id: number;
  kind: string;
  canonical_name: string;
  summary: string | null;
  document_count: number;
  latest_event_at: string | null;
};

export type DiscoveredDomain = {
  id: number;
  domain: string;
  source_url: string;
  rationale: string;
  trust_score: number;
  status: string;
};

export type ResearchQueryListItem = {
  id: number;
  query: string;
  confidence: number;
  created_at: string;
};

export type DocumentDiff = {
  id: number;
  document_id: number;
  previous_snapshot_uri: string;
  current_snapshot_uri: string;
  previous_hash: string;
  current_hash: string;
  change_kind: string;
  change_ratio: number;
  material_change: boolean;
  before_excerpt: string;
  after_excerpt: string;
  diff_text: string;
  created_at: string;
};

export type DashboardSummary = {
  workspace_name: string;
  model_name: string;
  stats: DashboardStats;
  recent_sources: Source[];
  recent_alerts: Alert[];
  recent_entities: EntityListItem[];
  pending_domains: DiscoveredDomain[];
  recent_queries: ResearchQueryListItem[];
  recent_diffs: DocumentDiff[];
};

export type ResearchCitation = {
  source_title: string;
  source_url: string;
  published_date: string | null;
  crawl_date: string;
  quote: string;
  reason: string;
};

export type ResearchTimelineItem = {
  date: string;
  summary: string;
  source_url: string;
};

export type ResearchEvidenceItem = {
  document_id: number | null;
  source_title: string;
  source_url: string;
  published_date: string | null;
  crawl_date: string;
  summary: string;
  key_facts: string[];
  evidence_quotes: string[];
};

export type ResearchQuery = {
  id: number;
  query: string;
  concise_answer: string;
  expanded_answer: string;
  confidence: number;
  contradictions: string[];
  timeline: ResearchTimelineItem[];
  citations: ResearchCitation[];
  evidence_pack: ResearchEvidenceItem[];
  created_at: string;
};

export type Document = {
  id: number;
  canonical_url: string;
  document_type: string;
  snapshot_uri: string;
  publication_date: string | null;
  crawl_date: string;
  publisher: string | null;
  title: string;
  jurisdictions: string[];
  event_types: string[];
  source_tier: string | null;
  trust_score: number;
  relevance_score: number;
  materiality_label: string;
};

export type EntityTimelineItem = {
  id: number;
  event_type: string;
  severity: string;
  summary: string;
  source_url: string;
  created_at: string;
};

export type EntityRelationship = {
  id: number;
  source_entity_id: number;
  target_entity_id: number;
  relationship_type: string;
  confidence: number;
  relationship_metadata: Record<string, unknown>;
};

export type Entity = {
  id: number;
  kind: string;
  canonical_name: string;
  aliases: string[];
  summary: string | null;
  jurisdictions: string[];
  taxonomy_tags: string[];
  documents: Document[];
  timeline: EntityTimelineItem[];
  relationships: EntityRelationship[];
  diffs: DocumentDiff[];
};

export type Watchlist = {
  id: number;
  name: string;
  watched_entities: string[];
  watched_jurisdictions: string[];
  watched_topics: string[];
  status: string;
  archived_at: string | null;
  created_at: string;
};

export type WatchlistPayload = {
  name: string;
  watched_entities: string[];
  watched_jurisdictions: string[];
  watched_topics: string[];
};

export type DigestSettings = {
  schedule: string;
  email_recipients: string[];
  webhook_targets: string[];
  enabled: boolean;
  last_sent_at: string | null;
};

export type DigestSettingsPayload = {
  schedule: string;
  email_recipients: string[];
  webhook_targets: string[];
  enabled: boolean;
};

export type DigestDelivery = {
  id: number;
  digest_run_id: number;
  channel: string;
  target: string;
  status: string;
  response_code: number | null;
  message: string | null;
  artifact_uri: string | null;
  created_at: string;
};

export type DigestRun = {
  id: number;
  status: string;
  scheduled_for: string;
  window_start: string;
  window_end: string;
  alert_count: number;
  delivery_count: number;
  content_markdown: string;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  deliveries: DigestDelivery[];
};

export type SearchLocalResult = {
  id: number;
  title: string;
  url: string;
  document_type: string;
  source_tier: string | null;
  jurisdictions: string[];
  event_types: string[];
  entity_types: string[];
  publisher: string | null;
  trust_score: number;
  relevance_score: number;
  materiality_label: string;
  publication_date: string | null;
  crawl_date: string;
};

export type WebSearchResult = {
  title: string;
  url: string;
  published_date: string | null;
  text: string;
  score: number | null;
};

export type SearchResponse = {
  query: string;
  remote_results: WebSearchResult[];
  local_results: SearchLocalResult[];
};

export type TaxonomyValue = {
  taxonomy: string;
  value: string;
  label: string;
  description: string | null;
  sort_order: number;
};

export type TaxonomyGroup = {
  taxonomy: string;
  values: TaxonomyValue[];
};

export type CrawlJob = {
  id: number;
  source_id: number;
  status: string;
  trigger_type: string;
  scheduled_for: string;
  started_at: string | null;
  finished_at: string | null;
  source_run_id: number | null;
  note: string | null;
  error_message: string | null;
  created_at: string;
};

export type SchedulerStatus = {
  scheduler_enabled: boolean;
  pending_crawl_jobs: number;
  running_crawl_jobs: number;
  next_digest_at: string | null;
  due_source_ids: number[];
  recent_jobs: CrawlJob[];
};
