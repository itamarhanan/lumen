"use client";

import { useMemo } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PersonDrawerProps {
  projectId: string;
  sessionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitorId?: string | null;
}

function hashToColor(id: string): string {
  const colors = [
    "#7C6AF7",
    "#4EADFF",
    "#F97B6B",
    "#4FD1A0",
    "#F6AD55",
    "#A78BFA",
    "#F472B6",
    "#34D399",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length]!;
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

function renderScalar(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string")
    return value.length > 60 ? value.slice(0, 59) + "…" : value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value);
}

export function PersonDrawer({
  projectId,
  sessionId,
  open,
  onOpenChange,
  visitorId,
}: PersonDrawerProps) {
  const detail = trpc.analytics.sessionDetail.useQuery(
    { projectId, sessionId: sessionId ?? "" },
    { enabled: open && !!sessionId },
  );

  const data = detail.data;
  const avatarColor = sessionId ? hashToColor(sessionId) : "#4B5563";
  const initials = sessionId?.slice(0, 2).toUpperCase() ?? "??";

  const autoEntries = useMemo(
    () =>
      Object.entries(data?.autoProperties ?? {}).filter(([, v]) => v != null),
    [data],
  );

  const devEntries = useMemo(
    () => Object.entries(data?.developerProperties ?? {}),
    [data],
  );

  const timeline = data?.timeline ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col gap-0"
      >
        {/* Identity header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-white/6">
          <div className="flex items-center gap-3">
            <div
              className="size-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ring-1 ring-white/10"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-sm font-medium leading-none">
                Session
              </SheetTitle>
              <p className="font-mono text-[10px] text-foreground/30 truncate mt-1">
                {sessionId}
              </p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-5 flex flex-col gap-6">
            {detail.isLoading && (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-xl" />
                ))}
              </div>
            )}

            {!detail.isLoading && !data && (
              <p className="text-xs text-foreground/30 text-center py-8">
                No session data found.
              </p>
            )}

            {data && (
              <>
                {/* Auto-collected properties — card grid */}
                {autoEntries.length > 0 && (
                  <section>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/25 mb-3">
                      Properties
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {autoEntries.map(([key, value]) => (
                        <div
                          key={key}
                          className="rounded-xl bg-white/3 border border-white/5 px-3 py-2.5"
                        >
                          <p className="text-[10px] text-foreground/30 mb-0.5 truncate">
                            {key}
                          </p>
                          <p
                            className="text-xs text-foreground/75 truncate font-medium"
                            title={renderScalar(value)}
                          >
                            {renderScalar(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Developer properties — accented table */}
                {devEntries.length > 0 && (
                  <section>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/25 mb-3">
                      Developer Properties
                    </p>
                    <div
                      className="rounded-xl border border-white/6 border-l-2 overflow-hidden"
                      style={{ borderLeftColor: avatarColor + "80" }}
                    >
                      {devEntries.map(([key, value], i) => (
                        <div
                          key={key}
                          className={cn(
                            "flex items-start gap-3 px-3 py-2.5",
                            i !== devEntries.length - 1 &&
                              "border-b border-white/4",
                          )}
                        >
                          <span className="text-[11px] text-foreground/40 font-medium w-1/3 shrink-0 pt-px truncate">
                            {key}
                          </span>
                          <span className="text-xs text-foreground/75 wrap-break-word min-w-0">
                            {renderScalar(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <Separator className="bg-white/5" />

                {/* Timeline */}
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/25 mb-4">
                    Event Timeline
                  </p>

                  {timeline.length === 0 && (
                    <p className="text-xs text-foreground/30 text-center py-6 rounded-xl border border-dashed border-white/6">
                      No events in this session
                    </p>
                  )}

                  {timeline.length > 0 && (
                    <div className="relative pl-5">
                      {/* vertical line */}
                      <div className="absolute left-2 top-2 bottom-2 w-px bg-white/6" />

                      {timeline.map((ev, i) => {
                        const topKey = Object.keys(ev.properties ?? {}).find(
                          (k) =>
                            ![
                              "browser",
                              "os",
                              "device",
                              "url",
                              "referrer",
                            ].includes(k),
                        );
                        const topVal = topKey ? ev.properties[topKey] : null;

                        return (
                          <div
                            key={`${ev.timestamp}-${i}`}
                            className="relative mb-3.5 last:mb-0"
                          >
                            {/* dot */}
                            <div
                              className="absolute -left-5 top-1 size-2 rounded-full border border-white/20 bg-background"
                              style={{
                                boxShadow: `0 0 0 1px ${avatarColor}40`,
                              }}
                            />
                            <div className="flex items-baseline gap-2 min-w-0">
                              <span className="font-mono text-[11px] text-foreground/75 shrink-0">
                                {ev.eventName}
                              </span>
                              {topKey && (
                                <span className="text-[10px] text-foreground/35 truncate">
                                  {topKey}=
                                  {typeof topVal === "string"
                                    ? topVal.length > 14
                                      ? topVal.slice(0, 13) + "…"
                                      : topVal
                                    : JSON.stringify(topVal)}
                                </span>
                              )}
                              <span className="text-[10px] text-foreground/25 tabular-nums ml-auto shrink-0">
                                {formatTime(ev.timestamp)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </ScrollArea>

        {visitorId && data && (
          <div className="px-5 py-3 border-t border-white/6">
            <Link href={`/dashboard/events/person/${visitorId}`}>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => onOpenChange(false)}
              >
                View full person page
              </Button>
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}


