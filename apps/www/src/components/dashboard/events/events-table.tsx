"use client";

import { cn } from "@/lib/utils";
import {
  formatDistanceToNow,
  parse,
  differenceInHours,
  format,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";

export interface EventRow {
  event_id: string;
  event_type: string;
  event_name: string;
  properties: string;
  person_id: string;
  session_id: string;
  project_id: string;
  source: string;
  timestamp: string;
}

interface EventsTableProps {
  events: EventRow[];
  loading?: boolean;
  hasMore: boolean;
  onNext: () => void;
  onPrev: () => void;
  onPersonClick: (personId: string) => void;
  onPropertiesClick: (event: EventRow) => void;
  onEventClick?: (event: EventRow) => void;
}

function formatTime(ts: string): string {
  try {
    const parsed = parse(ts.slice(0, 19), "yyyy-MM-dd HH:mm:ss", new Date());
    const hoursDiff = differenceInHours(new Date(), parsed);
    if (hoursDiff < 24) {
      return formatDistanceToNow(parsed, { addSuffix: true });
    }
    return format(parsed, "MMM d, HH:mm");
  } catch {
    return ts;
  }
}

export function EventsTable({
  events,
  loading,
  hasMore,
  onNext,
  onPrev,
  onPersonClick,
  onPropertiesClick,
  onEventClick,
}: EventsTableProps) {
  if (loading) {
    return (
      <div className="rounded-[1.5rem] bg-muted dark:bg-white/4 overflow-hidden">
        <div className="px-4 py-3 border-b border-border dark:border-white/5">
          <div className="flex gap-6">
            <div className="h-2.5 w-24 animate-pulse rounded bg-black/5 dark:bg-white/5" />
            <div className="h-2.5 w-16 animate-pulse rounded bg-black/5 dark:bg-white/5" />
            <div className="h-2.5 w-14 animate-pulse rounded bg-black/5 dark:bg-white/5" />
            <div className="h-2.5 w-10 animate-pulse rounded bg-black/5 dark:bg-white/5" />
            <div className="h-2.5 w-16 animate-pulse rounded bg-black/5 dark:bg-white/5 ml-auto" />
          </div>
        </div>
        <div className="divide-y divide-border/50 dark:divide-white/4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-4 py-3">
              <div className="h-3 w-28 animate-pulse rounded bg-black/5 dark:bg-white/5" />
              <div className="h-3 w-16 animate-pulse rounded bg-black/5 dark:bg-white/5" />
              <div className="h-3 w-12 animate-pulse rounded bg-black/5 dark:bg-white/5" />
              <div className="h-3 w-10 animate-pulse rounded bg-black/5 dark:bg-white/5" />
              <div className="h-3 w-14 animate-pulse rounded bg-black/5 dark:bg-white/5 ml-auto" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-border/50 dark:border-white/4">
          <div className="h-7 w-20 animate-pulse rounded-lg bg-black/5 dark:bg-white/5" />
          <div className="h-7 w-14 animate-pulse rounded-lg bg-black/5 dark:bg-white/5" />
        </div>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="rounded-[1.5rem] bg-muted dark:bg-white/4 p-8 text-center text-xs text-foreground/30">
        No events found for the selected filters.
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] bg-muted dark:bg-white/4 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border dark:border-white/5">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-foreground/30">
                Event
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-foreground/30 whitespace-nowrap">
                Timestamp
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-foreground/30 whitespace-nowrap">
                Person
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-foreground/30">
                Source
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-foreground/30" />
            </tr>
          </thead>
          <tbody>
            {events.map((event, i) => (
              <tr
                key={event.event_id}
                onClick={() => onEventClick?.(event)}
                className={cn(
                  "transition-colors cursor-pointer",
                  "hover:bg-black/2 dark:hover:bg-white/3",
                  i !== events.length - 1 &&
                    "border-b border-border/50 dark:border-white/4",
                )}
              >
                <td className="px-4 py-3 font-medium text-foreground truncate max-w-40">
                  {event.event_name}
                </td>
                <td
                  className="px-4 py-3 text-foreground/40 whitespace-nowrap tabular-nums"
                  title={event.timestamp}
                >
                  {formatTime(event.timestamp)}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPersonClick(event.person_id);
                    }}
                    className="font-mono text-foreground/40 hover:text-foreground transition-colors truncate max-w-32 text-left"
                    title={event.person_id}
                  >
                    {event.person_id.slice(0, 8)}&hellip;
                  </button>
                </td>
                <td className="px-4 py-3 text-foreground/40 whitespace-nowrap">
                  {event.source}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPropertiesClick(event);
                    }}
                    className="inline-flex items-center gap-1 text-foreground/40 hover:text-foreground transition-colors group/props"
                  >
                    <span className="text-xs underline-offset-4 group-hover/props:underline">
                      Properties
                    </span>
                    <ArrowUpRight
                      size={12}
                      className="opacity-40 group-hover/props:opacity-70 transition-opacity"
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-border/50 dark:border-white/4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          className="h-7 text-xs gap-1 text-foreground/40 hover:text-foreground"
        >
          <ChevronLeft size={14} />
          Previous
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          disabled={!hasMore}
          className="h-7 text-xs gap-1 text-foreground/40 hover:text-foreground disabled:opacity-20"
        >
          Next
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
