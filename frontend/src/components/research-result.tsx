"use client";

import {
  AlertTriangle,
  CalendarClock,
  ExternalLink,
  Quote,
  Scale,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatDateTime, formatPercent } from "@/lib/format";
import { ResearchQuery } from "@/lib/types";

type ResearchResultProps = {
  result: ResearchQuery | null;
  loading: boolean;
  error: string | null;
};

function EmptyResearchState() {
  return (
    <Card className="glass-panel min-h-[28rem] border-white/60 bg-white/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="size-5 text-primary" />
          Detailed Research Output
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col justify-between gap-8">
        <div className="space-y-3">
          <p className="text-base leading-7 text-foreground">
            Submit a research question to run live Exa search, structured document extraction,
            and a citation-backed answer synthesis through OpenRouter.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              "Live search breadth",
              "Structured extraction",
              "Strict citation payload",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-dashed border-border/80 bg-background/70 p-4 text-sm text-muted-foreground"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-primary/10 bg-primary/5 px-5 py-4 text-sm leading-7 text-muted-foreground">
          The result surface will show the concise answer, expanded synthesis, contradictions,
          evidence citations, and a timeline built from the retrieved sources.
        </div>
      </CardContent>
    </Card>
  );
}

export function ResearchResult({ result, loading, error }: ResearchResultProps) {
  if (!result && !loading && !error) {
    return <EmptyResearchState />;
  }

  return (
    <Card className="glass-panel min-h-[28rem] border-white/60 bg-white/80">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="text-xl leading-tight">Detailed Research Output</CardTitle>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {result?.query ?? "Preparing a structured synthesis from the latest live evidence."}
            </p>
          </div>
          {result ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/10 text-primary">
                {formatPercent(result.confidence)} confidence
              </Badge>
              <Badge variant="outline" className="bg-white/70">
                {formatDateTime(result.created_at)}
              </Badge>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="space-y-4 rounded-3xl border border-dashed border-border/70 bg-background/60 px-5 py-8 text-sm text-muted-foreground">
            <p className="flex items-center gap-2 text-base text-foreground">
              <Sparkles className="size-4 animate-pulse text-primary" />
              Running search, extraction, and synthesis.
            </p>
            <p>
              This can take a moment because the pipeline is calling Exa and the configured
              OpenRouter model with structured output.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {result ? (
          <>
            <div className="hero-sheen surface-glow rounded-[2rem] border border-white/70 px-6 py-6">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
                <Scale className="size-4" />
                Concise answer
              </div>
              <p className="text-xl leading-9 font-medium text-foreground md:text-2xl">
                {result.concise_answer}
              </p>
            </div>

            <Tabs defaultValue="brief" className="gap-4">
              <TabsList variant="line" className="gap-1 bg-transparent p-0">
                <TabsTrigger value="brief">Brief</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="citations">Citations</TabsTrigger>
                <TabsTrigger value="contradictions">Conflicts</TabsTrigger>
              </TabsList>

              <TabsContent
                value="brief"
                className="rounded-3xl border border-white/60 bg-background/80 p-5"
              >
                <p className="text-sm leading-7 text-foreground">{result.expanded_answer}</p>
              </TabsContent>

              <TabsContent
                value="timeline"
                className="rounded-3xl border border-white/60 bg-background/80 p-5"
              >
                {result.timeline.length ? (
                  <div className="space-y-4">
                    {result.timeline.map((item, index) => (
                      <div key={`${item.source_url}-${index}`} className="data-dot pl-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="bg-white/70">
                            <CalendarClock className="mr-1 size-3" />
                            {formatDate(item.date)}
                          </Badge>
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            Source
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                        <p className="mt-2 text-sm leading-7 text-foreground">{item.summary}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No timeline items were returned.</p>
                )}
              </TabsContent>

              <TabsContent
                value="citations"
                className="rounded-3xl border border-white/60 bg-background/80 p-0"
              >
                <ScrollArea className="max-h-[23rem] px-5 py-4">
                  <div className="space-y-4">
                    {result.citations.map((citation, index) => (
                      <div
                        key={`${citation.source_url}-${index}`}
                        className="space-y-3 rounded-2xl border border-border/70 bg-white/80 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-secondary/70 text-secondary-foreground"
                          >
                            <Quote className="mr-1 size-3" />
                            Evidence
                          </Badge>
                          <a
                            href={citation.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                          >
                            {citation.source_title || citation.source_url}
                            <ExternalLink className="size-3.5" />
                          </a>
                        </div>
                        <p className="rounded-2xl bg-background px-4 py-3 font-mono text-xs leading-6 text-foreground">
                          {citation.quote}
                        </p>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {citation.reason}
                        </p>
                        <Separator />
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>Published: {formatDate(citation.published_date)}</span>
                          <span>Crawled: {formatDateTime(citation.crawl_date)}</span>
                        </div>
                      </div>
                    ))}
                    {!result.citations.length ? (
                      <p className="text-sm text-muted-foreground">No citations were returned.</p>
                    ) : null}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent
                value="contradictions"
                className="rounded-3xl border border-white/60 bg-background/80 p-5"
              >
                {result.contradictions.length ? (
                  <div className="space-y-3">
                    {result.contradictions.map((contradiction, index) => (
                      <div
                        key={`${contradiction}-${index}`}
                        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900"
                      >
                        <div className="mb-1 flex items-center gap-2 font-medium">
                          <AlertTriangle className="size-4" />
                          Potential contradiction
                        </div>
                        {contradiction}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                    No direct contradictions were identified in the current evidence set.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
