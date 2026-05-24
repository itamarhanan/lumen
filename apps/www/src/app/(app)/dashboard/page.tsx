"use client";

import { TimeseriesChart } from "@/components/dashboard/timeseries-chart";
import { TopSources } from "@/components/dashboard/top-sources";
import { TopPages } from "@/components/dashboard/top-pages";
import { LiveIndicator } from "@/components/dashboard/live-indicator";
import { StatCard } from "@/components/dashboard/stat-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { useDashboardStore } from "@/lib/store/dashboard";

import { subDays, format } from "date-fns";

export default function OverviewPage() {
  const storeProjectId = useDashboardStore((s) => s.selectedProjectId);
  const storeDateRange = useDashboardStore((s) => s.dateRange);

  const { data: sites } = trpc.sites.list.useQuery();
  const firstSite = sites?.[0];

  const projectId = storeProjectId ?? firstSite?.id ?? "";

  const from = useMemo(
    () => format(subDays(new Date(), storeDateRange.days), "yyyy-MM-dd"),
    [storeDateRange.days],
  );
  const to = useMemo(() => new Date().toISOString(), []);

  const enabled = !!projectId;

  const overview = trpc.analytics.overview.useQuery(
    { projectId, from, to },
    { enabled },
  );
  const granularity = storeDateRange.days <= 1 ? "hour" : "day";
  const timeseries = trpc.analytics.timeseries.useQuery(
    { projectId, from, to, granularity },
    { enabled },
  );
  const liveCount = trpc.analytics.liveCount.useQuery(
    { projectId },
    { enabled, refetchInterval: 30_000 },
  );
  const topPages = trpc.analytics.topPages.useQuery(
    { projectId, from, to },
    { enabled },
  );
  const topSources = trpc.analytics.topSources.useQuery(
    { projectId, from, to },
    { enabled },
  );

  const ov = overview.data;
  const ts = timeseries.data ?? [];
  const pv = ov?.pageviews ?? 0;
  const live = liveCount.data ?? 0;
  const pageviewsPos = (ov?.pageviewsDelta ?? 0) >= 0;

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between gap-4 px-4 pt-5 pb-3 sm:px-6 border-b border-border dark:border-[oklch(0.15_0_0)]">
        <div className="min-w-0">
          <h1 className="text-2xl font-light tracking-tight text-foreground leading-none">
            Overview
          </h1>
          <p className="mt-1 text-xs text-foreground/30 truncate">
            Analytics dashboard &middot; {storeDateRange.label}
          </p>
        </div>
        <LiveIndicator count={live} />
      </div>

      <div className="flex flex-col gap-6 px-4 py-6 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {overview.isLoading ? (
              <div className="h-[clamp(2rem,4vw,3.5rem)] w-48 animate-pulse rounded-xl bg-white/5" />
            ) : (
              <span
                className="font-light tracking-tight text-foreground leading-none"
                style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
              >
                {pv.toLocaleString()}
              </span>
            )}
            <p className="mt-1 text-sm text-foreground/40">
              Total pageviews ({storeDateRange.label.toLowerCase()})
              {ov?.pageviewsDelta != null && (
                <span
                  className={cn(
                    "ml-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    pageviewsPos
                      ? "bg-primary/10 text-primary"
                      : "bg-destructive/15 text-destructive",
                  )}
                >
                  {pageviewsPos ? (
                    <TrendingUp size={9} />
                  ) : (
                    <TrendingDown size={9} />
                  )}
                  {pageviewsPos ? "+" : ""}
                  {ov.pageviewsDelta}%
                </span>
              )}
            </p>
          </div>
          <QuickActions />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Unique visitors"
            value={ov?.visitors.toLocaleString() ?? "—"}
            delta={ov?.visitorsDelta}
            variant="gold"
            loading={overview.isLoading}
          />
          <StatCard
            label="Sessions"
            value={ov?.sessions.toLocaleString() ?? "—"}
            delta={ov?.sessionsDelta}
            variant="dim"
            loading={overview.isLoading}
          />
          <StatCard
            label="Bounce rate"
            value={ov ? `${ov.bounceRate}%` : "—"}
            delta={ov?.bounceRateDelta}
            variant="white"
            loading={overview.isLoading}
          />
        </div>

        <TimeseriesChart data={ts} loading={timeseries.isLoading} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TopPages pages={topPages.data ?? []} loading={topPages.isLoading} />
          <TopSources
            sources={topSources.data ?? []}
            loading={topSources.isLoading}
          />
        </div>
      </div>
    </div>
  );
}
