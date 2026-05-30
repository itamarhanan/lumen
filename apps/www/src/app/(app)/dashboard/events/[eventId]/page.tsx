"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useDashboardStore } from "@/lib/store/dashboard";
import {
  SectionLabel,
  InferredRow,
  EmptyValue,
} from "@/components/dashboard/events/property-inspector";
import { ArrowLeft } from "lucide-react";
import {
  formatDistanceToNow,
  parse,
  differenceInHours,
  format,
} from "date-fns";

function formatTime(ts: string): string {
  try {
    const parsed = parse(ts.slice(0, 19), "yyyy-MM-dd HH:mm:ss", new Date());
    const hoursDiff = differenceInHours(new Date(), parsed);
    if (hoursDiff < 24) {
      return formatDistanceToNow(parsed, { addSuffix: true });
    }
    return format(parsed, "MMM d, yyyy HH:mm");
  } catch {
    return ts;
  }
}

const TYPE_DOT: Record<string, string> = {
  pageview: "bg-primary",
  custom: "bg-amber-400",
  identify: "bg-cyan-400",
};

function MetaCard({
  label,
  value,
  mono,
  href,
}: {
  label: string;
  value: string;
  mono?: boolean;
  href?: string;
}) {
  const Tag = href ? "a" : "div";
  return (
    <div
      className={`flex items-center justify-between gap-4 px-3 py-2.5 ${
        href
          ? "cursor-pointer hover:bg-black/2 dark:hover:bg-white/3 transition-colors"
          : ""
      }`}
    >
      <span className="text-[11px] font-medium text-foreground/30 uppercase tracking-wider shrink-0">
        {label}
      </span>
      <Tag
        {...(href ? { href, className: "hover:text-foreground transition-colors" } : {})}
        className={`text-[11px] text-foreground/70 text-right break-all min-w-0 leading-relaxed ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </Tag>
    </div>
  );
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const projectId = useDashboardStore((s) => s.selectedProjectId) ?? "";

  const { data: event, isLoading } = trpc.events.getById.useQuery(
    { projectId, eventId },
    { enabled: !!projectId && !!eventId },
  );

  const properties = useMemo(() => {
    if (!event?.properties) return null;
    try {
      return JSON.parse(event.properties) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [event]);

  if (isLoading) {
    return (
      <div className="flex flex-col w-full">
        <div className="flex items-center gap-3 px-4 pt-5 pb-3 sm:px-6 border-b border-border dark:border-[oklch(0.15_0_0)]">
          <div className="h-4 w-20 animate-pulse rounded bg-black/5 dark:bg-white/5" />
        </div>
        <div className="p-6 space-y-6 max-w-2xl">
          <div className="h-6 w-48 animate-pulse rounded bg-black/5 dark:bg-white/5" />
          <div className="rounded-xl bg-muted dark:bg-white/4 divide-y divide-border/50 dark:divide-white/5 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2.5">
                <div className="h-3 w-16 animate-pulse rounded bg-black/5 dark:bg-white/5" />
                <div className="h-3 w-28 animate-pulse rounded bg-black/5 dark:bg-white/5" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="h-3 w-20 animate-pulse rounded bg-black/5 dark:bg-white/5" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                <div className="h-2.5 w-12 animate-pulse rounded bg-black/5 dark:bg-white/5" />
                <div className="h-4 w-10 animate-pulse rounded-md bg-black/5 dark:bg-white/8" />
                <div className="h-2.5 w-24 animate-pulse rounded bg-black/5 dark:bg-white/5 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col w-full">
        <div className="flex items-center gap-3 px-4 pt-5 pb-3 sm:px-6 border-b border-border dark:border-[oklch(0.15_0_0)]">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs text-foreground/40 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </button>
        </div>
        <div className="p-6 text-xs text-foreground/30 text-center py-16">
          Event not found.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-3 sm:px-6 border-b border-border dark:border-[oklch(0.15_0_0)]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs text-foreground/40 hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </button>
          <span className="text-foreground/20">/</span>
          <h1 className="text-sm font-medium text-foreground truncate flex items-center gap-2 min-w-0">
            <span
              className={`size-2 shrink-0 rounded-full ${
                TYPE_DOT[event.event_type] ?? "bg-foreground/20"
              }`}
            />
            {event.event_name}
          </h1>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
        <div className="rounded-xl bg-muted dark:bg-white/4 divide-y divide-border/50 dark:divide-white/5 overflow-hidden">
          <MetaCard label="Type" value={event.event_type} />
          <MetaCard label="Timestamp" value={formatTime(event.timestamp)} />
          <MetaCard
            label="Person"
            value={event.person_id}
            mono
            href={`/dashboard/events?person=${event.person_id}`}
          />
          <MetaCard label="Session" value={event.session_id} mono />
          <MetaCard label="Source" value={event.source} />
          <MetaCard label="Event ID" value={event.event_id} mono />
        </div>

        {properties !== null && Object.keys(properties).length > 0 && (
          <div>
            <SectionLabel
              label="Properties"
              count={Object.keys(properties).length}
            />
            <div className="space-y-0.5">
              {Object.entries(properties).map(([key, value]) => (
                <InferredRow key={key} propKey={key} value={value} />
              ))}
            </div>
          </div>
        )}

        {properties !== null && Object.keys(properties).length === 0 && (
          <p className="text-xs text-foreground/40 px-2 py-1">
            <EmptyValue />
          </p>
        )}

        {properties === null && event.properties && (
          <p className="text-xs text-foreground/30 text-center py-4">
            Could not parse properties.
          </p>
        )}
      </div>
    </div>
  );
}