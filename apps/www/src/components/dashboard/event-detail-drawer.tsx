"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const PALETTE = [
  "#7C6AF7",
  "#4EADFF",
  "#F97B6B",
  "#4FD1A0",
  "#F6AD55",
  "#A78BFA",
  "#F472B6",
  "#34D399",
];

function getEventColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]!;
}

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

interface EventDetailDrawerProps {
  event: EventFeedItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  from: string;
  to: string;
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return ts;
  }
}

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined)
    return <span className="text-foreground/25">—</span>;
  if (typeof value === "string") {
    return value.length > 150 ? (
      <span title={value}>{value.slice(0, 150)}…</span>
    ) : (
      value
    );
  }
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return (
    <span
      title={JSON.stringify(value, null, 2)}
      className="font-mono text-[11px] text-foreground/45"
    >
      {JSON.stringify(value)}
    </span>
  );
}

function BreakdownChart({
  projectId,
  eventName,
  from,
  to,
  eventColor,
}: {
  projectId: string;
  eventName: string;
  from: string;
  to: string;
  eventColor: string;
}) {
  const [input, setInput] = useState("");
  const [activePath, setActivePath] = useState("");

  const breakdown = trpc.analytics.eventBreakdown.useQuery(
    { projectId, eventName, from, to, propertyPath: activePath },
    { enabled: !!activePath },
  );

  const rows = breakdown.data ?? [];

  return (
    <section>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/25 mb-3">
        Breakdown
      </p>

      <div className="rounded-xl border border-white/6 overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-white/4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim())
                setActivePath(input.trim());
            }}
            placeholder="Property path, e.g. plan"
            className="h-7 text-xs font-mono bg-white/3 border-white/6 placeholder:text-foreground/20"
          />
          {activePath && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] text-foreground/35 shrink-0"
              onClick={() => {
                setInput("");
                setActivePath("");
              }}
            >
              Clear
            </Button>
          )}
        </div>

        {/* states */}
        {!activePath && (
          <p className="text-xs text-foreground/25 text-center py-8 px-4">
            Enter a property path and press Enter
          </p>
        )}

        {activePath && breakdown.isLoading && (
          <div className="p-3 flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full rounded-lg" />
            ))}
          </div>
        )}

        {activePath && !breakdown.isLoading && rows.length === 0 && (
          <p className="text-xs text-foreground/25 text-center py-8 px-4">
            No data for <span className="font-mono">{activePath}</span>
          </p>
        )}

        {rows.length > 0 && (
          <div className="p-3 flex flex-col gap-2">
            {rows.map((row) => (
              <div key={row.value} className="flex items-center gap-3">
                <span className="text-[11px] text-foreground/50 font-mono w-24 truncate shrink-0 text-right">
                  {row.value || "(empty)"}
                </span>
                <div className="flex-1 h-5 rounded-md bg-white/4 overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-300"
                    style={{
                      width: `${row.percentage}%`,
                      backgroundColor: eventColor + "70",
                    }}
                  />
                </div>
                <span className="text-[11px] text-foreground/40 tabular-nums w-16 shrink-0 text-right">
                  {row.count.toLocaleString()}
                </span>
                <span className="text-[11px] text-foreground/25 tabular-nums w-10 shrink-0 text-right">
                  {row.percentage}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function EventDetailDrawer({
  event,
  open,
  onOpenChange,
  projectId,
  from,
  to,
}: EventDetailDrawerProps) {
  const eventColor = event ? getEventColor(event.eventName) : "#4B5563";

  const allKeys = useMemo(
    () => (event ? Object.keys(event.properties) : []),
    [event],
  );
  const userKeys = useMemo(
    () => allKeys.filter((k) => !INFRA_KEYS.has(k)),
    [allKeys],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col gap-0"
      >
        {event && (
          <>
            {/* Header with color identity */}
            <SheetHeader className="px-5 pt-5 pb-4 border-b border-white/6">
              <div className="flex items-center gap-3">
                <div
                  className="size-2.5 rounded-full shrink-0 mt-0.5 ring-2 ring-offset-2 ring-offset-background"
                  style={{
                    backgroundColor: eventColor,
                    outlineColor: eventColor + "40",
                  }}
                />
                <div className="min-w-0">
                  <SheetTitle className="font-mono text-sm font-medium leading-none">
                    {event.eventName}
                  </SheetTitle>
                  <p className="text-[11px] text-foreground/35 mt-1">
                    {formatTimestamp(event.timestamp)}
                  </p>
                </div>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="px-5 py-5 flex flex-col gap-6">
                {/* Person / Session */}
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/25 mb-3">
                    Person
                  </p>
                  <div className="rounded-xl border border-white/6 overflow-hidden">
                    <Link
                      href={`/dashboard/events/person/${event.visitorId}`}
                      className="flex items-center justify-between px-3 py-2.5 border-b border-white/4 hover:bg-white/[0.02] transition-colors group"
                    >
                      <span className="text-[11px] text-foreground/40 font-medium">
                        Visitor
                      </span>
                      <span className="font-mono text-[11px] text-foreground/50 group-hover:text-foreground/80 transition-colors">
                        {event.visitorId.slice(0, 8)}…
                      </span>
                    </Link>
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-[11px] text-foreground/40 font-medium">
                        Session
                      </span>
                      <span className="font-mono text-[11px] text-foreground/35" title={event.sessionId}>
                        {event.sessionId.slice(0, 8)}…
                      </span>
                    </div>
                  </div>
                </section>

                <Separator className="bg-white/5" />

                {/* All properties */}
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/25 mb-3">
                    All Properties
                  </p>

                  {allKeys.length === 0 ? (
                    <p className="text-xs text-foreground/25 text-center py-8 rounded-xl border border-dashed border-white/6">
                      No properties
                    </p>
                  ) : (
                    <div className="rounded-xl border border-white/6 overflow-hidden">
                      {allKeys.map((key, i) => (
                        <div
                          key={key}
                          className={cn(
                            "flex items-start gap-3 px-3 py-2.5",
                            i !== allKeys.length - 1 &&
                              "border-b border-white/4",
                          )}
                        >
                          <span className="text-[11px] text-foreground/40 font-medium w-1/3 shrink-0 pt-px truncate flex items-center gap-1">
                            {key}
                            {!INFRA_KEYS.has(key) && (
                              <span
                                className="inline-block size-1 rounded-full shrink-0"
                                style={{ backgroundColor: eventColor + "90" }}
                              />
                            )}
                          </span>
                          <span className="text-xs text-foreground/75 wrap-break-word min-w-0">
                            {renderValue(event.properties[key])}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {userKeys.length > 0 && (
                  <>
                    <Separator className="bg-white/5" />
                    <BreakdownChart
                      projectId={projectId}
                      eventName={event.eventName}
                      from={from}
                      to={to}
                      eventColor={eventColor}
                    />
                  </>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
