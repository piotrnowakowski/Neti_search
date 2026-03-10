# MVP Technical Implementation Plan

Derived from [PRD.md](/mnt/d/GitHub/Neti_Search/PRD.md). This is the short-form build plan for the first 8 weeks.

## Locked Stack

| Area | Decision |
| --- | --- |
| Frontend | Next.js on AWS Amplify |
| Sync API | FastAPI behind API Gateway + Lambda |
| Async jobs | Python workers on ECS Fargate consuming SQS |
| Scheduling | EventBridge |
| Database | RDS Postgres |
| Search / retrieval | Postgres full-text + `pgvector` |
| Snapshots / artifacts | S3 |
| Models | OpenRouter-first |
| Observability | CloudWatch logs + metrics |
| Secrets | AWS Secrets Manager |
| Auth | none for MVP, private internal deployment only |

## Core Contracts

### Data Contracts

- `WorkspaceConfig`
  - `name`, `default_jurisdictions`, `default_source_tiers`, `default_digest_schedule`, `openrouter_model_extract`, `openrouter_model_answer`
- `Source`
  - `kind`, `seed_value`, `label`, `jurisdiction`, `source_tier`, `crawl_frequency`, `trust_score`, `allow_flag`, `deny_flag`, `status`
- `Document`
  - `canonical_url`, `snapshot_uri`, `document_type`, `publication_date`, `crawl_date`, `title`, `publisher`, `raw_text`, `normalized_text`, `chunks`, `citation_offsets`, `trust_score`, `relevance_score`, `materiality_label`
- `Watchlist`
  - workspace-scoped `name`, `watched_entities`, `watched_jurisdictions`, `watched_topics`
- `Alert`
  - workspace-scoped `event_type`, `severity`, `entity_ids`, `document_ids`, `created_at`, `seen_at`
- `DigestSettings`
  - workspace-scoped `schedule`, `email_recipients`, `webhook_targets`

### Internal APIs

- `GET/POST /sources`
- `GET /sources/:id/runs`
- `GET/POST /watchlists`
- `GET /search`
- `GET /entities/:id`
- `POST /research/queries`
- `GET /research/queries/:id`
- `GET /alerts`
- `POST /discovery/domains/:id/approve`
- `POST /discovery/domains/:id/reject`

## Sprint Tickets

### Sprint 1: Foundation and Crawl Bootstrap

| Ticket | Implement | Done when |
| --- | --- | --- |
| `S1-01` | Scaffold Next.js app, FastAPI service, worker service, shared schema package, and local bootstrap workflow. | All services boot locally and CI can run lint, types, and tests. |
| `S1-02` | Provision AWS baseline: Amplify app, API Gateway + Lambda API, SQS queues, EventBridge schedules, S3 bucket, RDS Postgres, Secrets Manager. | Dev environment exists and app/config can connect to AWS-managed resources. |
| `S1-03` | Add core schema for `WorkspaceConfig`, `Source`, `Watchlist`, `CrawlJob`, `CrawlRun`, and document snapshot metadata. | Migrations run cleanly and seed data loads for MVP geographies and source tiers. |
| `S1-04` | Build source CRUD API/UI and workspace-scoped watchlist CRUD API/UI. | Sources and watchlists can be created, edited, listed, and archived. |
| `S1-05` | Implement baseline daily crawl scheduling and SQS dispatch. | Active sources generate crawl jobs automatically on schedule. |
| `S1-06` | Implement HTML fetcher, PDF fetcher, crawl-run tracking, and raw snapshot storage in S3. | A seed source can be fetched and its run outcome plus raw artifact are persisted. |

### Sprint 2: Parsing, Discovery, and Change Events

| Ticket | Implement | Done when |
| --- | --- | --- |
| `S2-01` | Implement robots checks, crawl budgets, rate limiting, retry/backoff, and terminal failure states. | Crawls respect policy, throttle correctly, and classify transient vs permanent failures. |
| `S2-02` | Implement canonical URL normalization, deduplication, HTML main-content extraction, PDF text extraction, and metadata extraction. | Duplicate URLs collapse correctly and normalized documents are persisted with title, dates, and publisher data. |
| `S2-03` | Implement chunking, citation offsets, page refs, and outgoing-link extraction. | Each document has retrievable chunks with stable citation references and extracted links. |
| `S2-04` | Implement discovery from internal links, sitemaps, linked documents, and scheduled search-query sources. | New candidate URLs and domains are generated with provenance. |
| `S2-05` | Implement candidate relevance scoring, external-domain trust scoring, and manual approve/reject actions. | External domains stay blocked until explicitly approved. |
| `S2-06` | Implement HTML/PDF diffing and typed material-change events. | Changed content generates diff records and timeline-ready events. |

### Sprint 3: Knowledge Layer, Search, and Core UI

| Ticket | Implement | Done when |
| --- | --- | --- |
| `S3-01` | Add entity schema for stablecoins, issuers, ledgers, regulators, jurisdictions, licenses, reserve reports, partners, enforcement actions, and research notes plus relationship tables with provenance. | Entity and relationship storage supports the PRD graph model. |
| `S3-02` | Add taxonomies for jurisdiction, stablecoin class, document type, event type, reserve model, redemption model, issuer type, and ledger category. | Classifications are seedable and usable in extraction and filtering. |
| `S3-03` | Implement rule-based extraction, OpenRouter-assisted extraction for hard cases, alias handling, entity linking, and document-to-entity linkage. | Documents resolve to canonical entities with confidence scores and provenance. |
| `S3-04` | Implement document trust scoring and relevance scoring. | Every document has reasoned trust/relevance scores available to search and research pipelines. |
| `S3-05` | Implement Postgres indexing jobs, search API, and filtered search UI. | Users can search by keyword and filter by jurisdiction, entity type, event type, document type, source tier, and freshness. |
| `S3-06` | Implement Daily Brief API/UI plus entity profile API/UI with overview, linked documents, and timeline. | Home and entity pages render source-backed data for the MVP workflow. |

### Sprint 4: Research, Alerts, and Pilot Readiness

| Ticket | Implement | Done when |
| --- | --- | --- |
| `S4-01` | Implement retrieval and reranking over indexed documents and entities using Postgres full-text + `pgvector`. | Research queries return ranked evidence candidates. |
| `S4-02` | Implement evidence-pack assembly with source, chunk, snapshot, and date references. | Answer generation uses only explicit evidence bundles. |
| `S4-03` | Implement balanced-synthesis answer generation, confidence scoring, contradiction detection, and timeline synthesis. | Research answers return concise and expanded modes with citations and conflict handling. |
| `S4-04` | Implement research workspace API/UI. | Users can submit a question and inspect answer, citations, and supporting timeline. |
| `S4-05` | Implement workspace-scoped alert matching, alert feed API/UI, daily digest jobs, and delivery pipeline. | Material events create alerts and appear in digest output. |
| `S4-06` | Implement dashboards, curated fixtures, gold datasets, regression checks, and performance checks. | The MVP is testable end to end and pilot-ready. |

## Technical Acceptance Tests

| Scenario | Must prove |
| --- | --- |
| Seed crawl | Source add -> scheduled crawl -> fetch -> snapshot -> normalized document -> indexed result -> entity page render |
| Controlled discovery | Internal link and search-assisted discovery create candidates; external domains require manual approval before crawl |
| Research answer | Multi-source query returns citations, contradiction handling, publication date, crawl date, and snapshot references |
| Alert path | Material document change creates diff -> event -> alert -> digest inclusion |
| Failure handling | Robots deny, duplicate URLs, unchanged content, scanned PDF without OCR, and OpenRouter timeout do not break the pipeline |

## Deferred

- `APP-*`
- `CMP-*`
- `EP-004`, `EP-005`
- `EXP-*`
- `API-*`
- most `ADM-*`, `SEC-*`, `LCH-*`
- OCR-heavy scanned-document workflows
- multi-tenant and external-customer work

## Implementation Notes

- Keep all watchlists, alerts, and digest settings workspace-scoped until auth is added later.
- Do not add OpenSearch in the first 8 weeks unless Postgres search is proven insufficient.
- Do not auto-approve newly discovered external domains.
- Keep model choice configurable via environment variables, but do not build provider abstraction in the MVP.
