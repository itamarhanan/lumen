"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const PALETTE = [
  "#7C6AF7",
  "#4EADFF",
  "#F97B6B",
  "#4FD1A0",
  "#F6AD55",
  "#A78BFA",
  "#F472B6",
  "#34D399",
  "#FB923C",
  "#60A5FA",
  "#E879F9",
  "#2DD4BF",
];

const MAX_SERIES = 10;
const OTHER_COLOR = "#4B5563";

function assignColors(names: string[]): Map<string, string> {
  const map = new Map<string, string>();
  names.forEach((name, i) => {
    map.set(name, PALETTE[i % PALETTE.length]!);
  });
  return map;
}

export function getEventColor(
  name: string,
  colorMap: Map<string, string>,
): string {
  return colorMap.get(name) ?? OTHER_COLOR;
}

export interface TimeseriesItem {
  date: string;
  eventName: string;
  volume: number;
}

interface EventsActivityChartProps {
  data: TimeseriesItem[];
  loading?: boolean;
  onBarClick?: (eventName: string, date: string) => void;
  onGranularityChange?: (g: "hour" | "day" | "week") => void;
}

interface TipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function Tip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null;
  const visible = payload.filter((p) => p.value > 0);
  if (!visible.length) return null;
  return (
    <div className="rounded-lg border border-white/[0.07] bg-popover px-3.5 py-3 text-xs shadow-xl z-50">
      <p className="font-medium text-foreground mb-1.5">{label}</p>
      {visible.map((entry) => (
        <span
          key={entry.name}
          className="flex items-center gap-1.5 mb-1 last:mb-0"
        >
          <span
            className="size-1.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-foreground/50">
            {entry.name === "__other__" ? "Other" : entry.name}
          </span>
          <span className="font-medium text-foreground tabular-nums ml-auto pl-4">
            {entry.value.toLocaleString()}
          </span>
        </span>
      ))}
    </div>
  );
}

export function EventsActivityChart({
  data,
  loading,
  onBarClick,
  onGranularityChange,
}: EventsActivityChartProps) {
  const [granularity, setGranularity] = useState<"hour" | "day" | "week">(
    "day",
  );
  const [solo, setSolo] = useState<string | null>(null);

  const handleLegendClick = (name: string) => {
    setSolo((prev) => (prev === name ? null : name));
  };

  const setGran = (g: "hour" | "day" | "week") => {
    setGranularity(g);
    onGranularityChange?.(g);
  };

  const { topNames, grouped, overflowCount, colorMap } = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of data) {
      totals.set(
        item.eventName,
        (totals.get(item.eventName) ?? 0) + item.volume,
      );
    }
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const topNames = sorted.slice(0, MAX_SERIES).map(([name]) => name);
    const overflowCount = Math.max(0, sorted.length - MAX_SERIES);
    const topSet = new Set(topNames);
    const colorMap = assignColors([...topNames, "__other__"]);

    const map = new Map<string, Record<string, number>>();
    const dateOrder: string[] = [];

    for (const item of data) {
      if (!map.has(item.date)) {
        map.set(item.date, {});
        dateOrder.push(item.date);
      }
      const bucket = map.get(item.date)!;
      const key = topSet.has(item.eventName) ? item.eventName : "__other__";
      bucket[key] = (bucket[key] ?? 0) + item.volume;
    }

    const grouped = dateOrder
      .slice(0, 31)
      .map((date) => ({ date, ...map.get(date)! }));

    return { topNames, grouped, overflowCount, colorMap };
  }, [data]);

  const allSeries = [...topNames, ...(overflowCount > 0 ? ["__other__"] : [])];

  const chartData = useMemo(() => {
    if (!solo) return grouped;
    return grouped.map(({ date, ...rest }) => {
      return {
        date,
        ...Object.fromEntries(
          Object.keys(rest as Record<string, number>).map((k: string) => [
            k,
            k === solo ? (rest as Record<string, number>)[k] : 0,
          ]),
        ),
      };
    });
  }, [grouped, solo]);

  const lastVisible = allSeries[allSeries.length - 1];

  const handleClick = (d: unknown) => {
    const cd = d as {
      activeLabel?: string;
      activePayload?: Array<{ name: string }>;
    };
    if (!cd?.activeLabel || !onBarClick) return;
    const name = cd.activePayload?.[0]?.name ?? topNames[0] ?? "";
    onBarClick(name, cd.activeLabel);
  };

  if (loading) {
    return (
      <div className="rounded-[1.5rem] bg-muted dark:bg-white/4 p-4 sm:p-5">
        <div className="h-4 w-28 animate-pulse rounded-lg bg-white/5" />
        <div className="mt-4 h-52 w-full animate-pulse rounded-xl bg-white/3" />
      </div>
    );
  }

  if (!data.length) return null;

  return (
    <div className="rounded-[1.5rem] bg-muted dark:bg-white/4 p-4 sm:p-5">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/35">
            Event activity
          </p>
          <p className="mt-0.5 text-xs text-foreground/20">by {granularity}</p>
        </div>
        <ToggleGroup
          type="single"
          value={granularity}
          onValueChange={(v) => v && setGran(v as "hour" | "day" | "week")}
          className="gap-0.5 rounded-lg border border-white/6 p-0.5"
        >
          {(["hour", "day", "week"] as const).map((g) => (
            <ToggleGroupItem
              key={g}
              value={g}
              className="px-2 py-1 text-[10px] font-medium rounded-md h-auto data-[state=on]:bg-white/8 data-[state=on]:text-foreground text-foreground/30"
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Legend */}
      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1.5 max-h-10 overflow-hidden">
        {allSeries.map((name) => {
          const isFaded = solo !== null && solo !== name;
          return (
            <button
              key={name}
              onClick={() => handleLegendClick(name)}
              title={
                name === "__other__"
                  ? `Other (${overflowCount} event types)`
                  : name
              }
              className={cn(
                "flex items-center gap-1.5 text-[10px] transition-opacity select-none",
                isFaded ? "opacity-20" : "opacity-70 hover:opacity-100",
              )}
            >
              <span
                className="size-1.5 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    name === "__other__"
                      ? OTHER_COLOR
                      : (colorMap.get(name) ?? OTHER_COLOR),
                }}
              />
              <span className="max-w-20 truncate">
                {name === "__other__" ? `Other (${overflowCount})` : name}
              </span>
            </button>
          );
        })}
      </div>

      {solo && (
        <p className="mb-2 text-[10px] text-foreground/30">
          Showing <span className="text-foreground/60 font-medium">{solo}</span>{" "}
          only — click again to restore all
        </p>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          onClick={handleClick}
          style={{ cursor: onBarClick ? "pointer" : "default" }}
        >
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 9, fill: "var(--chart-tick)" }}
            tickFormatter={(d: string) => {
              const parts = d.split("-");
              return parts.length === 3 ? `${parts[1]}/${parts[2]}` : d;
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 9, fill: "var(--chart-tick)" }}
            width={28}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={<Tip />}
          />
          {allSeries.map((name) => (
            <Bar
              key={name}
              dataKey={name}
              stackId="a"
              fill={
                name === "__other__"
                  ? OTHER_COLOR
                  : (colorMap.get(name) ?? OTHER_COLOR)
              }
              radius={name === lastVisible ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              maxBarSize={24}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
