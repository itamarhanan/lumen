"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";

interface DistributionPoint {
  date: string;
  eventName: string;
  count: number;
}

interface TipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    fill?: string;
    stroke?: string;
    value?: number;
  }>;
  label?: string;
}

function groupPivoted(
  pivoted: Record<string, string | number>[],
  maxBars: number = 8,
): Record<string, string | number>[] {
  if (pivoted.length <= maxBars) return pivoted;
  const groupSize = Math.ceil(pivoted.length / maxBars);
  const grouped: Record<string, string | number>[] = [];
  const keys = Object.keys(pivoted[0]!).filter((k) => k !== "date");
  for (let i = 0; i < pivoted.length; i += groupSize) {
    const chunk = pivoted.slice(i, i + groupSize);
    const merged: Record<string, string | number> = {
      date: chunk[0]!.date as string,
    };
    for (const key of keys) {
      let sum = 0;
      for (const item of chunk) {
        sum += (item[key] as number) || 0;
      }
      merged[key] = sum;
    }
    grouped.push(merged);
  }
  return grouped;
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
            className="size-1.5 rounded-full"
            style={{ background: p.fill || p.stroke }}
          />
          <span className="text-foreground dark:text-foreground/45">
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

const COLORS = [
  "var(--color-primary)",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ef4444",
  "var(--chart-grid)",
  "#06b6d4",
  "#ec4899",
  "#787878",
];

interface EventsChartProps {
  data: DistributionPoint[];
  loading?: boolean;
  onSegmentClick?: (eventName: string | null) => void;
}

export function EventsChart({
  data,
  loading,
  onSegmentClick,
}: EventsChartProps) {
  const { pivoted, eventNames } = useMemo(() => {
    if (!data.length) return { pivoted: [], eventNames: [] };

    const byName = new Map<string, number>();
    for (const d of data) {
      byName.set(d.eventName, (byName.get(d.eventName) ?? 0) + d.count);
    }

    const sorted = [...byName.entries()]
      .sort((a, b) => b[1] - a[1])
      .filter(([, count]) => count > 1)
      .slice(0, 5)
      .map(([name]) => name);

    const pivotMap = new Map<string, Record<string, number>>();
    for (const d of data) {
      if (!pivotMap.has(d.date)) {
        pivotMap.set(d.date, {});
      }
      const row = pivotMap.get(d.date)!;
      const key = sorted.includes(d.eventName) ? d.eventName : "Other";
      row[key] = (row[key] ?? 0) + d.count;
    }

    const raw = [...pivotMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    const pivoted = groupPivoted(raw);

    return { pivoted, eventNames: [...sorted, "Other"] };
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3 rounded-[1.5rem] bg-muted dark:bg-white/4 p-4 sm:p-5">
        <div className="h-3 sm:h-4 w-24 sm:w-28 animate-pulse rounded-lg bg-black/5 dark:bg-white/5" />
        <div className="h-36 sm:h-44 w-full animate-pulse rounded-xl bg-black/3 dark:bg-white/3" />
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] bg-muted dark:bg-white/4 p-4 sm:p-5">
      <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <p className="text-xs sm:text-xs font-semibold uppercase tracking-[0.15em] text-foreground dark:text-foreground/35">
            Events over time
          </p>
          <p className="mt-0.5 text-xs sm:text-xs text-foreground dark:text-foreground/20">
            event type distribution
          </p>
        </div>
        <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[9px] sm:text-xs text-foreground/30">
          {eventNames.map((name, i) => (
            <span
              key={name}
              className="flex items-center gap-1 cursor-pointer hover:text-foreground/60 transition-colors"
              onClick={() => onSegmentClick?.(name === "Other" ? null : name)}
            >
              <span
                className="inline-block size-1 rounded-full"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              {name}
            </span>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={140}>
        <BarChart
          data={pivoted}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        >
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
          {eventNames.map((name, i) => (
            <Bar
              key={name}
              dataKey={name}
              stackId="a"
              fill={COLORS[i % COLORS.length]}
              stroke="none"
              cursor={onSegmentClick ? "pointer" : "default"}
              onClick={() => onSegmentClick?.(name === "Other" ? null : name)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
