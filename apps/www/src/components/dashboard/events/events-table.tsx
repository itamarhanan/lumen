"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";

interface EventRow {
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
}

function EventRow({
  event,
  onPersonClick,
}: {
  event: EventRow;
  onPersonClick: (personId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  let propsDisplay = "{}";
  try {
    const parsed = JSON.parse(event.properties);
    propsDisplay = JSON.stringify(parsed, null, 2);
  } catch {}

  return (
    <div className="group">
      <div className="grid grid-cols-[1fr_auto_auto_2rem] gap-3 px-4 py-2.5 text-xs items-center border-b border-border/50 dark:border-white/[0.04] hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-block size-1.5 rounded-full shrink-0 ${
              event.event_type === "pageview"
                ? "bg-primary"
                : event.event_type === "custom"
                  ? "bg-amber-400"
                  : "bg-foreground/20"
            }`}
          />
          <span className="font-medium truncate">{event.event_name}</span>
        </div>

        <span className="text-foreground/40 whitespace-nowrap font-mono text-[10px]">
          {event.timestamp}
        </span>

        <button
          onClick={() => onPersonClick(event.person_id)}
          className="text-foreground/40 hover:text-foreground transition-colors font-mono text-[10px] truncate max-w-24 text-left"
          title={event.person_id}
        >
          {event.person_id.slice(0, 8)}…
        </button>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-foreground/20 hover:text-foreground/60 transition-colors"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 py-2 bg-white/[0.01] border-b border-border/50 dark:border-white/[0.04]">
          <pre className="text-[10px] text-foreground/50 overflow-x-auto max-h-40">
            {propsDisplay}
          </pre>
        </div>
      )}
    </div>
  );
}

export function EventsTable({
  events,
  loading,
  hasMore,
  onNext,
  onPrev,
  onPersonClick,
}: EventsTableProps) {
  if (loading) {
    return (
      <div className="rounded-[1.5rem] bg-muted dark:bg-white/4 overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-full animate-pulse rounded-lg bg-black/5 dark:bg-white/5"
            />
          ))}
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
      <div className="divide-y divide-transparent">
        {events.map((event) => (
          <EventRow
            key={event.event_id}
            event={event}
            onPersonClick={onPersonClick}
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-border/50 dark:border-white/[0.04]">
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
