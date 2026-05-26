"use client";

import { use } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { useDashboardStore } from "@/lib/store/dashboard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ArrowLeft, ChevronDown, User } from "lucide-react";
import { cn } from "@/lib/utils";

function formatShortTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

function hashToColor(id: string): string {
  const colors = [
    "#7C6AF7", "#4EADFF", "#F97B6B", "#4FD1A0",
    "#F6AD55", "#A78BFA", "#F472B6", "#34D399",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length]!;
}

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined)
    return <span className="text-foreground/25">—</span>;
  if (typeof value === "string") {
    return value.length > 120 ? (
      <span title={value}>{value.slice(0, 120)}…</span>
    ) : (
      value
    );
  }
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return (
    <span className="font-mono text-[11px] text-foreground/45">
      {JSON.stringify(value)}
    </span>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function PersonPage({
  params,
}: {
  params: Promise<{ visitorId: string }>;
}) {
  const { visitorId } = use(params);
  const projectId = useDashboardStore((s) => s.selectedProjectId) ?? "";

  const detail = trpc.analytics.personDetail.useQuery(
    { projectId, visitorId },
    { enabled: !!projectId },
  );

  const data = detail.data;
  const avatarColor = hashToColor(visitorId);
  const initials = visitorId.slice(0, 2).toUpperCase();

  if (detail.isLoading) {
    return (
      <div className="flex flex-col w-full min-h-0">
        <div className="px-4 sm:px-6 pt-5 pb-4 border-b border-white/5">
          <div className="h-6 w-48 animate-pulse rounded-lg bg-white/5" />
        </div>
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (detail.isError) {
    return (
      <div className="flex flex-col w-full min-h-0">
        <PageHeader visitorId={visitorId} avatarColor={avatarColor} initials={initials} />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-14">
          <div className="size-8 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle size={14} className="text-destructive/70" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground/70">
              Failed to load person
            </p>
            <p className="text-xs text-foreground/35 mt-0.5">
              There was a problem fetching this visitor&apos;s data.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => detail.refetch()}
            className="mt-1"
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col w-full min-h-0">
        <PageHeader visitorId={visitorId} avatarColor={avatarColor} initials={initials} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-14 px-6 text-center">
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User size={14} className="text-primary/60" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground/70">
              No data found
            </p>
            <p className="text-xs text-foreground/35 mt-1 max-w-xs">
              This visitor has no recorded events in the current period.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const propEntries = Object.entries(data.properties);

  return (
    <div className="flex flex-col w-full min-h-0">
      <PageHeader visitorId={visitorId} avatarColor={avatarColor} initials={initials} />

      <div className="flex flex-col gap-4 px-4 sm:px-6 pb-8">
        <div className="flex items-center gap-4 flex-wrap">
          <Stat label="Sessions" value={data.totalSessions} />
          <Stat label="Events" value={data.totalEvents} />
          <Stat label="First seen" value={relativeTime(data.firstSeen)} />
          <Stat label="Last seen" value={relativeTime(data.lastSeen)} />
        </div>

        {propEntries.length > 0 && (
          <section>
            <SectionTitle>Properties</SectionTitle>
            <div className="rounded-xl border border-white/6 overflow-hidden">
              {propEntries.map(([key, value], i) => (
                <div
                  key={key}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5",
                    i !== propEntries.length - 1 && "border-b border-white/4",
                  )}
                >
                  <span className="text-[11px] text-foreground/40 font-medium w-1/3 shrink-0 pt-px truncate">
                    {key}
                  </span>
                  <span className="text-xs text-foreground/75 min-w-0">
                    {renderValue(value)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionTitle>
            Sessions ({data.sessions.length})
          </SectionTitle>
          <div className="flex flex-col gap-2">
            {data.sessions.map((session) => (
              <SessionCard
                key={session.sessionId}
                session={session}
                avatarColor={avatarColor}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function PageHeader({
  visitorId,
  avatarColor,
  initials,
}: {
  visitorId: string;
  avatarColor: string;
  initials: string;
}) {
  return (
    <div className="flex items-center gap-4 px-4 sm:px-6 pt-5 pb-4 border-b border-white/5">
      <Link
        href="/dashboard/events"
        className="size-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center shrink-0 transition-colors"
      >
        <ArrowLeft size={13} className="text-foreground/40" />
      </Link>
      <div
        className="size-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ring-1 ring-white/10"
        style={{ backgroundColor: avatarColor }}
      >
        {initials}
      </div>
      <div className="min-w-0">
        <h1 className="text-base font-medium text-foreground leading-none">
          Person
        </h1>
        <p className="font-mono text-[11px] text-foreground/30 truncate mt-1">
          {visitorId}
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white/3 border border-white/5 px-3 py-2 min-w-24">
      <p className="text-[10px] text-foreground/30 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground/80 tabular-nums">
        {value}
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/25 mb-3">
      {children}
    </p>
  );
}

function SessionCard({
  session,
  avatarColor,
}: {
  session: {
    sessionId: string;
    browser: string | null;
    device: string | null;
    os: string | null;
    country: string | null;
    referrer: string | null;
    entryPage: string | null;
    events: Array<{
      eventName: string;
      timestamp: string;
      properties: Record<string, unknown>;
    }>;
  };
  avatarColor: string;
}) {
  const metaEntries = [
    ["Browser", session.browser],
    ["Device", session.device],
    ["OS", session.os],
    ["Country", session.country],
    ["Referrer", session.referrer],
    ["Entry page", session.entryPage],
  ].filter(([, v]) => v != null) as [string, string][];

  return (
    <details className="group rounded-xl border border-white/6 bg-white/[0.02] overflow-hidden">
      <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer list-none hover:bg-white/[0.02] transition-colors">
        <ChevronDown
          size={12}
          className="text-foreground/25 shrink-0 transition-transform group-open:rotate-0 -rotate-90"
        />
        <span className="font-mono text-[11px] text-foreground/50 truncate flex-1">
          {session.events[0]?.eventName ?? "Session"}
        </span>
        <span className="text-[10px] text-foreground/25 tabular-nums">
          {session.events.length} event{session.events.length !== 1 ? "s" : ""}
        </span>
        <span className="text-[10px] text-foreground/25 tabular-nums">
          {session.events.length > 0 &&
            formatShortTimestamp(
              session.events[session.events.length - 1]!.timestamp,
            )}
        </span>
      </summary>
      <div className="px-4 pb-4 pt-1 flex flex-col gap-4">
        {metaEntries.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {metaEntries.map(([key, value]) => (
              <div
                key={key}
                className="rounded-lg bg-white/3 border border-white/5 px-2.5 py-1.5"
              >
                <p className="text-[9px] text-foreground/30 mb-0.5 truncate">
                  {key}
                </p>
                <p
                  className="text-[11px] text-foreground/70 truncate font-medium"
                  title={value}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="relative pl-5">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-white/6" />
          {session.events.map((ev, i) => {
            const topKey = Object.keys(ev.properties ?? {}).find(
              (k) =>
                !["browser", "os", "device", "url", "referrer"].includes(k),
            );
            const topVal = topKey ? ev.properties[topKey] : null;

            return (
              <div
                key={`${ev.timestamp}-${i}`}
                className="relative mb-3 last:mb-0"
              >
                <div
                  className="absolute -left-5 top-1 size-2 rounded-full border border-white/20 bg-background"
                  style={{ boxShadow: `0 0 0 1px ${avatarColor}40` }}
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
                    {formatShortTimestamp(ev.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </details>
  );
}
