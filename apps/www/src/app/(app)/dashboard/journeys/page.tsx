"use client";

import { useMemo, useState } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { FlowSankey } from "@/components/dashboard/journeys/flow-sankey";
import { SessionsList } from "@/components/dashboard/journeys/sessions-list";
import { aggregateSankey } from "@/lib/analytics/aggregate-sankey";
import { trpc } from "@/lib/trpc/client";
import { useDashboardStore } from "@/lib/store/dashboard";
import { subDays, format } from "date-fns";

export default function JourneysPage() {
  const storeProjectId = useDashboardStore((s) => s.selectedProjectId);
  const storeDateRange = useDashboardStore((s) => s.dateRange);
  const [tab, setTab] = useState("flow");

  const { data: sites } = trpc.sites.list.useQuery();
  const firstSite = sites?.[0];
  const projectId = storeProjectId ?? firstSite?.id ?? "";

  const from = useMemo(
    () => format(subDays(new Date(), storeDateRange.days), "yyyy-MM-dd"),
    [storeDateRange.days],
  );
  const to = useMemo(() => new Date().toISOString(), []);

  const enabled = !!projectId;
  const { data, isLoading, error, refetch } = trpc.analytics.journeys.useQuery(
    { projectId, from, to },
    { enabled },
  );

  const sankeyData = useMemo(
    () => (data ? aggregateSankey(data.transitions) : undefined),
    [data],
  );

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between gap-4 px-4 pt-5 pb-3 sm:px-6 border-b border-border dark:border-[oklch(0.15_0_0)]">
        <div className="min-w-0">
          <h1 className="text-2xl font-light tracking-tight text-foreground leading-none">
            Journeys
          </h1>
          <p className="mt-1 text-xs text-foreground/30 truncate">
            User navigation paths &middot; {storeDateRange.label}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-4 py-6 sm:px-6">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-80 w-full" />
          </div>
        ) : error ? (
          <Empty>
            <EmptyMedia variant="icon">
              <AlertCircle className="text-destructive" />
            </EmptyMedia>
            <EmptyTitle>Failed to load journey data</EmptyTitle>
            <EmptyDescription>
              Something went wrong while fetching navigation data
            </EmptyDescription>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw />
              Try again
            </Button>
          </Empty>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="flow">Flow</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
            </TabsList>
            <TabsContent value="flow">
              <FlowSankey data={sankeyData} />
            </TabsContent>
            <TabsContent value="sessions">
              <SessionsList sessions={data?.sessions} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
