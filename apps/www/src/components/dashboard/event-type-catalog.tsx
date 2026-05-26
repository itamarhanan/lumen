"use client";

import { useState } from "react";
import { AlertTriangle, Zap, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { EventDefinitionDialog } from "./event-definition-dialog";

export interface EventTypeRow {
  name: string;
  volume: number;
  users: number;
  trend: number | null;
  lastSeen: string;
  properties: Array<{
    key: string;
    type: string;
    description?: string;
    defined?: boolean;
    noDataYet?: boolean;
  }>;
  definition?: {
    description: string | null;
    color: string | null;
  } | null;
}

interface EventTypeCatalogProps {
  data: EventTypeRow[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  selectedEventName: string | null;
  onSelect: (name: string | null) => void;
  projectId?: string;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function TrendBadge({ trend }: { trend: number | null }) {
  if (trend === null) {
    return (
      <span className="tabular-nums text-foreground/20">—</span>
    );
  }

  const isPositive = trend >= 0;
  return (
    <span
      className={cn(
        "tabular-nums text-[12px]",
        isPositive ? "text-emerald-400" : "text-red-400",
      )}
    >
      {isPositive ? "+" : ""}
      {trend.toFixed(1)}%
    </span>
  );
}

function SkeletonRows() {
  return (
    <div className="rounded-[1.5rem] bg-muted dark:bg-white/4 overflow-hidden p-1 flex flex-col gap-px">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="rounded-[1.5rem] bg-muted dark:bg-white/4 flex flex-col items-center justify-center gap-3 py-14">
      <div className="size-8 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle size={14} className="text-destructive/70" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground/70">
          Failed to load event types
        </p>
        <p className="text-xs text-foreground/35 mt-0.5">
          There was a problem fetching your event types.
        </p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-1"
        >
          Try again
        </Button>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[1.5rem] bg-muted dark:bg-white/4 flex flex-col items-center justify-center gap-4 py-14 px-6 text-center">
      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
        <Zap size={14} className="text-primary/60" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground/70">
          No custom events tracked yet
        </p>
        <p className="text-xs text-foreground/35 mt-1 max-w-xs">
          Use the snippet below to start tracking custom events.
        </p>
      </div>
      <pre className="rounded-lg bg-black/5 dark:bg-white/5 px-4 py-3 text-xs font-mono text-foreground/50 text-left">
        {"window.lumen('event', 'name', { key: 'value' })"}
      </pre>
    </div>
  );
}

export function EventTypeCatalog({
  data,
  loading,
  error,
  onRetry,
  selectedEventName,
  onSelect,
  projectId,
}: EventTypeCatalogProps) {
  const [editTarget, setEditTarget] = useState<EventTypeRow | null>(null);

  if (loading) return <SkeletonRows />;
  if (error) return <ErrorState onRetry={onRetry} />;
  if (data.length === 0) return <EmptyState />;

  return (
    <>
      <div className="rounded-[1.5rem] bg-muted dark:bg-white/4 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-white/5">
              <th className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/30 h-10 px-4 text-left">
                Event
              </th>
              <th className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/30 h-10 px-2 text-right">
                Volume
              </th>
              <th className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/30 h-10 px-2 text-right hidden sm:table-cell">
                Users
              </th>
              <th className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/30 h-10 px-2 text-right hidden md:table-cell">
                Trend
              </th>
              <th className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/30 h-10 px-2 text-left hidden lg:table-cell">
                Properties
              </th>
              <th className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/30 h-10 px-4 text-right">
                Last Seen
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const isActive = selectedEventName === row.name;
              const visibleProps = row.properties.slice(0, 3);
              const overflowCount = row.properties.length - 3;

              return (
                <tr
                  key={row.name}
                  onClick={() => onSelect(isActive ? null : row.name)}
                  className={cn(
                    "border-t border-white/4 transition-colors cursor-pointer group",
                    isActive && "bg-white/2",
                  )}
                >
                  <td className="px-4 py-3 max-w-40">
                    <div className="flex items-center gap-2">
                      {row.definition?.color && (
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: row.definition.color }}
                        />
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={cn(
                                "font-mono text-[12px] truncate transition-colors",
                                isActive
                                  ? "text-foreground"
                                  : "text-foreground/70 group-hover:text-foreground",
                              )}
                              title={row.definition?.description ?? row.name}
                            >
                              {row.name}
                            </span>
                          </TooltipTrigger>
                          {row.definition?.description && (
                            <TooltipContent side="top">
                              <p className="text-[11px] max-w-60">
                                {row.definition.description}
                              </p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                      {projectId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditTarget(row);
                          }}
                          className="size-6 rounded-lg opacity-0 group-hover:opacity-100 bg-white/5 hover:bg-white/10 flex items-center justify-center text-foreground/30 hover:text-foreground/60 transition-all shrink-0"
                        >
                          <Pencil size={10} />
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="px-2 py-3 text-right">
                    <span className="tabular-nums text-xs text-foreground/70">
                      {row.volume.toLocaleString()}
                    </span>
                  </td>

                  <td className="px-2 py-3 text-right hidden sm:table-cell">
                    <span className="tabular-nums text-xs text-foreground/50">
                      {row.users.toLocaleString()}
                    </span>
                  </td>

                  <td className="px-2 py-3 text-right hidden md:table-cell">
                    <TrendBadge trend={row.trend} />
                  </td>

                  <td className="px-2 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {visibleProps.map((prop) => (
                        <TooltipProvider key={prop.key}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={cn(
                                  "inline-flex items-center font-mono text-[10px] px-1.5 py-0.5 h-5 rounded-md cursor-default",
                                  prop.defined
                                    ? "bg-primary/8 text-primary/70"
                                    : prop.noDataYet
                                      ? "bg-white/2 text-foreground/25"
                                      : "bg-white/4 text-foreground/50",
                                )}
                              >
                                {prop.key}
                                <span className="text-foreground/30 ml-0.5">
                                  :{prop.type}
                                </span>
                                {prop.noDataYet && (
                                  <span className="text-foreground/20 ml-1">no data yet</span>
                                )}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-[11px]">
                                {prop.key}: {prop.type}
                                {prop.description && (
                                  <> &middot; {prop.description}</>
                                )}
                                {prop.defined && (
                                  <span className="text-foreground/40 ml-1">
                                    (defined)
                                  </span>
                                )}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                      {overflowCount > 0 && (
                        <span className="text-[10px] text-foreground/30">
                          +{overflowCount} more
                        </span>
                      )}
                      {row.properties.length === 0 && (
                        <span className="text-[11px] text-foreground/20">—</span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <span className="tabular-nums text-xs text-foreground/30">
                      {formatRelativeTime(row.lastSeen)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editTarget && projectId && (
        <EventDefinitionDialog
          key={editTarget.name}
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          eventName={editTarget.name}
          projectId={projectId}
          initialDescription={editTarget.definition?.description ?? null}
          initialColor={editTarget.definition?.color ?? null}
          initialSchema={
            editTarget.properties
              .filter((p) => p.defined)
              .reduce(
                (acc, p) => {
                  acc[p.key] = {
                    type: p.type as "string" | "number" | "boolean",
                    ...(p.description ? { description: p.description } : {}),
                  };
                  return acc;
                },
                {} as Record<string, { type: string; description?: string }>,
              ) ?? null
          }
        />
      )}
    </>
  );
}
