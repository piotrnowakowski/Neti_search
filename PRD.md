# Product Requirements Document (PRD)

## Project Title: Regulated Stablecoin & Ledger Intelligence Platform

## 1. Purpose

Build a deep research and market intelligence application focused on regulated stablecoins and ledger infrastructure. The platform should:

- monitor predefined sources daily,
- expand discovery to relevant new pages and domains,
- build structured knowledge about stablecoins, issuers, regulators, and ledgers / DLT infrastructure,
- answer user questions with evidence-backed research outputs,
- generate alerts for material market, regulatory, and infrastructure changes.

The product is designed for the regulated market, not for general crypto news monitoring.

---

## 2. Problem Statement

Information relevant to regulated stablecoins and ledger infrastructure is fragmented across:

- regulators and legal acts,
- licensing and registration databases,
- issuer websites and whitepapers,
- reserve reports and attestations,
- banks, EMIs, custodians, and infrastructure partners,
- sandbox and DLT pilot initiatives,
- financial and industry media.

As a result:

- research is slow and manual,
- important changes are easy to miss,
- most available tools are news-first or social-first,
- there is no strong intelligence layer connecting stablecoin, issuer, ledger, jurisdiction, and regulatory status in one system.

---

## 3. Product Vision

Create an intelligence platform for regulated stablecoins and DLT rails that combines:

- continuous monitoring,
- evidence-backed research answers,
- source discovery,
- structured entity and relationship extraction,
- prioritization of official and high-trust sources.

The product should function as a focused intelligence system for compliance, strategy, and research teams operating in the regulated digital asset market.

---

## 4. Scope

### In Scope

- stablecoins used in or targeting regulated markets,
- stablecoin issuers,
- regulatory classification by jurisdiction,
- ledgers / DLT networks / market infrastructure connected to stablecoins and issuers,
- licensing, registration, enforcement, consultations, guidance, reserve reports, and whitepapers,
- monitoring, alerting, and research Q&A.

### Out of Scope for MVP

- trading functionality,
- custody or wallet functionality,
- transaction execution,
- full on-chain analytics stack,
- retail portfolio tracking,
- scraping private or unauthorized data sources.

---

## 5. Target Users

### Primary Users

#### Compliance / Legal / Regulatory Affairs Teams

Need to track changes in regulations, licensing, registrations, interpretations, and issuer status.

#### Strategy / Business Development / Partnerships Teams

Need to understand which stablecoins and ledgers are gaining traction in regulated market settings.

#### Research / Investment / Market Intelligence Teams

Need fast, evidence-backed answers without manually reviewing large numbers of sources.

### Secondary Users

#### Product and Tokenization Teams

Need to understand which stablecoin rails and ledger infrastructures are viable in regulated environments.

---

## 6. Jobs To Be Done

- Show all material changes related to regulated stablecoins in the last 24 hours.
- Identify which stablecoins have made regulatory progress in the EU, UK, US, or Hong Kong.
- Show which ledgers are used by regulated issuers.
- Compare two stablecoins by regulatory status, reserve model, redemption model, ledger coverage, and partnerships.
- Discover new pages and domains related to a specific issuer or stablecoin.
- Provide a research answer with citations instead of only a list of links.

---

## 7. Domain Assumptions

The data model must treat stablecoins as regulated financial objects, not only as tokens.

The platform must support classification such as:

- EMT,
- ART,
- fiat-referenced stablecoin,
- payment stablecoin,
- other relevant jurisdiction-specific categories.

The system should also track:

- reserve structure,
- redemption mechanics,
- issuer type,
- regulatory permissions,
- infrastructure usage,
- jurisdiction-specific status.

---

## 8. Core Data Model

### Main Entities

- Stablecoin
- Issuer
- Ledger / DLT Network
- Regulator
- Jurisdiction
- Legal Act / Consultation / Guidance
- License / Authorization / Register Entry
- Whitepaper
- Reserve Report / Attestation / Audit
- Custodian / Banking Partner / EMI
- Market Infrastructure
- Enforcement Action
- News Item
- Research Note

### Core Relationships

- stablecoin **issued_by** issuer
- stablecoin **runs_on** ledger
- issuer **regulated_by** regulator
- issuer **licensed_in** jurisdiction
- stablecoin **classified_as** category
- stablecoin **backed_by** reserve model
- stablecoin **attested_by** audit or attestation provider
- issuer or infrastructure **participates_in** sandbox / pilot / DLT initiative
- document **changes_status_of** entity

---

## 9. Source Strategy

### Tier 1: Official Sources

- regulators,
- legal and legislative databases,
- central registers,
- licensing databases,
- public consultation portals,
- supervisory statements and enforcement sources.

### Tier 2: Market Participant Sources

- issuer websites,
- stablecoin documentation pages,
- whitepapers,
- reserve and attestation pages,
- bank / EMI / custodian partner pages,
- official infrastructure announcements.

### Tier 3: Trusted Industry and Financial Media

- top-tier financial media,
- regulated digital asset media,
- selected research providers and newsletters.

### Tier 4: Social Sources

- post-MVP only,
- used only as a supplementary layer,
- never used as the primary evidence layer.

---

## 10. Discovery Model

The platform should not attempt uncontrolled crawling of the entire internet.

Instead, it should implement a controlled discovery model.

### 10.1 Seed-Based Crawl

Initial discovery should begin from:

- predefined domains,
- specific URLs,
- feeds,
- document libraries,
- register pages,
- search queries by entity and jurisdiction.

### 10.2 Internal Expansion

From relevant pages, the system should:

- follow related internal pages,
- explore sitemaps,
- follow pagination,
- ingest linked PDFs and official documents,
- apply crawl-depth limits by domain.

### 10.3 External Expansion

New external domains should only be added when they meet relevance and trust criteria, such as:

- linked from Tier 1 or Tier 2 sources,
- matched to monitored entities or events,
- aligned with monitored jurisdictions,
- above a trust threshold.

### 10.4 Search-Assisted Discovery

The system should run recurring structured searches such as:

- issuer + license
- stablecoin + MiCA
- ledger + settlement
- jurisdiction + stablecoin guidance
- issuer + reserve report
- stablecoin + redemption

LinkedIn-based discovery is post-MVP.

---

## 11. Functional Requirements

### FR-01. Source Registry

Users can add:

- domains,
- URLs,
- feeds,
- PDF pages,
- search queries,
- entities to watchlists.

Each source must include metadata such as:

- jurisdiction,
- source tier,
- crawl frequency,
- trust score,
- allow / deny flags.

### FR-02. Scheduler

The system must support:

- daily crawl baseline,
- higher-frequency crawling for critical sources,
- separate schedules for homepages, registers, press release pages, and PDF libraries.

### FR-03. Content Ingestion

The system must ingest and parse:

- HTML,
- PDF,
- metadata,
- publication date,
- author / publisher / issuer,
- outgoing links,
- document sections and tables where possible.

### FR-04. Change Detection

The system must detect:

- new pages,
- material edits to existing pages,
- new documents in registers,
- changes in entity status,
- changes in reserve reports, attestations, or whitepapers.

### FR-05. Relevance and Trust Scoring

Each document or page should receive a score based on:

- source tier,
- freshness,
- entity match quality,
- jurisdiction match,
- regulatory materiality,
- event type.

### FR-06. Entity Resolution

The system must identify and merge variants of the same:

- stablecoin,
- issuer,
- regulator,
- ledger,
- partner,
- legal or market document.

### FR-07. Taxonomy and Classification

The system must classify content by:

- jurisdiction,
- entity type,
- event type,
- document type,
- regulatory status,
- ledger category,
- payment relevance vs market infrastructure relevance.

### FR-08. Research Answer Engine

Users can ask research questions in natural language.

The system must return:

- a concise answer,
- an expanded answer,
- citations and sources,
- confidence score,
- contradictions or open issues,
- timeline of supporting developments.

### FR-09. Alerts

The system must support alerts for:

- new licenses, authorizations, and register entries,
- enforcement actions or compliance changes,
- reserve report and attestation updates,
- new ledger support,
- issuer partnerships,
- sandbox or DLT pilot participation,
- regulatory updates and consultations.

### FR-10. Entity Pages

Each entity page should include:

- overview,
- latest developments,
- linked documents,
- jurisdictions,
- regulatory status,
- related ledgers,
- event timeline.

### FR-11. Compare View

Users must be able to compare stablecoins, issuers, or ledgers by:

- jurisdiction coverage,
- regulatory status,
- reserve model,
- redemption model,
- infrastructure footprint,
- recent material events.

### FR-12. Watchlists

Users can watch:

- stablecoins,
- issuers,
- ledgers,
- jurisdictions,
- regulators,
- topics.

### FR-13. Evidence Layer

Every major statement in an answer must be traceable to:

- a source,
- a quoted or highlighted excerpt,
- publication date,
- crawl date,
- source snapshot or archived version.

### FR-14. Admin and Compliance Controls

The platform must support:

- robots and policy-aware crawling,
- allowlists and denylists,
- crawl budgets by domain,
- snapshot retention policies,
- audit logs,
- source-level controls.

### FR-15. Export and API

The platform must support:

- export to CSV, JSON, and PDF,
- email digests and webhooks,
- API access for internal systems and downstream tools.

---

## 12. MVP User Experience

### Home / Daily Brief

Should show:

- what changed today,
- top regulatory events,
- newly discovered entities or pages,
- highest-confidence alerts.

### Research Workspace

Should provide:

- natural-language question input,
- answer output,
- source list,
- timeline,
- comparison support.

### Entity Profile

Should provide:

- entity summary,
- latest changes,
- linked documents,
- ledger map,
- jurisdiction map.

### Change Diff View

Should show:

- what changed in a page or document,
- before / after view for material edits.

### Watchlist Center

Should provide:

- watched entities,
- alert subscriptions,
- digest settings.

---

## 13. MVP Scope

### Geographic Scope

- European Union
- United Kingdom
- United States
- Hong Kong

### Source Scope

- Tier 1 and Tier 2 sources,
- limited curated Tier 3 sources,
- no social ingestion,
- no private or paywalled data providers as core inputs.

### MVP Features

1. Source registry
2. Daily crawl
3. Controlled source discovery
4. HTML and PDF parsing
5. Entity extraction
6. Search and filtering
7. Entity pages
8. Daily digest
9. Alerts
10. Research answer engine with citations

### Explicitly Deferred Beyond MVP

- LinkedIn integration
- full on-chain telemetry
- X / Telegram / Discord ingestion
- advanced predictive analytics
- broad third-party premium data integrations

---

## 14. MVP Success Criteria

The MVP is considered successful when:

1. users can add seed sources and entity watchlists,
2. the system crawls and indexes new material daily,
3. the system discovers relevant new pages and selected new domains through controlled expansion,
4. the system classifies content into entities and jurisdictions,
5. users receive daily digests and alerts,
6. research questions return evidence-backed answers with citations,
7. entity pages include a usable timeline of changes,
8. every major answer claim is traceable to source evidence.

---

## 15. Post-MVP Roadmap

### Phase 2

- LinkedIn organization intelligence
- broader jurisdiction coverage
- stronger compare views
- expanded media coverage
- improved event severity scoring

### Phase 3

- on-chain telemetry connectors
- anomaly detection
- predictive risk and issuer health indicators
- partner API ecosystem
- multi-tenant enterprise workflows

---

## 16. LinkedIn Integration After MVP

LinkedIn should be added only after the MVP and only through authorized, official API-based integration.

### Intended Use Cases

- monitoring organization posts,
- capturing official issuer communications,
- identifying partnerships, launches, hiring signals, and positioning changes,
- enriching entity timelines with verified organizational activity.

### Out of Scope

- scraping personal profiles,
- scraping user feeds,
- direct message access,
- unauthorized personal data collection.

---

## 17. Non-Functional Requirements

### Traceability

Every major output must be backed by source evidence.

### Freshness

Seed sources should be updated at least daily.

### Auditability

The platform must retain snapshots and change history.

### Reliability

The crawl pipeline must support retries, backoff, monitoring, and failure handling.

### Security

The platform must support RBAC, secret management, and secure credential handling.

### Compliance

The platform must support source policy controls, data retention rules, and crawl governance.

### Performance

Standard search should be fast. Deep research workflows may be slower but must remain deterministic and evidence-backed.

### Scalability

The architecture must support scaling to thousands of domains and large document volumes.

---

## 18. Product KPIs

### Product KPIs

- percentage of relevant alerts,
- time to detect a material publication,
- percentage of answers with valid citations,
- percentage of discovered pages that are relevant,
- duplicate alert rate.

### Business KPIs

- weekly active users,
- number of watchlists per user,
- research queries per week,
- estimated time saved versus manual research,
- 30-day and 90-day retention.

### Quality KPIs

- entity classification precision,
- jurisdiction and event classification precision,
- hallucination rate in research answers,
- user acceptance of trust and relevance scoring.

---

## 19. Risks

### Noise and Low-Quality Discovery

Mitigated through source tiers, trust scoring, allowlists, and event severity scoring.

### Overly Broad Crawling

Mitigated through controlled discovery, crawl budgets, and domain expansion thresholds.

### Hallucinations in Research Answers

Mitigated through citation-gated generation and evidence-only answer construction.

### Entity Ambiguity

Mitigated through alias tables, merge / unmerge workflows, and human review support.

### LinkedIn Access Constraints

Mitigated by placing LinkedIn after MVP and limiting it to approved organizational access patterns.

### Paywalls and Login Walls

Mitigated through connector-based expansion instead of default crawling.

---

## 20. Market Positioning

The platform should be positioned as a:

**Regulated Stablecoin and DLT Market Intelligence Platform**

It should target compliance, strategy, and research teams that need structured, evidence-backed intelligence rather than general crypto monitoring.

---

## 21. Recommended Product Strategy

The recommended product strategy is:

- start with EU and UK regulatory depth, while including US and Hong Kong in MVP scope,
- prioritize official and issuer sources,
- build around the stablecoin, issuer, and ledger relationship graph,
- focus on daily monitoring and evidence-backed answers,
- add LinkedIn only after the MVP,
- avoid uncontrolled “entire internet” crawling and instead implement focused, trust-based discovery.
