"use client";

import { useState, useCallback, useId, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterChips } from "./filter-chips";
import type { Filter, FilterOperator } from "./filter-chips";
import { Plus, X } from "lucide-react";

interface EventSchema {
  eventName: string;
  propertiesSchema: unknown;
}

interface EventsFiltersProps {
  filters: Filter[];
  schemas: EventSchema[];
  onFiltersChange: (filters: Filter[]) => void;
}

type FieldDef = {
  key: string;
  label: string;
  type: "string" | "number" | "boolean";
};

type DraftRow = {
  id: string;
  field: string;
  fieldType: "string" | "number" | "boolean";
  operator: FilterOperator;
  value: string;
};

const STATIC_FIELDS: FieldDef[] = [
  { key: "event_name", label: "Event name", type: "string" },
  { key: "event_type", label: "Event type", type: "string" },
];

type OpOption = { value: FilterOperator; label: string };

const OPERATORS_BY_TYPE: Record<string, OpOption[]> = {
  string: [
    { value: "contains", label: "contains" },
    { value: "equals", label: "equals" },
    { value: "notEquals", label: "not equals" },
    { value: "startsWith", label: "starts with" },
    { value: "endsWith", label: "ends with" },
  ],
  number: [
    { value: "equals", label: "equals" },
    { value: "notEquals", label: "not equals" },
    { value: "gt", label: "greater than" },
    { value: "lt", label: "less than" },
  ],
  boolean: [
    { value: "isTrue", label: "is true" },
    { value: "isFalse", label: "is false" },
  ],
};

function defaultOperator(type: string): FilterOperator {
  return type === "boolean" ? "isTrue" : type === "number" ? "gt" : "contains";
}

function mergeSchemaProperties(schemas: EventSchema[]): FieldDef[] {
  const merged: Record<string, Set<string>> = {};
  for (const s of schemas) {
    if (s.propertiesSchema && typeof s.propertiesSchema === "object") {
      for (const [key, val] of Object.entries(
        s.propertiesSchema as Record<string, unknown>,
      )) {
        if (!merged[key]) merged[key] = new Set();
        const prop = val as { type?: string } | undefined;
        if (prop?.type) merged[key].add(prop.type);
      }
    }
  }
  return Object.entries(merged).map(([key, types]) => {
    let type: "string" | "number" | "boolean" = "string";
    if (types.has("boolean")) type = "boolean";
    else if (types.has("number")) type = "number";
    return { key, label: key, type };
  });
}

export function EventsFilters({
  filters,
  schemas,
  onFiltersChange,
}: EventsFiltersProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const genId = useId();

  const propertyFields = useMemo(
    () => mergeSchemaProperties(schemas),
    [schemas],
  );
  const allFields = useMemo(
    () => [...STATIC_FIELDS, ...propertyFields],
    [propertyFields],
  );
  const fieldMap = useMemo(
    () => new Map(allFields.map((f) => [f.key, f])),
    [allFields],
  );

  const [drafts, setDrafts] = useState<DraftRow[]>([]);

  const initFromFilters = useCallback(() => {
    setDrafts(
      filters.map((f) => ({
        id: f.id,
        field: f.field,
        fieldType: f.fieldType,
        operator: f.operator,
        value: f.value,
      })),
    );
  }, [filters]);

  const handleOpen = useCallback(
    (nowOpen: boolean) => {
      setOpen(nowOpen);
      if (nowOpen) initFromFilters();
    },
    [initFromFilters],
  );

  const addRow = useCallback(() => {
    const id = `${genId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setDrafts((prev) => {
      const firstField = allFields[0]!;
      return [
        ...prev,
        {
          id,
          field: firstField.key,
          fieldType: firstField.type,
          operator: defaultOperator(firstField.type),
          value: "",
        },
      ];
    });
  }, [allFields, genId]);

  const updateRow = useCallback(
    (id: string, patch: Partial<DraftRow>) => {
      setDrafts((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const updated = { ...r, ...patch };
          if (patch.field && patch.field !== r.field) {
            const def = fieldMap.get(patch.field);
            if (def) {
              updated.fieldType = def.type;
              updated.operator = defaultOperator(def.type);
              updated.value = "";
            }
          }
          return updated;
        }),
      );
    },
    [fieldMap],
  );

  const removeRow = useCallback((id: string) => {
    setDrafts((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleApply = useCallback(() => {
    const committed: Filter[] = drafts.map((d) => ({
      id: d.id,
      field: d.field,
      fieldType: d.fieldType,
      operator: d.operator,
      value: d.value,
    }));
    onFiltersChange(committed);
    setOpen(false);
  }, [drafts, onFiltersChange]);

  const handleClear = useCallback(() => {
    setDrafts([]);
    onFiltersChange([]);
    setOpen(false);
  }, [onFiltersChange]);

  const trigger = (
    <Button
      variant="outline"
      size="sm"
      className="h-9 rounded-2xl text-xs gap-1.5"
    >
      <FilterIcon />
      Filters
      {filters.length > 0 && (
        <span className="inline-flex items-center justify-center size-4 rounded-full bg-primary text-xs text-primary-foreground font-medium">
          {filters.length}
        </span>
      )}
    </Button>
  );

  const builderContent = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {drafts.length === 0 && (
          <p className="text-xs text-foreground/40 text-center py-4">
            No filters applied. Add one below.
          </p>
        )}
        {drafts.map((row) => {
          const operators =
            OPERATORS_BY_TYPE[row.fieldType] ?? OPERATORS_BY_TYPE.string!;
          const needsValue =
            row.operator !== "isTrue" && row.operator !== "isFalse";

          return (
            <div
              key={row.id}
              className="flex flex-col gap-1.5 sm:flex-row sm:items-center"
            >
              <div className="w-full sm:flex-1 sm:min-w-0">
                <Select
                  value={row.field}
                  onValueChange={(v) =>
                    updateRow(row.id, { field: v as string })
                  }
                >
                  <SelectTrigger className="h-8 w-full text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="event_name" className="text-xs">
                      Event name
                    </SelectItem>
                    <SelectItem value="event_type" className="text-xs">
                      Event type
                    </SelectItem>
                    {propertyFields.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground/40">
                          Properties
                        </div>
                        {propertyFields.map((pf) => (
                          <SelectItem
                            key={pf.key}
                            value={pf.key}
                            className="text-xs"
                          >
                            {pf.label}
                            <span className="ml-1 text-xs text-foreground/30">
                              {pf.type}
                            </span>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <div className="flex-1 sm:w-28 sm:shrink-0">
                  <Select
                    value={row.operator}
                    onValueChange={(v) =>
                      updateRow(row.id, { operator: v as FilterOperator })
                    }
                  >
                    <SelectTrigger className="h-8 w-full text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {operators.map((op) => (
                        <SelectItem
                          key={op.value}
                          value={op.value}
                          className="text-xs"
                        >
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {needsValue && (
                  <div className="flex-1 sm:flex-initial">
                    <Input
                      type={row.fieldType === "number" ? "number" : "text"}
                      value={row.value}
                      onChange={(e) =>
                        updateRow(row.id, { value: e.target.value })
                      }
                      placeholder={
                        row.fieldType === "number" ? "0" : "value..."
                      }
                      className="h-8 w-full rounded-xl text-xs"
                    />
                  </div>
                )}

                <button
                  onClick={() => removeRow(row.id)}
                  className="size-7 shrink-0 flex items-center justify-center rounded-xl text-foreground/30 hover:text-foreground hover:bg-accent transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={addRow}
        className="inline-flex items-center gap-1.5 text-xs text-foreground/40 hover:text-foreground transition-colors self-start"
      >
        <Plus size={14} />
        Add filter
      </button>

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Button
          size="sm"
          className="h-8 rounded-xl text-xs flex-1"
          onClick={handleApply}
          disabled={drafts.length === 0}
        >
          Apply
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-xl text-xs text-foreground/40"
          onClick={handleClear}
        >
          Clear all
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex items-center gap-2">
      {filters.length > 0 && (
        <FilterChips
          filters={filters}
          onRemove={(id) => onFiltersChange(filters.filter((f) => f.id !== id))}
        />
      )}

      {isMobile ? (
        <Sheet open={open} onOpenChange={handleOpen}>
          <SheetTrigger asChild>{trigger}</SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-xl max-h-[80vh] overflow-y-auto"
          >
            <SheetHeader>
              <SheetTitle className="text-sm font-medium">Filters</SheetTitle>
            </SheetHeader>
            <div className="px-6 pb-6 pt-2">{builderContent}</div>
          </SheetContent>
        </Sheet>
      ) : (
        <Popover open={open} onOpenChange={handleOpen}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-120 p-4 rounded-2xl"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/35 mb-3">
              Filters
            </div>
            {builderContent}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function FilterIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-foreground/50"
    >
      <path d="M3 6h18" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  );
}
