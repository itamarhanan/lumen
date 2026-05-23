"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";

interface Point {
  date: string;
  pageviews: number;
  visitors: number;
}

interface TipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string | number;
    stroke?: string;
    value?: number;
  }>;
  label?: string;
}

function Tip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="rounded-lg border border-border dark:border-white/[0.07] bg-popover dark:bg-[oklch(0.13_0_0)] px-3.5 py-3 text-xs shadow-xl">
      <p className="mb-2 text-foreground dark:text-foreground/35">
        {(() => {
          try {
            return format(parseISO(label), "MMM d, yyyy");
          } catch {
            return label;
          }
        })()}
      </p>
      {payload.map((p) => (
        <div
          key={p.dataKey}
          className="flex items-center gap-3 mb-0.5 last:mb-0"
        >
          <span
            className="size-1.5 rounded-full shrink-0"
            style={{ background: p.stroke }}
          />
          <span className="text-foreground dark:text-foreground/45 capitalize">
            {p.dataKey}
          </span>
          <span className="ml-auto pl-4 font-medium text-foreground">
            {p.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TimeseriesChart({
  data,
  loading,
}: {
  data: Point[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 rounded-[1.5rem] bg-muted dark:bg-white/4 p-4 sm:p-5">
        <div className="h-4 w-28 animate-pulse rounded-lg bg-black/5 dark:bg-white/5" />
        <div className="h-44 w-full animate-pulse rounded-xl bg-black/3 dark:bg-white/3" />
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] bg-muted dark:bg-white/4 p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground dark:text-foreground/35">
            Traffic overview
          </p>
          <p className="mt-0.5 text-xs text-foreground dark:text-foreground/20">
            pageviews vs unique visitors
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-foreground/30">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            Pageviews
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-1.5 rounded-full bg-foreground/20" />
            Visitors
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 0, left: -28, bottom: 0 }}
        >
          <defs>
            <linearGradient id="gPV" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-primary)"
                stopOpacity={0.3}
              />
              <stop
                offset="100%"
                stopColor="var(--color-primary)"
                stopOpacity={0}
              />
            </linearGradient>
            <linearGradient id="gVis" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-tick)" stopOpacity={1} />
              <stop
                offset="100%"
                stopColor="var(--chart-tick)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--chart-grid)"
            horizontal={true}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "var(--chart-tick)" }}
            tickFormatter={(d) => {
              try {
                return format(parseISO(d), "MMM d");
              } catch {
                return d;
              }
            }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "var(--chart-tick)" }}
            tickFormatter={(n) =>
              n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n)
            }
          />
          <Tooltip
            cursor={{ stroke: "var(--chart-grid)", strokeWidth: 1 }}
            content={<Tip />}
          />
          <Area
            type="monotone"
            dataKey="pageviews"
            stroke="var(--color-primary)"
            strokeWidth={1.5}
            fill="url(#gPV)"
            dot={false}
            activeDot={{ r: 3, fill: "var(--color-primary)", strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="visitors"
            stroke="var(--chart-tick)"
            strokeWidth={1.5}
            fill="url(#gVis)"
            dot={false}
            activeDot={{ r: 3, fill: "var(--chart-tick)", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
