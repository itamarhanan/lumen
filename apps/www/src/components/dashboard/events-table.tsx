"use client";

import { ChevronLeft, ChevronRight, AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const INFRA_KEYS = new Set([
  "browser",
  "browserVersion",
  "os",
  "osVersion",
  "device",
  "deviceModel",
  "deviceVendor",
  "ip",
  "userAgent",
  "url",
  "referrer",
]);

export interface EventFeedItem {
  eventName: string;
  timestamp: string;
  visitorId: string;
  sessionId: string;
  properties: Record<string, unknown>;
}

interface EventsTableProps {
  events: EventFeedItem[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEventNameClick?: (name: string) => void;
  onPersonClick?: (sessionId: string, visitorId: string) => void;
  onVisitorClick?: (visitorId: string) => void;
  onPropertiesClick?: (event: EventFeedItem) => void;
  activeEventName?: string | null;
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return ts;
  }
}

function truncateId(id: string): string {
  return id.length <= 10 ? id : id.slice(0, 8) + "…";
}

function propertyEntries(properties: Record<string, unknown>) {
  return Object.entries(properties).filter(([k]) => !INFRA_KEYS.has(k));
}

export function EventsTable({
  events,
  loading,
  error,
  onRetry,
  total,
  page,
  totalPages,
  onPageChange,
  onEventNameClick,
  onPersonClick,
  onVisitorClick,
  onPropertiesClick,
  activeEventName,
}: EventsTableProps) {
  if (loading) {
    return (
      <div className="rounded-[1.5rem] bg-muted dark:bg-white/4 overflow-hidden p-1 flex flex-col gap-px">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[1.5rem] bg-muted dark:bg-white/4 flex flex-col items-center justify-center gap-3 py-14">
        <div className="size-8 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle size={14} className="text-destructive/70" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground/70">
            Failed to load events
          </p>
          <p className="text-xs text-foreground/35 mt-0.5">
            There was a problem fetching your events.
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

  if (events.length === 0) {
    return (
      <div className="rounded-[1.5rem] bg-muted dark:bg-white/4 flex flex-col items-center justify-center gap-4 py-14 px-6 text-center">
        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Zap size={14} className="text-primary/60" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground/70">
            No events tracked yet
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

  return (
    <div className="rounded-[1.5rem] bg-muted dark:bg-white/4 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-white/5 hover:bg-transparent">
            <TableHead className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/30 h-10">
              Timestamp
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/30 h-10">
              Event
            </TableHead>
            <TableHead className="hidden sm:table-cell text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/30 h-10">
              Person
            </TableHead>
            <TableHead className="hidden md:table-cell text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/30 h-10">
              Properties
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((ev, i) => {
            const entries = propertyEntries(ev.properties);
            const topTwo = entries.slice(0, 2);
            const overflow = entries.length - 2;
            const isActive = activeEventName === ev.eventName;

            return (
              <TableRow
                key={`${ev.sessionId}-${ev.timestamp}-${i}`}
                className={cn(
                  "border-white/4 transition-colors",
                  isActive && "bg-white/2",
                )}
              >
                <TableCell className="text-xs text-foreground/40 tabular-nums whitespace-nowrap py-3">
                  {formatTimestamp(ev.timestamp)}
                </TableCell>

                <TableCell className="py-3 max-w-32">
                  {onEventNameClick ? (
                    <button
                      onClick={() => onEventNameClick(ev.eventName)}
                      className={cn(
                        "font-mono text-[12px] truncate block text-left transition-colors hover:text-foreground",
                        isActive ? "text-foreground" : "text-foreground/70",
                      )}
                      title={ev.eventName}
                    >
                      {ev.eventName}
                    </button>
                  ) : (
                    <span
                      className="font-mono text-[12px] text-foreground/70 truncate block"
                      title={ev.eventName}
                    >
                      {ev.eventName}
                    </span>
                  )}
                </TableCell>

                <TableCell className="hidden sm:table-cell py-3">
                  {onVisitorClick ? (
                    <button
                      onClick={() => onVisitorClick(ev.visitorId)}
                      title={ev.visitorId}
                      className="font-mono text-[11px] text-foreground/35 hover:text-foreground/70 transition-colors bg-white/4 hover:bg-white/[0.07] rounded-md px-1.5 py-0.5"
                    >
                      {truncateId(ev.visitorId)}
                    </button>
                  ) : onPersonClick ? (
                    <button
                      onClick={() => onPersonClick(ev.sessionId, ev.visitorId)}
                      title={ev.sessionId}
                      className="font-mono text-[11px] text-foreground/35 hover:text-foreground/70 transition-colors bg-white/4 hover:bg-white/[0.07] rounded-md px-1.5 py-0.5"
                    >
                      {truncateId(ev.sessionId)}
                    </button>
                  ) : (
                    <span
                      className="font-mono text-[11px] text-foreground/35"
                      title={ev.visitorId}
                    >
                      {truncateId(ev.visitorId)}
                    </span>
                  )}
                </TableCell>

                <TableCell className="hidden md:table-cell py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {topTwo.map(([k, v]) => (
                      <Badge
                        key={k}
                        variant="secondary"
                        className="font-mono text-[10px] px-1.5 py-0 h-5 bg-white/4 text-foreground/50 border-transparent hover:bg-white/[0.07]"
                      >
                        {k}=
                        <span className="text-foreground/70 ml-0.5">
                          {typeof v === "string"
                            ? v.length > 8
                              ? v.slice(0, 7) + "…"
                              : v
                            : JSON.stringify(v)}
                        </span>
                      </Badge>
                    ))}
                    {overflow > 0 && (
                      <button
                        onClick={() => onPropertiesClick?.(ev)}
                        className="text-[10px] text-foreground/30 hover:text-foreground/60 transition-colors"
                      >
                        +{overflow} more
                      </button>
                    )}
                    {entries.length === 0 && (
                      <span className="text-[11px] text-foreground/20">—</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/4">
          <span className="text-xs text-foreground/30 tabular-nums">
            {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of{" "}
            {total.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft size={12} />
            </Button>
            <span className="text-xs text-foreground/30 tabular-nums px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight size={12} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
