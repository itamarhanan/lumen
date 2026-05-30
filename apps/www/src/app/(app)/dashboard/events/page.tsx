"use client";

import { useMemo, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { useDashboardStore } from "@/lib/store/dashboard";
import { EventsChart } from "@/components/dashboard/events/events-chart";
import { EventsTable } from "@/components/dashboard/events/events-table";
import { EventsFilters } from "@/components/dashboard/events/events-filters";
import { PersonDrawer } from "@/components/dashboard/events/person-drawer";
import { subDays, format } from "date-fns";
import { RefreshCw } from "lucide-react";

export default function EventsPage() {
  const storeProjectId = useDashboardStore((s) => s.selectedProjectId);
  const storeDateRange = useDashboardStore((s) => s.dateRange);

  const { data: sites } = trpc.sites.list.useQuery();
  const firstSite = sites?.[0];

  const projectId = storeProjectId ?? firstSite?.id ?? "";

  const [refreshKey, setRefreshKey] = useState(0);

  const from = useMemo(
    () => format(subDays(new Date(), storeDateRange.days), "yyyy-MM-dd"),
    [storeDateRange.days],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const to = useMemo(() => new Date().toISOString(), [refreshKey]);

  const enabled = !!projectId;

  const [eventNameFilter, setEventNameFilter] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [propKey, setPropKey] = useState("");
  const [propValue, setPropValue] = useState("");
  const [selectedEventName, setSelectedEventName] = useState<string | null>(null);
  const [drawerPersonId, setDrawerPersonId] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([undefined]);

  const granularity = storeDateRange.days <= 1 ? "hour" : "day";

  const distribution = trpc.events.distribution.useQuery(
    { projectId, from, to, granularity },
    { enabled },
  );

  const currentCursor = cursorStack[cursorStack.length - 1];

  const propertyFilters =
    propKey && propValue ? [{ key: propKey, value: propValue }] : undefined;

  const eventList = trpc.events.list.useQuery(
    {
      projectId,
      from,
      to,
      cursor: currentCursor,
      limit: 25,
      eventType: eventTypeFilter !== "all" ? eventTypeFilter : undefined,
      eventName: eventNameFilter || selectedEventName || undefined,
      propertyFilters,
    },
    { enabled },
  );

  const events = eventList.data?.events ?? [];
  const hasMore = !!eventList.data?.nextCursor;

  const handleNext = useCallback(() => {
    const nc = eventList.data?.nextCursor;
    if (nc) {
      setCursorStack((prev) => [...prev, nc]);
    }
  }, [eventList.data?.nextCursor]);

  const handlePrev = useCallback(() => {
    setCursorStack((prev) => prev.slice(0, -1));
  }, []);

  const handleChartSegmentClick = useCallback((eventName: string | null) => {
    setSelectedEventName(eventName);
    setCursorStack([undefined]);
  }, []);

  const handlePersonClick = useCallback((personId: string) => {
    setDrawerPersonId(personId);
  }, []);

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between gap-4 px-4 pt-5 pb-3 sm:px-6 border-b border-border dark:border-[oklch(0.15_0_0)]">
        <div className="min-w-0">
          <h1 className="text-2xl font-light tracking-tight text-foreground leading-none">
            Events
          </h1>
          <p className="mt-1 text-xs text-foreground/30 truncate">
            Raw event feed &middot; {storeDateRange.label}
          </p>
        </div>
        <button
          onClick={() => {
            setRefreshKey((k) => k + 1);
          }}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-foreground/40 hover:text-foreground hover:bg-accent dark:hover:bg-white/5 transition-colors"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col gap-6 px-4 py-6 sm:px-6">
        <EventsChart
          data={distribution.data ?? []}
          loading={distribution.isLoading}
          onSegmentClick={handleChartSegmentClick}
        />

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/35">
              Event Feed
            </p>
            <EventsFilters
              eventName={eventNameFilter}
              onEventNameChange={(v) => {
                setEventNameFilter(v);
                setCursorStack([undefined]);
              }}
              eventType={eventTypeFilter}
              onEventTypeChange={(v) => {
                setEventTypeFilter(v);
                setCursorStack([undefined]);
              }}
              propKey={propKey}
              onPropKeyChange={setPropKey}
              propValue={propValue}
              onPropValueChange={setPropValue}
            />
          </div>

          <EventsTable
            events={events}
            loading={eventList.isLoading}
            hasMore={hasMore}
            onNext={handleNext}
            onPrev={handlePrev}
            onPersonClick={handlePersonClick}
          />
        </div>
      </div>

      {drawerPersonId && (
        <PersonDrawer
          projectId={projectId}
          personId={drawerPersonId}
          open={!!drawerPersonId}
          onOpenChange={(open) => {
            if (!open) setDrawerPersonId(null);
          }}
        />
      )}
    </div>
  );
}
