"use client";

import { useState, useCallback } from "react";
import {
  Sankey,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { aggregateSankey } from "@/lib/analytics/aggregate-sankey";
import type { SankeyData, SankeyLink } from "@/lib/analytics/aggregate-sankey";

const COLORS: string[] = [
  "oklch(0.65 0.18 165)",
  "oklch(0.62 0.17 215)",
  "oklch(0.63 0.19 30)",
  "oklch(0.64 0.17 130)",
  "oklch(0.62 0.15 280)",
  "oklch(0.63 0.18 55)",
  "oklch(0.64 0.16 195)",
  "oklch(0.61 0.18 345)",
  "oklch(0.65 0.16 100)",
  "oklch(0.62 0.18 250)",
  "oklch(0.63 0.17 10)",
  "oklch(0.64 0.15 150)",
  "oklch(0.61 0.19 300)",
  "oklch(0.65 0.17 75)",
  "oklch(0.62 0.16 230)",
  "oklch(0.63 0.18 355)",
  "oklch(0.64 0.17 115)",
  "oklch(0.61 0.16 265)",
  "oklch(0.65 0.19 45)",
  "oklch(0.62 0.15 180)",
  "oklch(0.63 0.17 320)",
  "oklch(0.64 0.18 90)",
  "oklch(0.61 0.16 210)",
  "oklch(0.65 0.17 20)",
  "oklch(0.62 0.19 140)",
  "oklch(0.63 0.15 290)",
  "oklch(0.64 0.18 65)",
  "oklch(0.61 0.17 240)",
  "oklch(0.65 0.16 0)",
  "oklch(0.62 0.18 170)",
];

interface MockTransition {
  source: string;
  target: string;
  value: number;
}

const MOCK_TRANSITIONS: MockTransition[] = [
  { source: "/", target: "/pricing", value: 850 },
  { source: "/", target: "/login", value: 720 },
  { source: "/", target: "/docs", value: 540 },
  { source: "/", target: "/blog", value: 480 },
  { source: "/", target: "/features", value: 390 },
  { source: "/", target: "/signup", value: 310 },
  { source: "/", target: "/enterprise", value: 210 },
  { source: "/login", target: "/dashboard", value: 580 },
  { source: "/login", target: "/signup", value: 140 },
  { source: "/pricing", target: "/signup", value: 520 },
  { source: "/pricing", target: "/enterprise", value: 170 },
  { source: "/pricing", target: "/login", value: 120 },
  { source: "/signup", target: "/dashboard", value: 400 },
  { source: "/signup", target: "/integrations", value: 60 },
  { source: "/dashboard", target: "/settings", value: 280 },
  { source: "/dashboard", target: "/integrations", value: 220 },
  { source: "/dashboard", target: "/docs", value: 160 },
  { source: "/blog", target: "/docs", value: 290 },
  { source: "/blog", target: "/pricing", value: 140 },
  { source: "/docs", target: "/guides", value: 230 },
  { source: "/docs", target: "/tutorials", value: 180 },
  { source: "/docs", target: "/api-docs", value: 130 },
  { source: "/features", target: "/pricing", value: 260 },
  { source: "/features", target: "/signup", value: 90 },
  { source: "/enterprise", target: "/contact", value: 120 },
  { source: "/enterprise", target: "/pricing", value: 80 },
  { source: "/settings", target: "/integrations", value: 110 },
  { source: "/settings", target: "/dashboard", value: 80 },
  { source: "/guides", target: "/tutorials", value: 140 },
  { source: "/integrations", target: "/docs", value: 90 },
  { source: "/api-docs", target: "/dashboard", value: 70 },
  { source: "/tutorials", target: "/dashboard", value: 50 },
  { source: "/security", target: "/enterprise", value: 60 },
  { source: "/changelog", target: "/blog", value: 40 },
  { source: "/about", target: "/enterprise", value: 35 },
  { source: "/contact", target: "/pricing", value: 30 },
  { source: "/community", target: "/blog", value: 25 },
  { source: "/status", target: "/login", value: 20 },
];

export function getMockSankeyData(): SankeyData {
  return aggregateSankey(MOCK_TRANSITIONS);
}

function buildConnectivityMap(
  links: SankeyLink[],
  nodeCount: number,
): Map<number, Set<number>> {
  const map = new Map<number, Set<number>>();
  for (let i = 0; i < nodeCount; i++) map.set(i, new Set());
  for (const link of links) {
    map.get(link.source)!.add(link.target);
    map.get(link.target)!.add(link.source);
  }
  return map;
}

interface ComProps {
  data?: SankeyData;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function FlowSankey({ data, loading, error, onRetry }: ComProps) {
  const [hoveredNodeIdx, setHoveredNodeIdx] = useState<number | null>(null);
  const [, setHoveredLinkIdx] = useState<number | null>(null);

  const handleNodeEnter = useCallback((idx: number) => {
    setHoveredNodeIdx(idx);
    setHoveredLinkIdx(null);
  }, []);

  const handleLinkEnter = useCallback(
    (linkIdx: number, sourceIdx: number) => {
      setHoveredLinkIdx(linkIdx);
      setHoveredNodeIdx(sourceIdx);
    },
    [],
  );

  const handleLeave = useCallback(() => {
    setHoveredNodeIdx(null);
    setHoveredLinkIdx(null);
  }, []);

  if (loading) {
    return <Skeleton />;
  }

  if (error) {
    return <ErrorState onRetry={onRetry} />;
  }

  const chartData = data ?? getMockSankeyData();
  const hasData = chartData.nodes.length > 1 && chartData.links.length > 0;

  if (!hasData) {
    return <EmptyState />;
  }

  const connectivity = buildConnectivityMap(
    chartData.links,
    chartData.nodes.length,
  );
  const connectedSet =
    hoveredNodeIdx !== null
      ? connectivity.get(hoveredNodeIdx) ?? new Set<number>()
      : null;

  const isDimmedNode = (idx: number) => {
    if (connectedSet === null) return false;
    return idx !== hoveredNodeIdx && !connectedSet.has(idx);
  };

  const isDimmedLink = (source: number, target: number) => {
    if (connectedSet === null) return false;
    return (
      source !== hoveredNodeIdx &&
      target !== hoveredNodeIdx &&
      !connectedSet.has(source) &&
      !connectedSet.has(target)
    );
  };

  return (
    <div className="rounded-[1.5rem] bg-muted dark:bg-white/4 p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground dark:text-foreground/35">
            Page flow
          </p>
          <p className="mt-0.5 text-xs text-foreground dark:text-foreground/20">
            page-to-page navigation &middot;{" "}
            {chartData.links.reduce((s, l) => s + l.value, 0).toLocaleString()}{" "}
            transitions
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <ResponsiveContainer width="100%" height={420}>
            <Sankey
              data={chartData}
              nodeWidth={14}
              nodePadding={12}
              margin={{ top: 4, right: 120, bottom: 4, left: 8 }}
              iterations={64}
              node={({ x, y, width, height, index, payload }: NodeProps) => {
                const color = COLORS[index % COLORS.length];
                const dimmed = isDimmedNode(index);
                const opacity = dimmed ? 0.1 : 0.85;

                return (
                  <g
                    onMouseEnter={() => handleNodeEnter(index)}
                    onMouseLeave={handleLeave}
                    style={{ cursor: "pointer" }}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={color}
                      fillOpacity={opacity}
                      rx={3}
                      ry={3}
                    />
                    <text
                      x={(x ?? 0) + (width ?? 0) + 8}
                      y={(y ?? 0) + (height ?? 0) / 2}
                      textAnchor="start"
                      dominantBaseline="central"
                      fill="var(--foreground)"
                      fillOpacity={dimmed ? 0.08 : 0.75}
                      fontSize={11}
                      fontFamily="var(--font-mono)"
                    >
                      {payload?.name ?? ""}
                    </text>
                  </g>
                );
              }}
              link={({
                sourceX,
                sourceY,
                sourceControlX,
                targetX,
                targetY,
                targetControlX,
                linkWidth,
                index,
                payload,
              }: LinkProps) => {
                const srcIdx =
                  chartData.nodes.findIndex(
                    (n) => n.name === payload?.source?.name,
                  );
                const tgtIdx =
                  chartData.nodes.findIndex(
                    (n) => n.name === payload?.target?.name,
                  );
                const color = COLORS[srcIdx >= 0 ? srcIdx % COLORS.length : 0];
                const dimmed = isDimmedLink(srcIdx, tgtIdx);
                const opacity = dimmed ? 0.04 : 0.35;

                return (
                  <path
                    onMouseEnter={() => handleLinkEnter(index, srcIdx)}
                    onMouseLeave={handleLeave}
                    d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={linkWidth}
                    strokeOpacity={opacity}
                    style={{ cursor: "pointer" }}
                  />
                );
              }}
            >
              <RechartsTooltip content={<SankeyTip />} />
            </Sankey>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

interface NodeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index: number;
  payload?: { name?: string; value?: number };
}

interface LinkProps {
  sourceX?: number;
  sourceY?: number;
  sourceControlX?: number;
  targetX?: number;
  targetY?: number;
  targetControlX?: number;
  linkWidth?: number;
  index: number;
  payload?: {
    source?: { name?: string };
    target?: { name?: string };
    value?: number;
  };
}

interface TipPayload {
  name?: string;
  value?: number;
  payload?: {
    source?: { name?: string };
    target?: { name?: string };
    value?: number;
  };
}

function SankeyTip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;

  if (item.payload?.source?.name != null) {
    return (
      <div className="rounded-lg border border-border dark:border-white/[0.07] bg-popover dark:bg-[oklch(0.13_0_0)] px-3.5 py-3 text-xs shadow-xl">
        <p className="font-medium text-foreground">
          {item.payload.source.name}
          <span className="mx-1.5 text-foreground/30">&rarr;</span>
          {item.payload.target?.name}
        </p>
        <p className="mt-1 text-foreground/50">
          <span className="font-semibold text-foreground">
            {item.value?.toLocaleString()}
          </span>{" "}
          transitions
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border dark:border-white/[0.07] bg-popover dark:bg-[oklch(0.13_0_0)] px-3.5 py-3 text-xs shadow-xl">
      <p className="font-medium text-foreground">{item.name}</p>
      <p className="mt-1 text-foreground/50">
        <span className="font-semibold text-foreground">
          {item.value?.toLocaleString()}
        </span>{" "}
        sessions
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-[1.5rem] bg-muted dark:bg-white/4 p-4 sm:p-5">
      <div className="h-4 w-28 animate-pulse rounded-lg bg-black/5 dark:bg-white/5" />
      <div className="h-4 w-48 animate-pulse rounded-lg bg-black/3 dark:bg-white/3" />
      <div className="mt-2 h-80 w-full animate-pulse rounded-xl bg-black/3 dark:bg-white/3" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col gap-3 rounded-[1.5rem] bg-muted dark:bg-white/4 p-6 sm:p-8">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="size-10 rounded-xl border border-dashed border-foreground/15 flex items-center justify-center mb-4">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-foreground/25"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground/60">
          No page views recorded for this period
        </p>
        <p className="mt-1 text-xs text-foreground/30">
          Transitions between pages will appear here once visitors start browsing
        </p>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-[1.5rem] bg-muted dark:bg-white/4 p-6 sm:p-8">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="size-10 rounded-xl border border-dashed border-red-500/20 flex items-center justify-center mb-4">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-red-500/40"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground/60">
          Failed to load flow data
        </p>
        <p className="mt-1 mb-4 text-xs text-foreground/30">
          Something went wrong while fetching page transitions
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary text-xs font-medium px-3.5 py-2 transition-colors"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 1 1-9-9" />
              <path d="M21 3v5h-5" />
            </svg>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
