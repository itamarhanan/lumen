"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Eye, MousePointerClick, TrendingUp, Users } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { StatCard } from "./_components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


const now = new Date();
const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const { data: sites, isLoading: sitesLoading } = trpc.sites.list.useQuery();

  const projectId = sites?.[0]?.id;

  const overview = trpc.analytics.overview.useQuery(
    { projectId: projectId!, from: toISODate(sevenDaysAgo), to: toISODate(now) },
    { enabled: !!projectId },
  );

  const timeseries = trpc.analytics.timeseries.useQuery(
    {
      projectId: projectId!,
      from: toISODate(sevenDaysAgo),
      to: toISODate(now),
      granularity: "day",
    },
    { enabled: !!projectId },
  );

  if (sitesLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!sites || sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-lg font-medium">No sites yet</p>
        <p className="text-sm text-muted-foreground">
          Create your first site to start tracking analytics.
        </p>
      </div>
    );
  }

  const stats = overview.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Last 7 days &middot; {toISODate(sevenDaysAgo)} &ndash;{" "}
          {toISODate(now)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pageviews"
          value={stats?.pageviews ?? 0}
          icon={Eye}
        />
        <StatCard
          label="Visitors"
          value={stats?.visitors ?? 0}
          icon={Users}
        />
        <StatCard
          label="Events"
          value={stats?.totalEvents ?? 0}
          icon={MousePointerClick}
        />
        <StatCard
          label="Bounce Rate"
          value={stats ? `${stats.bounceRate}%` : "0%"}
          icon={TrendingUp}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pageviews</CardTitle>
        </CardHeader>
        <CardContent>
          {timeseries.data && timeseries.data.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeseries.data}>
                  <defs>
                    <linearGradient id="pageviewGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    className="text-xs text-muted-foreground"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    className="text-xs text-muted-foreground"
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="pageviews"
                    stroke="hsl(var(--primary))"
                    fill="url(#pageviewGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : timeseries.isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading...
            </p>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No data yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
