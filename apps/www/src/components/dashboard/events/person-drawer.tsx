"use client";

import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import { ChevronRight } from "lucide-react";
import { SectionLabel, InferredRow, EmptyValue } from "./property-inspector";
import { formatEventTime } from "@/lib/date";

interface PersonDrawerProps {
  projectId: string;
  personId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventClick: (eventName: string, properties: string) => void;
  onViewAllEvents?: (personId: string) => void;
}

const TYPE_DOT: Record<string, string> = {
  pageview: "bg-primary",
  custom: "bg-amber-400",
};

export function PersonDrawer({
  projectId,
  personId,
  open,
  onOpenChange,
  onEventClick,
  onViewAllEvents,
}: PersonDrawerProps) {
  const { data, isLoading } = trpc.events.person.useQuery(
    { projectId, personId, limit: 10 },
    { enabled: open },
  );

  const events = data?.recentEvents ?? [];

  const profileProperties = useMemo(() => {
    if (!data?.profile) return null;

    let parsed: Record<string, unknown> = {};
    try {
      parsed = data.profile.properties
        ? (JSON.parse(data.profile.properties) as Record<string, unknown>)
        : {};
    } catch {
      parsed = {};
    }
    const raw = parsed;

    const merged = { ...raw };

    if (!("first_seen_at" in merged)) {
      merged.first_seen_at = data.profile.first_seen_at;
    }
    if (!("updated_at" in merged)) {
      merged.updated_at = data.profile.updated_at;
    }

    return merged;
  }, [data]);

  const handleViewAllEvents = () => {
    onOpenChange(false);
    onViewAllEvents?.(personId);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="px-4 pt-6 pb-3">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-sm font-semibold pr-0">
              Person
            </SheetTitle>
            {data && (
              <Badge
                variant={
                  data.profile?.is_identified === 1 ? "default" : "secondary"
                }
                className="text-xs"
              >
                {data.profile?.is_identified === 1 ? "Identified" : "Anonymous"}
              </Badge>
            )}
          </div>
          <SheetDescription className="text-xs text-foreground/40 break-all font-mono">
            {personId}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 mt-6 space-y-6 pb-6">
          {isLoading ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="h-3 w-20 animate-pulse rounded bg-white/5" />
                <div className="space-y-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-2 py-1.5"
                    >
                      <div className="h-2.5 w-16 animate-pulse rounded bg-white/5" />
                      <div className="h-4 w-10 animate-pulse rounded-md bg-white/8" />
                      <div className="h-2.5 w-24 animate-pulse rounded bg-white/5 ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
                <div className="rounded-xl bg-muted dark:bg-white/4 overflow-hidden divide-y divide-border/50 dark:divide-white/5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <div className="size-1.5 rounded-full bg-white/10" />
                        <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
                      </div>
                      <div className="h-3 w-14 animate-pulse rounded bg-white/5" />
                    </div>
                  ))}
                </div>
                <div className="h-3 w-28 animate-pulse rounded bg-white/5" />
              </div>
            </div>
          ) : (
            <>
              {profileProperties !== null && (
                <div>
                  <SectionLabel
                    label="Properties"
                    count={Object.keys(profileProperties).length}
                  />
                  <div className="space-y-0.5">
                    {Object.keys(profileProperties).length > 0 ? (
                      Object.entries(profileProperties).map(([key, value]) => (
                        <InferredRow key={key} propKey={key} value={value} />
                      ))
                    ) : (
                      <p className="text-xs text-foreground/40 px-2 py-1">
                        <EmptyValue />
                      </p>
                    )}
                  </div>
                </div>
              )}

              {events.length > 0 && (
                <div>
                  <SectionLabel label="Recent events" count={events.length} />
                  <div className="rounded-md bg-muted dark:bg-white/4 overflow-hidden divide-y divide-border/50 dark:divide-white/5">
                    {events.map((event) => (
                      <button
                        key={event.event_id}
                        onClick={() =>
                          onEventClick(event.event_name, event.properties)
                        }
                        className="flex items-center justify-between w-full px-3 py-2.5 text-xs hover:bg-black/2 dark:hover:bg-white/3 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`size-1.5 shrink-0 rounded-full ${
                              TYPE_DOT[event.event_type] ?? "bg-foreground/20"
                            }`}
                          />
                          <span className="font-medium text-foreground/80 truncate">
                            {event.event_name}
                          </span>
                        </div>
                        <span className="text-foreground/40 tabular-nums shrink-0 ml-3">
                          {formatEventTime(event.timestamp)}
                        </span>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleViewAllEvents}
                    className="mt-3 flex items-center gap-1.5 text-xs text-foreground/40 hover:text-foreground transition-colors cursor-pointer"
                  >
                    View all events
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              )}

              {!isLoading && !data?.profile && events.length === 0 && (
                <p className="text-xs text-foreground/40 text-center py-8">
                  No data found for this person.
                </p>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
