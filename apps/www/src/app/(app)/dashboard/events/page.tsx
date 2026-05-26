"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useDashboardStore } from "@/lib/store/dashboard";
import { EventTypeCatalog } from "@/components/dashboard/event-type-catalog";
import { EventsActivityChart } from "@/components/dashboard/events-activity-chart";
import {
  EventsTable,
  type EventFeedItem,
} from "@/components/dashboard/events-table";
import { EventDetailDrawer } from "@/components/dashboard/event-detail-drawer";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { X, Search, Plus } from "lucide-react";
import { subDays, format } from "date-fns";

interface PropertyFilter {
  path: string;
  type: "string" | "number" | "boolean";
  operator: "eq" | "neq" | "gt" | "lt" | "contains";
  value: string;
}

interface ActiveFilters {
  eventName: string | null;
  date: string | null;
  properties: PropertyFilter[];
}

const EMPTY_FILTERS: ActiveFilters = {
  eventName: null,
  date: null,
  properties: [],
};

const STRING_OPS = ["eq", "neq", "contains"] as const;
const NUMBER_OPS = ["eq", "neq", "gt", "lt"] as const;
const BOOLEAN_OPS = ["eq", "neq"] as const;

function opsForType(type: PropertyFilter["type"]) {
  if (type === "number") return NUMBER_OPS;
  if (type === "boolean") return BOOLEAN_OPS;
  return STRING_OPS;
}

// ─── Add Filter Popover ───────────────────────────────────────────────────────

function AddFilterPopover({ onAdd }: { onAdd: (f: PropertyFilter) => void }) {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState("");
  const [type, setType] = useState<PropertyFilter["type"]>("string");
  const [operator, setOp] = useState<PropertyFilter["operator"]>("eq");
  const [value, setValue] = useState("");

  const ops = opsForType(type);

  const handleTypeChange = (t: PropertyFilter["type"]) => {
    setType(t);
    // reset operator if incompatible
    if (!opsForType(t).includes(operator as never)) setOp(opsForType(t)[0]);
  };

  const handleApply = () => {
    if (!path.trim() || !value.trim()) return;
    onAdd({ path: path.trim(), type, operator, value: value.trim() });
    setPath("");
    setValue("");
    setType("string");
    setOp("eq");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs text-foreground/50 gap-1.5"
        >
          <Plus size={11} strokeWidth={2} />
          Add filter
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-4 flex flex-col gap-3 bg-popover border-white/8"
      >
        <p className="text-xs font-semibold text-foreground/60">
          Property filter
        </p>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] text-foreground/40">
            Property path
          </Label>
          <Input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="e.g. plan or user.role"
            className="h-7 text-xs font-mono bg-white/3 border-white/6 placeholder:text-foreground/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] text-foreground/40">Type</Label>
            <Select
              value={type}
              onValueChange={(v) =>
                handleTypeChange(v as PropertyFilter["type"])
              }
            >
              <SelectTrigger className="h-7 text-xs bg-white/3 border-white/6">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string" className="text-xs">
                  string
                </SelectItem>
                <SelectItem value="number" className="text-xs">
                  number
                </SelectItem>
                <SelectItem value="boolean" className="text-xs">
                  boolean
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] text-foreground/40">Operator</Label>
            <Select
              value={operator}
              onValueChange={(v) => setOp(v as PropertyFilter["operator"])}
            >
              <SelectTrigger className="h-7 text-xs bg-white/3 border-white/6">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ops.map((op) => (
                  <SelectItem key={op} value={op} className="text-xs">
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] text-foreground/40">Value</Label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
            placeholder={type === "boolean" ? "true / false" : "value"}
            className="h-7 text-xs bg-white/3 border-white/6 placeholder:text-foreground/20"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-foreground/40"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={!path.trim() || !value.trim()}
            onClick={handleApply}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/6 border border-white/8 text-foreground/60 px-2.5 py-1 text-[11px] font-medium">
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 text-foreground/30 hover:text-foreground/70 transition-colors"
      >
        <X size={10} strokeWidth={2.5} />
      </button>
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const projectId = useDashboardStore((s) => s.selectedProjectId) ?? "";
  const dateRange = useDashboardStore((s) => s.dateRange);

  const from = useMemo(
    () => format(subDays(new Date(), dateRange.days), "yyyy-MM-dd"),
    [dateRange.days],
  );
  const to = useMemo(() => new Date().toISOString(), []);

  // ── Filter state ──
  const [filters, setFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedEventName, setSelectedEventName] = useState<string | null>(
    null,
  );

  const hasFilters =
    filters.eventName || filters.date || filters.properties.length > 0;

  const clearAll = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setSearch("");
    setPage(1);
  }, []);

  const removeFilter = useCallback(
    (key: keyof ActiveFilters, index?: number) => {
      setFilters((prev) => {
        if (key === "properties" && index !== undefined) {
          return {
            ...prev,
            properties: prev.properties.filter((_, i) => i !== index),
          };
        }
        return { ...prev, [key]: null };
      });
      setPage(1);
    },
    [],
  );

  const addPropertyFilter = useCallback((f: PropertyFilter) => {
    setFilters((prev) => ({ ...prev, properties: [...prev.properties, f] }));
    setPage(1);
  }, []);

  // Chart bar click → date filter only
  const handleBarClick = useCallback((_eventName: string, date: string) => {
    setFilters((prev) => ({ ...prev, date }));
    setPage(1);
  }, []);

  // Table event name click → toggle event name filter
  const handleEventNameClick = useCallback((name: string) => {
    setFilters((prev) => ({
      ...prev,
      eventName: prev.eventName === name ? null : name,
    }));
    setPage(1);
  }, []);

  // ── Queries ──
  const enabled = !!projectId;

  const timeseries = trpc.analytics.eventsTimeseries.useQuery(
    {
      projectId,
      from,
      to,
      granularity: "day",
      eventName: selectedEventName ?? undefined,
    },
    { enabled },
  );

  const feed = trpc.analytics.eventFeed.useQuery(
    {
      projectId,
      from,
      to,
      page,
      eventName: selectedEventName ?? undefined,
      date: filters.date ?? undefined,
      search: search || undefined,
      properties: filters.properties.length ? filters.properties : undefined,
    },
    { enabled },
  );

  const eventTypes = trpc.analytics.eventTypes.useQuery(
    { projectId, from, to },
    { enabled, staleTime: 5 * 60 * 1000 },
  );

  const router = useRouter();

  // ── Drawer state ──
  const [eventDetailTarget, setEventDetailTarget] =
    useState<EventFeedItem | null>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);

  const handleVisitorClick = useCallback(
    (visitorId: string) => {
      router.push(`/dashboard/events/person/${visitorId}`);
    },
    [router],
  );

  const handleEventTypeSelect = useCallback((name: string | null) => {
    setSelectedEventName(name);
    setPage(1);
  }, []);

  const handlePropertiesClick = useCallback((ev: EventFeedItem) => {
    setEventDetailTarget(ev);
    setEventDetailOpen(true);
  }, []);

  return (
    <div className="flex flex-col w-full min-h-0">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 pt-5 pb-4 border-b border-white/5">
        <div className="min-w-0">
          <h1 className="text-2xl font-light tracking-tight text-foreground leading-none">
            Events
          </h1>
          <p className="mt-1 text-xs text-foreground/30 truncate">
            Custom events · {dateRange.label}
          </p>
        </div>
        {(eventTypes.data?.totalVolume ?? 0) > 0 && (
          <Badge
            variant="secondary"
            className="tabular-nums text-xs shrink-0 bg-white/5 text-foreground/50 border-transparent"
          >
            {eventTypes.data!.totalVolume.toLocaleString()} event
            {eventTypes.data!.totalVolume !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search
              size={12}
              strokeWidth={1.5}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/25 pointer-events-none"
            />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search events…"
              className="pl-7 h-8 text-xs bg-transparent border-white/8 placeholder:text-foreground/20"
            />
          </div>
          <AddFilterPopover onAdd={addPropertyFilter} />
        </div>

        {/* active filter chips */}
        {hasFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-foreground/25">Filters:</span>

            {filters.eventName && (
              <FilterChip
                label={`event = ${filters.eventName}`}
                onRemove={() => removeFilter("eventName")}
              />
            )}
            {filters.date && (
              <FilterChip
                label={`date = ${filters.date}`}
                onRemove={() => removeFilter("date")}
              />
            )}
            {filters.properties.map((f, i) => (
              <FilterChip
                key={i}
                label={`${f.path} ${f.operator} ${f.value}`}
                onRemove={() => removeFilter("properties", i)}
              />
            ))}

            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-foreground/30 hover:text-foreground/60"
              onClick={clearAll}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex flex-col gap-4 px-4 sm:px-6 pb-8">
        <EventTypeCatalog
          data={eventTypes.data?.eventTypes ?? []}
          loading={eventTypes.isLoading}
          error={eventTypes.isError}
          onRetry={() => eventTypes.refetch()}
          selectedEventName={selectedEventName}
          onSelect={handleEventTypeSelect}
        />

        <EventsActivityChart
          data={timeseries.data ?? []}
          loading={timeseries.isLoading}
          onBarClick={handleBarClick}
        />

        <EventsTable
          events={feed.data?.events ?? []}
          loading={feed.isLoading}
          error={feed.isError}
          onRetry={() => feed.refetch()}
          total={feed.data?.total ?? 0}
          page={page}
          totalPages={feed.data?.totalPages ?? 1}
          onPageChange={setPage}
          onEventNameClick={handleEventNameClick}
          onVisitorClick={handleVisitorClick}
          onPropertiesClick={handlePropertiesClick}
          activeEventName={filters.eventName}
        />
      </div>

      {/* ── Drawers ── */}
      <EventDetailDrawer
        event={eventDetailTarget}
        open={eventDetailOpen}
        onOpenChange={setEventDetailOpen}
        projectId={projectId}
        from={from}
        to={to}
      />

    </div>
  );
}
