"use client";

import { useMemo, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useDashboardStore } from "@/lib/store/dashboard";
import { EventsChart } from "@/components/dashboard/events/events-chart";
import { EventsTable } from "@/components/dashboard/events/events-table";
import { EventsFilters } from "@/components/dashboard/events/events-filters";
import { EventsSearch } from "@/components/dashboard/events/events-search";
import { PersonDrawer } from "@/components/dashboard/events/person-drawer";
import { PropertyDrawer } from "@/components/dashboard/events/property-drawer";
import type { EventRow } from "@/components/dashboard/events/events-table";
import type { Filter } from "@/components/dashboard/events/filter-chips";
import { subDays, format } from "date-fns";
import { RefreshCw, X } from "lucide-react";

export default function EventsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const storeProjectId = useDashboardStore((s) => s.selectedProjectId);
  const storeDateRange = useDashboardStore((s) => s.dateRange);

  const { data: sites } = trpc.sites.list.useQuery();
  const firstSite = sites?.[0];

  const projectId = storeProjectId ?? firstSite?.id ?? "";

  const { data: schemas } = trpc.schemas.list.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  const [, setRefreshKey] = useState(0);

  const from = useMemo(
    () => format(subDays(new Date(), storeDateRange.days), "yyyy-MM-dd"),
    [storeDateRange.days],
  );
  const to = useMemo(() => new Date().toISOString(), []);

  const enabled = !!projectId;

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Filter[]>([]);
  const [selectedEventName, setSelectedEventName] = useState<string | null>(
    null,
  );
  const [drawerPersonId, setDrawerPersonId] = useState<string | null>(null);
  const [drawerEvent, setDrawerEvent] = useState<{
    eventName: string;
    properties: string;
  } | null>(null);
  const personFilter = searchParams.get("person") || undefined;

  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([
    undefined,
  ]);

  const currentCursor = cursorStack[cursorStack.length - 1];

  const granularity = storeDateRange.days <= 1 ? "hour" : "day";

  const distribution = trpc.events.distribution.useQuery(
    { projectId, from, to, granularity },
    { enabled },
  );

  const queryFilters = useMemo(() => {
    const result = filters.map((f) => ({
      field: f.field,
      fieldType: f.fieldType,
      operator: f.operator,
      value: f.value,
    }));
    if (selectedEventName) {
      result.push({
        field: "event_name",
        fieldType: "string" as const,
        operator: "equals" as const,
        value: selectedEventName,
      });
    }
    if (personFilter) {
      result.push({
        field: "person_id",
        fieldType: "string" as const,
        operator: "equals" as const,
        value: personFilter,
      });
    }
    return result.length > 0 ? result : undefined;
  }, [filters, selectedEventName, personFilter]);

  const eventList = trpc.events.list.useQuery(
    {
      projectId,
      from,
      to,
      cursor: currentCursor,
      limit: 25,
      searchQuery: searchQuery || undefined,
      filters: queryFilters,
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

  const handlePropertiesClick = useCallback(
    (event: { event_name: string; properties: string }) => {
      setDrawerEvent({
        eventName: event.event_name,
        properties: event.properties,
      });
    },
    [],
  );

  const handleEventClick = useCallback(
    (eventName: string, properties: string) => {
      setDrawerEvent({ eventName, properties });
    },
    [],
  );

  const handleEventRowClick = useCallback(
    (event: EventRow) => {
      router.push(`/dashboard/events/${event.event_id}`);
    },
    [router],
  );

  const handleViewAllEvents = useCallback(
    (personId: string) => {
      setCursorStack([undefined]);
      const params = new URLSearchParams(searchParams.toString());
      params.set("person", personId);
      router.push(`/dashboard/events?${params.toString()}`);
    },
    [router, searchParams],
  );

  const clearPersonFilter = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("person");
    router.push(
      `/dashboard/events${params.toString() ? `?${params.toString()}` : ""}`,
    );
  }, [router, searchParams]);

  const handleFiltersChange = useCallback((newFilters: Filter[]) => {
    setFilters(newFilters);
    setCursorStack([undefined]);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setCursorStack([undefined]);
  }, []);

  return (
    <Suspense fallback={null}>
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
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/35">
                  Event Feed
                </p>
                {personFilter && (
                  <button
                    onClick={clearPersonFilter}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono text-foreground/60 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Person: {personFilter.slice(0, 8)}&hellip;
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2 flex-wrap">
              <EventsSearch value={searchQuery} onChange={handleSearchChange} />
              <EventsFilters
                filters={filters}
                schemas={schemas ?? []}
                onFiltersChange={handleFiltersChange}
              />
            </div>

            <EventsTable
              events={events}
              loading={eventList.isLoading}
              hasMore={hasMore}
              onNext={handleNext}
              onPrev={handlePrev}
              onPersonClick={handlePersonClick}
              onPropertiesClick={handlePropertiesClick}
              onEventClick={handleEventRowClick}
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
            onEventClick={handleEventClick}
            onViewAllEvents={handleViewAllEvents}
          />
        )}

        {drawerEvent && (
          <PropertyDrawer
            projectId={projectId}
            eventName={drawerEvent.eventName}
            properties={drawerEvent.properties}
            open={!!drawerEvent}
            onOpenChange={(open) => {
              if (!open) setDrawerEvent(null);
            }}
          />
        )}
      </div>
    </Suspense>
  );
}
