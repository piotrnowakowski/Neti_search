"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Activity,
  Archive,
  BellRing,
  Bot,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileSearch,
  FileText,
  FolderSync,
  Globe,
  Radar,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Workflow,
  XCircle,
} from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { ResearchResult } from "@/components/research-result";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { csvToList, formatCompact, formatDate, formatDateTime, formatPercent } from "@/lib/format";
import type {
  DashboardSummary,
  DigestRun,
  DigestSettings,
  DiscoveredDomain,
  DocumentDiff,
  Entity,
  ResearchQuery,
  SchedulerStatus,
  SearchResponse,
  Source,
  SourceKind,
  SourcePayload,
  TaxonomyGroup,
  Watchlist,
  WatchlistPayload,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const defaultResearchPrompt =
  "What changed in USDC reserve reporting over the last quarter?";

const defaultSearchQuery = "USDC reserve";

const defaultSourceForm: SourcePayload = {
  kind: "search_query",
  label: "USDC reserve watch",
  seed_value: "USDC reserve attestation report",
  jurisdiction: "US",
  source_tier: "tier1",
  crawl_frequency: "daily",
  trust_score: 0.85,
  allow_flag: true,
  deny_flag: false,
  status: "active",
};

const defaultWatchlistForm = {
  name: "Reserve monitoring",
  watched_entities: "USDC, Circle",
  watched_jurisdictions: "US",
  watched_topics: "reserve, attestation, disclosure",
};

const defaultDigestForm = {
  schedule: "0 8 * * *",
  email_recipients: "ops@example.com",
  webhook_targets: "",
  enabled: "enabled",
};

const defaultSearchFilters = {
  jurisdiction: "all",
  entity_type: "all",
  event_type: "all",
  document_type: "all",
  source_tier: "all",
  freshness_days: "all",
};

function severityClassName(value: string) {
  switch (value.toLowerCase()) {
    case "high":
      return "border-red-200 bg-red-50 text-red-700";
    case "medium":
    case "partial_failure":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

function statusClassName(value: string) {
  switch (value.toLowerCase()) {
    case "approved":
    case "active":
    case "completed":
    case "delivered":
    case "running":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
    case "failed":
    case "archived":
      return "border-red-200 bg-red-50 text-red-700";
    case "pending":
    case "queued":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function kindLabel(kind: string) {
  return kind.replaceAll("_", " ");
}

function listToCsv(values: string[]) {
  return values.join(", ");
}

function taxonomyValues(groups: TaxonomyGroup[], taxonomy: string) {
  return groups.find((group) => group.taxonomy === taxonomy)?.values ?? [];
}

function filterValue(value: string) {
  return value === "all" ? null : value;
}

type SearchFiltersState = typeof defaultSearchFilters;

export function DashboardShell() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [digestSettings, setDigestSettings] = useState<DigestSettings | null>(null);
  const [digestRuns, setDigestRuns] = useState<DigestRun[]>([]);
  const [diffs, setDiffs] = useState<DocumentDiff[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [taxonomies, setTaxonomies] = useState<TaxonomyGroup[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [selectedDiffId, setSelectedDiffId] = useState<number | null>(null);
  const [researchQuery, setResearchQuery] = useState(defaultResearchPrompt);
  const [researchResult, setResearchResult] = useState<ResearchQuery | null>(null);
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery);
  const [searchFilters, setSearchFilters] = useState<SearchFiltersState>(defaultSearchFilters);
  const [sourceForm, setSourceForm] = useState<SourcePayload>(defaultSourceForm);
  const [watchlistForm, setWatchlistForm] = useState(defaultWatchlistForm);
  const [digestForm, setDigestForm] = useState(defaultDigestForm);
  const [editingSourceId, setEditingSourceId] = useState<number | null>(null);
  const [editingWatchlistId, setEditingWatchlistId] = useState<number | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [entityError, setEntityError] = useState<string | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSummaryPending, startSummaryTransition] = useTransition();
  const [isResearchPending, startResearchTransition] = useTransition();
  const [isSearchPending, startSearchTransition] = useTransition();
  const [isMutationPending, startMutationTransition] = useTransition();
  const [isEntityPending, startEntityTransition] = useTransition();

  const selectedDiff = useMemo(
    () =>
      diffs.find((diff) => diff.id === selectedDiffId) ??
      summary?.recent_diffs.find((diff) => diff.id === selectedDiffId) ??
      diffs[0] ??
      summary?.recent_diffs[0] ??
      null,
    [diffs, selectedDiffId, summary?.recent_diffs],
  );

  const metricCards = summary
    ? [
        {
          label: "Sources",
          value: formatCompact(summary.stats.sources),
          detail: "Curated feeds, domains, and search seeds.",
          icon: Radar,
          accentClassName: "text-sky-700",
        },
        {
          label: "Documents",
          value: formatCompact(summary.stats.documents),
          detail: "Normalized records with jurisdictions and event tags.",
          icon: FileText,
          accentClassName: "text-cyan-700",
        },
        {
          label: "Entities",
          value: formatCompact(summary.stats.entities),
          detail: "Stablecoins, issuers, regulators, ledgers, and more.",
          icon: Globe,
          accentClassName: "text-emerald-700",
        },
        {
          label: "Alerts",
          value: formatCompact(summary.stats.alerts),
          detail: "Watchlist-matched signals from events and material diffs.",
          icon: BellRing,
          accentClassName: "text-amber-700",
        },
        {
          label: "Diffs",
          value: formatCompact(summary.stats.diff_records),
          detail: "Before/after records for changed documents.",
          icon: Workflow,
          accentClassName: "text-violet-700",
        },
        {
          label: "Digests",
          value: formatCompact(summary.stats.digest_runs),
          detail: "Generated daily briefs and delivery attempts.",
          icon: Send,
          accentClassName: "text-rose-700",
        },
      ]
    : [];

  async function loadWorkspace() {
    try {
      setSummaryError(null);
      const [
        summaryPayload,
        sourcesPayload,
        watchlistsPayload,
        digestSettingsPayload,
        digestRunsPayload,
        diffsPayload,
        schedulerPayload,
        taxonomyPayload,
      ] = await Promise.all([
        apiFetch<DashboardSummary>("/api/dashboard/summary"),
        apiFetch<Source[]>("/api/sources?include_archived=true"),
        apiFetch<Watchlist[]>("/api/watchlists?include_archived=true"),
        apiFetch<DigestSettings>("/api/digest/settings"),
        apiFetch<DigestRun[]>("/api/digest/runs"),
        apiFetch<DocumentDiff[]>("/api/diffs"),
        apiFetch<SchedulerStatus>("/api/scheduler/status"),
        apiFetch<TaxonomyGroup[]>("/api/taxonomies"),
      ]);
      setSummary(summaryPayload);
      setSources(sourcesPayload);
      setWatchlists(watchlistsPayload);
      setDigestSettings(digestSettingsPayload);
      setDigestRuns(digestRunsPayload);
      setDiffs(diffsPayload);
      setSchedulerStatus(schedulerPayload);
      setTaxonomies(taxonomyPayload);
      setDigestForm({
        schedule: digestSettingsPayload.schedule,
        email_recipients: listToCsv(digestSettingsPayload.email_recipients),
        webhook_targets: listToCsv(digestSettingsPayload.webhook_targets),
        enabled: digestSettingsPayload.enabled ? "enabled" : "disabled",
      });
      setSelectedEntityId((current) => current ?? summaryPayload.recent_entities[0]?.id ?? null);
      setSelectedDiffId((current) => current ?? diffsPayload[0]?.id ?? summaryPayload.recent_diffs[0]?.id ?? null);
    } catch (error) {
      setSummaryError(
        error instanceof Error ? error.message : "Unable to load the workspace.",
      );
    }
  }

  async function loadEntity(entityId: number) {
    try {
      setEntityError(null);
      const payload = await apiFetch<Entity>(`/api/entities/${entityId}`);
      setSelectedEntity(payload);
    } catch (error) {
      setEntityError(error instanceof Error ? error.message : "Unable to load the entity.");
    }
  }

  useEffect(() => {
    startSummaryTransition(() => {
      void loadWorkspace();
    });
  }, []);

  useEffect(() => {
    if (!selectedEntityId) {
      return;
    }
    startEntityTransition(() => {
      void loadEntity(selectedEntityId);
    });
  }, [selectedEntityId]);

  async function refreshWorkspace() {
    await loadWorkspace();
    if (selectedEntityId) {
      await loadEntity(selectedEntityId);
    }
  }

  async function runSearch() {
    try {
      setSearchError(null);
      setNotice(null);
      const params = new URLSearchParams({
        q: searchQuery,
        num_results: "6",
      });
      const jurisdiction = filterValue(searchFilters.jurisdiction);
      const entityType = filterValue(searchFilters.entity_type);
      const eventType = filterValue(searchFilters.event_type);
      const documentType = filterValue(searchFilters.document_type);
      const sourceTier = filterValue(searchFilters.source_tier);
      const freshnessDays = filterValue(searchFilters.freshness_days);
      if (jurisdiction) {
        params.set("jurisdiction", jurisdiction);
      }
      if (entityType) {
        params.set("entity_type", entityType);
      }
      if (eventType) {
        params.set("event_type", eventType);
      }
      if (documentType) {
        params.set("document_type", documentType);
      }
      if (sourceTier) {
        params.set("source_tier", sourceTier);
      }
      if (freshnessDays) {
        params.set("freshness_days", freshnessDays);
      }
      const payload = await apiFetch<SearchResponse>(`/api/search?${params.toString()}`);
      setSearchResults(payload);
      setNotice(`Filtered search returned ${payload.local_results.length} local results.`);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Search failed.");
    }
  }

  async function runResearch() {
    try {
      setResearchError(null);
      setNotice(null);
      const payload = await apiFetch<ResearchQuery>("/api/research/queries", {
        method: "POST",
        body: JSON.stringify({ query: researchQuery, num_results: 5 }),
      });
      setResearchResult(payload);
      setNotice("Research completed with explicit evidence-pack assembly.");
      await refreshWorkspace();
    } catch (error) {
      setResearchError(error instanceof Error ? error.message : "Research failed.");
    }
  }

  async function createOrUpdateSource() {
    try {
      setNotice(null);
      if (editingSourceId) {
        const payload = await apiFetch<Source>(`/api/sources/${editingSourceId}`, {
          method: "PUT",
          body: JSON.stringify(sourceForm),
        });
        setNotice(`Source updated: ${payload.label}`);
      } else {
        const payload = await apiFetch<Source>("/api/sources", {
          method: "POST",
          body: JSON.stringify(sourceForm),
        });
        setNotice(`Source created: ${payload.label}`);
      }
      setEditingSourceId(null);
      setSourceForm(defaultSourceForm);
      await refreshWorkspace();
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Unable to save source.");
    }
  }

  async function archiveSource(sourceId: number) {
    try {
      await apiFetch<Source>(`/api/sources/${sourceId}/archive`, { method: "POST" });
      setNotice(`Source ${sourceId} archived.`);
      if (editingSourceId === sourceId) {
        setEditingSourceId(null);
        setSourceForm(defaultSourceForm);
      }
      await refreshWorkspace();
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Unable to archive source.");
    }
  }

  async function crawlSource(sourceId: number) {
    try {
      setNotice(null);
      await apiFetch(`/api/sources/${sourceId}/crawl`, {
        method: "POST",
      });
      setNotice(`Source ${sourceId} crawled successfully.`);
      await refreshWorkspace();
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Unable to crawl source.");
    }
  }

  async function createOrUpdateWatchlist() {
    try {
      setNotice(null);
      const payload: WatchlistPayload = {
        name: watchlistForm.name,
        watched_entities: csvToList(watchlistForm.watched_entities),
        watched_jurisdictions: csvToList(watchlistForm.watched_jurisdictions),
        watched_topics: csvToList(watchlistForm.watched_topics),
      };
      if (editingWatchlistId) {
        await apiFetch(`/api/watchlists/${editingWatchlistId}`, {
          method: "PUT",
          body: JSON.stringify({ ...payload, status: "active" }),
        });
        setNotice(`Watchlist updated: ${watchlistForm.name}`);
      } else {
        await apiFetch("/api/watchlists", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice(`Watchlist created: ${watchlistForm.name}`);
      }
      setEditingWatchlistId(null);
      setWatchlistForm(defaultWatchlistForm);
      await refreshWorkspace();
    } catch (error) {
      setSummaryError(
        error instanceof Error ? error.message : "Unable to save watchlist.",
      );
    }
  }

  async function archiveWatchlist(watchlistId: number) {
    try {
      await apiFetch(`/api/watchlists/${watchlistId}/archive`, { method: "POST" });
      setNotice(`Watchlist ${watchlistId} archived.`);
      if (editingWatchlistId === watchlistId) {
        setEditingWatchlistId(null);
        setWatchlistForm(defaultWatchlistForm);
      }
      await refreshWorkspace();
    } catch (error) {
      setSummaryError(
        error instanceof Error ? error.message : "Unable to archive watchlist.",
      );
    }
  }

  async function saveDigestSettings() {
    try {
      setNotice(null);
      const payload = await apiFetch<DigestSettings>("/api/digest/settings", {
        method: "PUT",
        body: JSON.stringify({
          schedule: digestForm.schedule,
          email_recipients: csvToList(digestForm.email_recipients),
          webhook_targets: csvToList(digestForm.webhook_targets),
          enabled: digestForm.enabled === "enabled",
        }),
      });
      setDigestSettings(payload);
      setNotice("Digest settings updated.");
      await refreshWorkspace();
    } catch (error) {
      setSummaryError(
        error instanceof Error ? error.message : "Unable to update digest settings.",
      );
    }
  }

  async function runDigestNow() {
    try {
      await apiFetch<DigestRun>("/api/digest/run", { method: "POST" });
      setNotice("Digest generated and delivered.");
      await refreshWorkspace();
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Unable to run digest.");
    }
  }

  async function runDueWork() {
    try {
      await apiFetch<SchedulerStatus>("/api/scheduler/run-due", { method: "POST" });
      setNotice("Scheduled crawl and digest queue processed.");
      await refreshWorkspace();
    } catch (error) {
      setSummaryError(
        error instanceof Error ? error.message : "Unable to run scheduled work.",
      );
    }
  }

  async function setDomainStatus(domain: DiscoveredDomain, status: "approve" | "reject") {
    try {
      setNotice(null);
      await apiFetch(`/api/discovery/domains/${domain.id}/${status}`, {
        method: "POST",
      });
      setNotice(`${domain.domain} ${status}d.`);
      await refreshWorkspace();
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Unable to update the domain.");
    }
  }

  async function loadStoredResearch(queryId: number) {
    try {
      setResearchError(null);
      const payload = await apiFetch<ResearchQuery>(`/api/research/queries/${queryId}`);
      setResearchResult(payload);
      setResearchQuery(payload.query);
    } catch (error) {
      setResearchError(
        error instanceof Error ? error.message : "Unable to load the research run.",
      );
    }
  }

  const jurisdictionOptions = taxonomyValues(taxonomies, "jurisdiction");
  const entityTypeOptions = taxonomyValues(taxonomies, "entity_type");
  const eventTypeOptions = taxonomyValues(taxonomies, "event_type");
  const documentTypeOptions = taxonomyValues(taxonomies, "document_type");
  const sourceTierOptions = taxonomyValues(taxonomies, "source_tier");

  return (
    <main className="page-shell mx-auto min-h-screen w-full max-w-[1550px] px-4 py-6 md:px-8 md:py-8">
      <section className="mb-6 grid gap-4 lg:grid-cols-[1.65fr_0.95fr]">
        <Card className="hero-sheen surface-glow overflow-hidden border-white/70">
          <CardContent className="px-6 py-6 md:px-8 md:py-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/12 text-primary">Local intelligence workspace</Badge>
              <Badge variant="outline" className="bg-white/70">
                Filtered search
              </Badge>
              <Badge variant="outline" className="bg-white/70">
                Change diffs
              </Badge>
              <Badge variant="outline" className="bg-white/70">
                Scheduled digests
              </Badge>
            </div>
            <div className="mt-6 max-w-3xl space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary/80">
                Regulated Stablecoin Intelligence
              </p>
              <h1 className="text-4xl leading-tight font-semibold tracking-tight text-foreground md:text-5xl">
                Search, crawl, diff, alert, and digest regulated-market changes from one local control room.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground">
                The workspace now exposes filtered search, before/after material-change review,
                scheduler status, daily digest delivery settings, and editable source and watchlist
                centers.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel surface-glow border-white/60 bg-white/82">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">
                  {summary?.workspace_name ?? "Neti Search"}
                </CardTitle>
                <CardDescription>Scheduler, digest, and discovery status</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  startSummaryTransition(() => {
                    void refreshWorkspace();
                  })
                }
                disabled={isSummaryPending || isEntityPending}
              >
                <RefreshCw
                  className={cn(
                    "size-4",
                    (isSummaryPending || isEntityPending) && "animate-spin",
                  )}
                />
                Refresh
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  <Bot className="size-3.5" />
                  Model
                </div>
                <p className="font-mono text-sm text-foreground">
                  {summary?.model_name ?? "Loading..."}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  Next digest
                </div>
                <p className="text-sm font-medium text-foreground">
                  {schedulerStatus?.next_digest_at
                    ? formatDateTime(schedulerStatus.next_digest_at)
                    : "Digest disabled"}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  <Activity className="size-3.5" />
                  Pending jobs
                </div>
                <p className="text-sm font-medium text-foreground">
                  {schedulerStatus
                    ? `${schedulerStatus.pending_crawl_jobs} queued / ${schedulerStatus.running_crawl_jobs} running`
                    : "Loading..."}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  <Radar className="size-3.5" />
                  Pending discovery
                </div>
                <p className="text-sm font-medium text-foreground">
                  {summary ? `${summary.stats.pending_domains} domains awaiting review` : "Loading..."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  startMutationTransition(() => {
                    void runDueWork();
                  })
                }
                disabled={isMutationPending}
              >
                <Workflow className="size-4" />
                Run due queue
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  startMutationTransition(() => {
                    void runDigestNow();
                  })
                }
                disabled={isMutationPending}
              >
                <Send className="size-4" />
                Send digest now
              </Button>
            </div>
            {notice ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {notice}
              </div>
            ) : null}
            {summaryError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {summaryError}
              </div>
            ) : null}
          </CardHeader>
        </Card>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summary
          ? metricCards.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                detail={metric.detail}
                icon={metric.icon}
                accentClassName={metric.accentClassName}
              />
            ))
          : Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="glass-panel border-white/60 bg-white/80">
                <CardContent className="space-y-4 px-4 py-5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.95fr]">
        <div className="space-y-6">
          <Card className="glass-panel surface-glow border-white/60 bg-white/84">
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">Filtered search</CardTitle>
                  <CardDescription>
                    Search indexed documents with jurisdiction, entity, event, document, source-tier, and freshness filters.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-white/70">
                  PRD MVP #6
                </Badge>
              </div>
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Keyword search"
                    className="bg-background/85"
                  />
                  <Button
                    onClick={() =>
                      startSearchTransition(() => {
                        void runSearch();
                      })
                    }
                    disabled={!searchQuery.trim() || isSearchPending}
                  >
                    <FileSearch className={cn("size-4", isSearchPending && "animate-pulse")} />
                    Search
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <Select
                    value={searchFilters.jurisdiction}
                    onValueChange={(value) =>
                      setSearchFilters((current) => ({
                        ...current,
                        jurisdiction: value ?? "all",
                      }))
                    }
                  >
                    <SelectTrigger className="bg-background/85">
                      <SelectValue placeholder="Jurisdiction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All jurisdictions</SelectItem>
                      {jurisdictionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={searchFilters.entity_type}
                    onValueChange={(value) =>
                      setSearchFilters((current) => ({
                        ...current,
                        entity_type: value ?? "all",
                      }))
                    }
                  >
                    <SelectTrigger className="bg-background/85">
                      <SelectValue placeholder="Entity type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All entity types</SelectItem>
                      {entityTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={searchFilters.event_type}
                    onValueChange={(value) =>
                      setSearchFilters((current) => ({
                        ...current,
                        event_type: value ?? "all",
                      }))
                    }
                  >
                    <SelectTrigger className="bg-background/85">
                      <SelectValue placeholder="Event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All event types</SelectItem>
                      {eventTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={searchFilters.document_type}
                    onValueChange={(value) =>
                      setSearchFilters((current) => ({
                        ...current,
                        document_type: value ?? "all",
                      }))
                    }
                  >
                    <SelectTrigger className="bg-background/85">
                      <SelectValue placeholder="Document type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All document types</SelectItem>
                      {documentTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={searchFilters.source_tier}
                    onValueChange={(value) =>
                      setSearchFilters((current) => ({
                        ...current,
                        source_tier: value ?? "all",
                      }))
                    }
                  >
                    <SelectTrigger className="bg-background/85">
                      <SelectValue placeholder="Source tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All source tiers</SelectItem>
                      {sourceTierOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={searchFilters.freshness_days}
                    onValueChange={(value) =>
                      setSearchFilters((current) => ({
                        ...current,
                        freshness_days: value ?? "all",
                      }))
                    }
                  >
                    <SelectTrigger className="bg-background/85">
                      <SelectValue placeholder="Freshness" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any freshness</SelectItem>
                      <SelectItem value="1">Last 24h</SelectItem>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {searchError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {searchError}
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Local indexed matches
                  </p>
                  <Badge variant="outline" className="bg-white/70">
                    {searchResults?.local_results.length ?? 0}
                  </Badge>
                </div>
                <ScrollArea className="max-h-[24rem] pr-2">
                  <div className="space-y-3">
                    {searchResults?.local_results.length ? (
                      searchResults.local_results.map((result) => (
                        <div
                          key={result.id}
                          className="rounded-2xl border border-border/70 bg-background/80 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="bg-secondary/80">
                              {result.document_type}
                            </Badge>
                            {result.source_tier ? (
                              <Badge variant="outline" className="bg-white/70">
                                {result.source_tier}
                              </Badge>
                            ) : null}
                            <Badge className={cn("border", statusClassName(result.materiality_label))}>
                              {result.materiality_label}
                            </Badge>
                          </div>
                          <p className="mt-3 font-medium text-foreground">{result.title}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {result.jurisdictions.map((item) => (
                              <span key={`${result.id}-jur-${item}`}>{item}</span>
                            ))}
                            {result.entity_types.slice(0, 3).map((item) => (
                              <Badge key={`${result.id}-entity-${item}`} variant="outline" className="bg-white/70">
                                {item}
                              </Badge>
                            ))}
                          </div>
                          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Trust {formatPercent(result.trust_score)} / Relevance{" "}
                            {formatPercent(result.relevance_score)}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span>{formatDateTime(result.crawl_date)}</span>
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              Open source
                              <ExternalLink className="size-3" />
                            </a>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-5 text-sm text-muted-foreground">
                        Run a filtered search to inspect local indexed matches.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Remote discovery results
                  </p>
                  <Badge variant="outline" className="bg-white/70">
                    {searchResults?.remote_results.length ?? 0}
                  </Badge>
                </div>
                <ScrollArea className="max-h-[24rem] pr-2">
                  <div className="space-y-3">
                    {searchResults?.remote_results.length ? (
                      searchResults.remote_results.map((result) => (
                        <div
                          key={result.url}
                          className="rounded-2xl border border-border/70 bg-white/80 p-4"
                        >
                          <p className="font-medium text-foreground">{result.title}</p>
                          <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground">
                            {result.text || "No preview text available."}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span>{result.published_date ? formatDate(result.published_date) : "Date unknown"}</span>
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              Open result
                              <ExternalLink className="size-3" />
                            </a>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-border/70 bg-white/70 px-4 py-5 text-sm text-muted-foreground">
                        Remote search results will appear here alongside local matches.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel surface-glow border-white/60 bg-white/84">
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">Run detailed research</CardTitle>
                  <CardDescription>
                    Retrieval now uses the local evidence pack first and supplements it with remote search only when needed.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-white/70">
                    Evidence pack
                  </Badge>
                  <Badge variant="outline" className="bg-white/70">
                    Citation-first
                  </Badge>
                </div>
              </div>
              <div className="grid gap-3">
                <Textarea
                  value={researchQuery}
                  onChange={(event) => setResearchQuery(event.target.value)}
                  className="min-h-28 rounded-3xl border-white/70 bg-background/85 text-base leading-7"
                  placeholder="Ask a detailed question about an issuer, product, or regulatory event."
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    size="lg"
                    onClick={() =>
                      startResearchTransition(() => {
                        void runResearch();
                      })
                    }
                    disabled={!researchQuery.trim() || isResearchPending}
                  >
                    <Sparkles className={cn("size-4", isResearchPending && "animate-pulse")} />
                    Run detailed research
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setResearchQuery(defaultResearchPrompt)}
                  >
                    Reset example
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          <ResearchResult
            result={researchResult}
            loading={isResearchPending}
            error={researchError}
          />

          <Card className="glass-panel border-white/60 bg-white/82">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">Entity radar</CardTitle>
                  <CardDescription>
                    Inspect entity-linked documents, relationships, events, and diffs.
                  </CardDescription>
                </div>
                {selectedEntity ? (
                  <Badge className="bg-primary/10 text-primary">{selectedEntity.kind}</Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="space-y-3">
                <div className="pattern-divider pb-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Recent entities
                  </p>
                </div>
                <div className="space-y-3">
                  {summary?.recent_entities.length ? (
                    summary.recent_entities.map((entity) => (
                      <button
                        key={entity.id}
                        type="button"
                        onClick={() => setSelectedEntityId(entity.id)}
                        className={cn(
                          "w-full rounded-2xl border px-4 py-3 text-left transition-all",
                          selectedEntityId === entity.id
                            ? "border-primary/30 bg-primary/6 shadow-sm"
                            : "border-border/70 bg-background/75 hover:bg-background",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">
                              {entity.canonical_name}
                            </p>
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              {entity.kind}
                            </p>
                          </div>
                          <Badge variant="outline" className="bg-white/70">
                            {entity.document_count} docs
                          </Badge>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                          {entity.summary ?? "No summary available yet."}
                        </p>
                      </button>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-5 text-sm text-muted-foreground">
                      Entities will appear here after ingestion or research runs.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4 rounded-[1.75rem] border border-border/70 bg-background/80 p-5">
                {isEntityPending && !selectedEntity ? (
                  <div className="space-y-4">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : entityError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {entityError}
                  </div>
                ) : selectedEntity ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                          {selectedEntity.canonical_name}
                        </h3>
                        {selectedEntity.aliases.slice(0, 3).map((alias) => (
                          <Badge key={alias} variant="outline" className="bg-white/70">
                            {alias}
                          </Badge>
                        ))}
                        {selectedEntity.jurisdictions.map((jurisdiction) => (
                          <Badge key={jurisdiction} className="bg-primary/10 text-primary">
                            {jurisdiction}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm leading-7 text-muted-foreground">
                        {selectedEntity.summary ??
                          "The entity summary will be refined as more evidence is ingested."}
                      </p>
                    </div>

                    <Separator />

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-3">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                          Documents
                        </p>
                        <ScrollArea className="max-h-[18rem] pr-2">
                          <div className="space-y-3">
                            {selectedEntity.documents.map((document) => (
                              <div
                                key={document.id}
                                className="rounded-2xl border border-border/70 bg-white/80 p-4"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="secondary" className="bg-secondary/80">
                                    {document.document_type}
                                  </Badge>
                                  {document.source_tier ? (
                                    <Badge variant="outline" className="bg-white/70">
                                      {document.source_tier}
                                    </Badge>
                                  ) : null}
                                  <Badge variant="outline" className="bg-white/70">
                                    {document.materiality_label}
                                  </Badge>
                                </div>
                                <p className="mt-3 font-medium text-foreground">
                                  {document.title}
                                </p>
                                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                  Trust {formatPercent(document.trust_score)} / Relevance{" "}
                                  {formatPercent(document.relevance_score)}
                                </p>
                                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                  <span>{formatDateTime(document.crawl_date)}</span>
                                  <a
                                    href={document.canonical_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                  >
                                    Open source
                                    <ExternalLink className="size-3" />
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                          Timeline
                        </p>
                        <ScrollArea className="max-h-[18rem] pr-2">
                          <div className="space-y-4">
                            {selectedEntity.timeline.length ? (
                              selectedEntity.timeline.map((item) => (
                                <div key={item.id} className="data-dot pl-4">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                      className={cn("border", severityClassName(item.severity))}
                                    >
                                      {item.severity}
                                    </Badge>
                                    <Badge variant="outline" className="bg-white/70">
                                      {item.event_type}
                                    </Badge>
                                  </div>
                                  <p className="mt-2 text-sm leading-7 text-foreground">
                                    {item.summary}
                                  </p>
                                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    <span>{formatDateTime(item.created_at)}</span>
                                    <a
                                      href={item.source_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-primary hover:underline"
                                    >
                                      Source
                                      <ExternalLink className="size-3" />
                                    </a>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="rounded-2xl border border-dashed border-border/70 bg-white/70 px-4 py-5 text-sm text-muted-foreground">
                                No events linked to this entity yet.
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-3">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                          Relationships
                        </p>
                        <div className="space-y-2">
                          {selectedEntity.relationships.length ? (
                            selectedEntity.relationships.map((relationship) => (
                              <div
                                key={relationship.id}
                                className="rounded-2xl border border-border/70 bg-white/80 p-4 text-sm"
                              >
                                <p className="font-medium text-foreground">
                                  {relationship.relationship_type}
                                </p>
                                <p className="mt-1 text-muted-foreground">
                                  Confidence {formatPercent(relationship.confidence)}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="rounded-2xl border border-dashed border-border/70 bg-white/70 px-4 py-5 text-sm text-muted-foreground">
                              Relationships will appear as linked entities accumulate.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                          Linked diffs
                        </p>
                        <div className="space-y-2">
                          {selectedEntity.diffs.length ? (
                            selectedEntity.diffs.slice(0, 4).map((diff) => (
                              <button
                                key={diff.id}
                                type="button"
                                onClick={() => setSelectedDiffId(diff.id)}
                                className="w-full rounded-2xl border border-border/70 bg-white/80 p-4 text-left transition-colors hover:bg-white"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <Badge className={cn("border", statusClassName(diff.change_kind))}>
                                    {diff.change_kind}
                                  </Badge>
                                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                    {formatDateTime(diff.created_at)}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm text-foreground">
                                  Change ratio {formatPercent(diff.change_ratio)}
                                </p>
                              </button>
                            ))
                          ) : (
                            <p className="rounded-2xl border border-dashed border-border/70 bg-white/70 px-4 py-5 text-sm text-muted-foreground">
                              No diff records linked to this entity yet.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border/70 bg-white/70 px-4 py-5 text-sm text-muted-foreground">
                    Select an entity to inspect linked documents and timeline events.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-panel surface-glow border-white/60 bg-white/84">
            <CardHeader>
              <CardTitle className="text-xl">Sources and scheduler</CardTitle>
              <CardDescription>
                Edit or archive sources, inspect scheduled jobs, and trigger ingestion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3">
                <Input
                  value={sourceForm.label}
                  onChange={(event) =>
                    setSourceForm((current) => ({ ...current, label: event.target.value }))
                  }
                  placeholder="Source label"
                />
                <Input
                  value={sourceForm.seed_value}
                  onChange={(event) =>
                    setSourceForm((current) => ({
                      ...current,
                      seed_value: event.target.value,
                    }))
                  }
                  placeholder="Seed value or query"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    value={sourceForm.kind}
                    onValueChange={(value) =>
                      setSourceForm((current) => ({
                        ...current,
                        kind: (value ?? current.kind) as SourceKind,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full bg-background/85">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="search_query">search_query</SelectItem>
                      <SelectItem value="domain">domain</SelectItem>
                      <SelectItem value="url">url</SelectItem>
                      <SelectItem value="feed">feed</SelectItem>
                      <SelectItem value="pdf">pdf</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={sourceForm.source_tier}
                    onValueChange={(value) =>
                      setSourceForm((current) => ({
                        ...current,
                        source_tier: value ?? current.source_tier,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full bg-background/85">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tier1">tier1</SelectItem>
                      <SelectItem value="tier2">tier2</SelectItem>
                      <SelectItem value="tier3">tier3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    value={sourceForm.jurisdiction ?? ""}
                    onChange={(event) =>
                      setSourceForm((current) => ({
                        ...current,
                        jurisdiction: event.target.value || null,
                      }))
                    }
                    placeholder="Jurisdiction"
                  />
                  <Select
                    value={sourceForm.crawl_frequency}
                    onValueChange={(value) =>
                      setSourceForm((current) => ({
                        ...current,
                        crawl_frequency: value ?? current.crawl_frequency,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full bg-background/85">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">hourly</SelectItem>
                      <SelectItem value="daily">daily</SelectItem>
                      <SelectItem value="every_6_hours">every_6_hours</SelectItem>
                      <SelectItem value="weekly">weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() =>
                      startMutationTransition(() => {
                        void createOrUpdateSource();
                      })
                    }
                    disabled={isMutationPending}
                  >
                    <FolderSync className={cn("size-4", isMutationPending && "animate-spin")} />
                    {editingSourceId ? "Update source" : "Save source"}
                  </Button>
                  {editingSourceId ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingSourceId(null);
                        setSourceForm(defaultSourceForm);
                      }}
                    >
                      Reset
                    </Button>
                  ) : null}
                </div>
              </div>

              <Separator />

              <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  Scheduler
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    {schedulerStatus?.scheduler_enabled
                      ? "Local scheduler is enabled and processing due crawl and digest jobs."
                      : "Local scheduler is disabled."}
                  </p>
                  <p>
                    {schedulerStatus
                      ? `${schedulerStatus.due_source_ids.length} sources are currently due.`
                      : "Loading scheduler status..."}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Sources
                  </p>
                  <Badge variant="outline" className="bg-white/70">
                    {sources.length} total
                  </Badge>
                </div>
                <ScrollArea className="max-h-[20rem] pr-2">
                  <div className="space-y-3">
                    {sources.length ? (
                      sources.map((source) => (
                        <div
                          key={source.id}
                          className="rounded-2xl border border-border/70 bg-background/80 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-foreground">{source.label}</p>
                                <Badge variant="outline" className="bg-white/70">
                                  {kindLabel(source.kind)}
                                </Badge>
                                <Badge className={cn("border", statusClassName(source.status))}>
                                  {source.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{source.seed_value}</p>
                              <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                <span>
                                  Next {source.next_crawl_at ? formatDateTime(source.next_crawl_at) : "not scheduled"}
                                </span>
                                <span>
                                  Last success{" "}
                                  {source.last_success_at ? formatDateTime(source.last_success_at) : "never"}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingSourceId(source.id);
                                  setSourceForm({
                                    kind: source.kind,
                                    label: source.label,
                                    seed_value: source.seed_value,
                                    jurisdiction: source.jurisdiction,
                                    source_tier: source.source_tier,
                                    crawl_frequency: source.crawl_frequency,
                                    trust_score: source.trust_score,
                                    allow_flag: source.allow_flag,
                                    deny_flag: source.deny_flag,
                                    status: source.archived_at ? "active" : source.status,
                                  });
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  startMutationTransition(() => {
                                    void crawlSource(source.id);
                                  })
                                }
                                disabled={isMutationPending || source.archived_at !== null}
                              >
                                <FolderSync className="size-4" />
                                Crawl
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  startMutationTransition(() => {
                                    void archiveSource(source.id);
                                  })
                                }
                                disabled={isMutationPending || source.archived_at !== null}
                              >
                                <Archive className="size-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-5 text-sm text-muted-foreground">
                        Add the first source to start ingestion and scheduler dispatch.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Recent crawl jobs
                  </p>
                  <Badge variant="outline" className="bg-white/70">
                    {schedulerStatus?.recent_jobs.length ?? 0}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {schedulerStatus?.recent_jobs.length ? (
                    schedulerStatus.recent_jobs.map((job) => (
                      <div
                        key={job.id}
                        className="rounded-2xl border border-border/70 bg-white/80 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <Badge className={cn("border", statusClassName(job.status))}>
                            {job.status}
                          </Badge>
                          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {formatDateTime(job.scheduled_for)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-foreground">
                          Source #{job.source_id} via {job.trigger_type}
                        </p>
                        {job.note ? (
                          <p className="mt-2 text-xs text-muted-foreground">{job.note}</p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-border/70 bg-white/70 px-4 py-5 text-sm text-muted-foreground">
                      Scheduled crawl jobs will appear here after the queue runs.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/60 bg-white/82">
            <CardHeader>
              <CardTitle className="text-xl">Watchlist center</CardTitle>
              <CardDescription>
                Manage watchlists and configure digest schedule and delivery targets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="watchlists" className="gap-4">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="watchlists">Watchlists</TabsTrigger>
                  <TabsTrigger value="digest">Digest</TabsTrigger>
                </TabsList>

                <TabsContent value="watchlists" className="space-y-4">
                  <div className="grid gap-3">
                    <Input
                      value={watchlistForm.name}
                      onChange={(event) =>
                        setWatchlistForm((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Watchlist name"
                    />
                    <Input
                      value={watchlistForm.watched_entities}
                      onChange={(event) =>
                        setWatchlistForm((current) => ({
                          ...current,
                          watched_entities: event.target.value,
                        }))
                      }
                      placeholder="Entities, comma separated"
                    />
                    <Input
                      value={watchlistForm.watched_jurisdictions}
                      onChange={(event) =>
                        setWatchlistForm((current) => ({
                          ...current,
                          watched_jurisdictions: event.target.value,
                        }))
                      }
                      placeholder="Jurisdictions, comma separated"
                    />
                    <Input
                      value={watchlistForm.watched_topics}
                      onChange={(event) =>
                        setWatchlistForm((current) => ({
                          ...current,
                          watched_topics: event.target.value,
                        }))
                      }
                      placeholder="Topics, comma separated"
                    />
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() =>
                          startMutationTransition(() => {
                            void createOrUpdateWatchlist();
                          })
                        }
                        disabled={isMutationPending}
                      >
                        <ShieldCheck className="size-4" />
                        {editingWatchlistId ? "Update watchlist" : "Save watchlist"}
                      </Button>
                      {editingWatchlistId ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingWatchlistId(null);
                            setWatchlistForm(defaultWatchlistForm);
                          }}
                        >
                          Reset
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {watchlists.length ? (
                      watchlists.map((watchlist) => (
                        <div
                          key={watchlist.id}
                          className="rounded-2xl border border-border/70 bg-background/80 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-foreground">{watchlist.name}</p>
                                <Badge className={cn("border", statusClassName(watchlist.status))}>
                                  {watchlist.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Entities: {watchlist.watched_entities.join(", ") || "none"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Jurisdictions: {watchlist.watched_jurisdictions.join(", ") || "none"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Topics: {watchlist.watched_topics.join(", ") || "none"}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingWatchlistId(watchlist.id);
                                  setWatchlistForm({
                                    name: watchlist.name,
                                    watched_entities: listToCsv(watchlist.watched_entities),
                                    watched_jurisdictions: listToCsv(watchlist.watched_jurisdictions),
                                    watched_topics: listToCsv(watchlist.watched_topics),
                                  });
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  startMutationTransition(() => {
                                    void archiveWatchlist(watchlist.id);
                                  })
                                }
                                disabled={isMutationPending || watchlist.archived_at !== null}
                              >
                                <Archive className="size-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-5 text-sm text-muted-foreground">
                        Watchlists are workspace-scoped and drive alerts and digests.
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="digest" className="space-y-4">
                  <div className="grid gap-3">
                    <Input
                      value={digestForm.schedule}
                      onChange={(event) =>
                        setDigestForm((current) => ({ ...current, schedule: event.target.value }))
                      }
                      placeholder="Cron schedule, e.g. 0 8 * * *"
                    />
                    <Input
                      value={digestForm.email_recipients}
                      onChange={(event) =>
                        setDigestForm((current) => ({
                          ...current,
                          email_recipients: event.target.value,
                        }))
                      }
                      placeholder="Email recipients, comma separated"
                    />
                    <Input
                      value={digestForm.webhook_targets}
                      onChange={(event) =>
                        setDigestForm((current) => ({
                          ...current,
                          webhook_targets: event.target.value,
                        }))
                      }
                      placeholder="Webhook targets, comma separated"
                    />
                    <Select
                      value={digestForm.enabled}
                      onValueChange={(value) =>
                        setDigestForm((current) => ({
                          ...current,
                          enabled: value ?? current.enabled,
                        }))
                      }
                    >
                      <SelectTrigger className="bg-background/85">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enabled">Enabled</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() =>
                          startMutationTransition(() => {
                            void saveDigestSettings();
                          })
                        }
                        disabled={isMutationPending}
                      >
                        <Send className="size-4" />
                        Save digest settings
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          startMutationTransition(() => {
                            void runDigestNow();
                          })
                        }
                        disabled={isMutationPending}
                      >
                        Send now
                      </Button>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/75 px-4 py-4 text-sm leading-7 text-muted-foreground">
                      {digestSettings?.last_sent_at
                        ? `Last digest sent ${formatDateTime(digestSettings.last_sent_at)}.`
                        : "No digest has been sent yet."}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {digestRuns.length ? (
                      digestRuns.map((run) => (
                        <div
                          key={run.id}
                          className="rounded-2xl border border-border/70 bg-background/80 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className={cn("border", statusClassName(run.status))}>
                                  {run.status}
                                </Badge>
                                <Badge variant="outline" className="bg-white/70">
                                  {run.alert_count} alerts
                                </Badge>
                                <Badge variant="outline" className="bg-white/70">
                                  {run.delivery_count} deliveries
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Window {formatDateTime(run.window_start)} to {formatDateTime(run.window_end)}
                              </p>
                              <p className="line-clamp-4 text-sm leading-6 text-foreground">
                                {run.content_markdown}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {run.deliveries.map((delivery) => (
                                  <Badge
                                    key={delivery.id}
                                    className={cn("border", statusClassName(delivery.status))}
                                  >
                                    {delivery.channel}:{delivery.status}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              {formatDateTime(run.created_at)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-5 text-sm text-muted-foreground">
                        Digest history will appear here after the first delivery.
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/60 bg-white/82">
            <CardHeader>
              <CardTitle className="text-xl">Recent research and alerts</CardTitle>
              <CardDescription>Review stored synthesis runs and alert traffic.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Research history
                  </p>
                  <Badge variant="outline" className="bg-white/70">
                    {summary?.stats.research_queries ?? 0}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {summary?.recent_queries.length ? (
                    summary.recent_queries.map((query) => (
                      <button
                        key={query.id}
                        type="button"
                        onClick={() =>
                          startResearchTransition(() => {
                            void loadStoredResearch(query.id);
                          })
                        }
                        className="w-full rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-left transition-colors hover:bg-background"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="line-clamp-2 text-sm font-medium text-foreground">
                            {query.query}
                          </p>
                          <Badge variant="outline" className="bg-white/70">
                            {formatPercent(query.confidence)}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {formatDateTime(query.created_at)}
                        </p>
                      </button>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-5 text-sm text-muted-foreground">
                      Research runs will appear here once you execute a query.
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Alerts
                  </p>
                  <Badge variant="outline" className="bg-white/70">
                    {summary?.stats.alerts ?? 0}
                  </Badge>
                </div>
                <ScrollArea className="max-h-[18rem] pr-2">
                  <div className="space-y-3">
                    {summary?.recent_alerts.length ? (
                      summary.recent_alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="rounded-2xl border border-border/70 bg-background/80 p-4"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <Badge className={cn("border", severityClassName(alert.severity))}>
                              {alert.severity}
                            </Badge>
                            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              {formatDateTime(alert.created_at)}
                            </span>
                          </div>
                          <p className="text-sm leading-7 text-foreground">{alert.summary}</p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-5 text-sm text-muted-foreground">
                        Alerts will be generated after event extraction or diff matching hits a watchlist.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/60 bg-white/82">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">Change diff view</CardTitle>
                  <CardDescription>
                    Review before and after text for material document changes.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-white/70">
                  {diffs.length} tracked
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
              <div className="space-y-3">
                {diffs.length ? (
                  diffs.map((diff) => (
                    <button
                      key={diff.id}
                      type="button"
                      onClick={() => setSelectedDiffId(diff.id)}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-3 text-left transition-all",
                        selectedDiff?.id === diff.id
                          ? "border-primary/30 bg-primary/6 shadow-sm"
                          : "border-border/70 bg-background/75 hover:bg-background",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Badge className={cn("border", statusClassName(diff.change_kind))}>
                          {diff.change_kind}
                        </Badge>
                        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {formatDateTime(diff.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        Document #{diff.document_id}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Change ratio {formatPercent(diff.change_ratio)}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-5 text-sm text-muted-foreground">
                    Diff records will appear after a recrawl changes a document.
                  </p>
                )}
              </div>

              <div className="rounded-[1.75rem] border border-border/70 bg-background/80 p-5">
                {selectedDiff ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={cn("border", statusClassName(selectedDiff.change_kind))}>
                        {selectedDiff.change_kind}
                      </Badge>
                      <Badge className={cn("border", statusClassName(selectedDiff.material_change ? "active" : "pending"))}>
                        {selectedDiff.material_change ? "material" : "minor"}
                      </Badge>
                      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {formatDateTime(selectedDiff.created_at)}
                      </span>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-border/70 bg-white/80 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                          Before
                        </p>
                        <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                          {selectedDiff.before_excerpt}
                        </pre>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-white/80 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                          After
                        </p>
                        <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                          {selectedDiff.after_excerpt}
                        </pre>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-white/80 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        Unified diff
                      </p>
                      <pre className="mt-3 max-h-[20rem] overflow-auto whitespace-pre-wrap text-sm leading-6 text-foreground">
                        {selectedDiff.diff_text || "No unified diff available."}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border/70 bg-white/70 px-4 py-5 text-sm text-muted-foreground">
                    Select a diff record to inspect before and after text.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/60 bg-white/82">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">Discovery queue</CardTitle>
                  <CardDescription>
                    Approve or reject newly surfaced external domains.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-white/70">
                  {summary?.stats.pending_domains ?? 0} pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[26rem] pr-2">
                <div className="space-y-3">
                  {summary?.pending_domains.length ? (
                    summary.pending_domains.map((domain) => (
                      <div
                        key={domain.id}
                        className="rounded-2xl border border-border/70 bg-background/80 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-foreground">{domain.domain}</p>
                              <Badge className={cn("border", statusClassName(domain.status))}>
                                {domain.status}
                              </Badge>
                            </div>
                            <p className="text-sm leading-6 text-muted-foreground">
                              {domain.rationale}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span>Trust {formatPercent(domain.trust_score)}</span>
                              <a
                                href={domain.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                              >
                                Source context
                                <ExternalLink className="size-3" />
                              </a>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                startMutationTransition(() => {
                                  void setDomainStatus(domain, "approve");
                                })
                              }
                              disabled={isMutationPending}
                            >
                              <CheckCircle2 className="size-4 text-emerald-600" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                startMutationTransition(() => {
                                  void setDomainStatus(domain, "reject");
                                })
                              }
                              disabled={isMutationPending}
                            >
                              <XCircle className="size-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-5 text-sm text-muted-foreground">
                      Discovery approvals will appear here when crawl expansion or search finds new domains.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
