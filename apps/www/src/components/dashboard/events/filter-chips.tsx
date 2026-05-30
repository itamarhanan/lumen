"use client";

import { X } from "lucide-react";

export type FilterOperator =
  | "equals" | "notEquals" | "contains" | "startsWith" | "endsWith"
  | "gt" | "lt" | "isTrue" | "isFalse";

export interface Filter {
  id: string;
  field: string;
  fieldType: "string" | "number" | "boolean";
  operator: FilterOperator;
  value: string;
}

interface FilterChipsProps {
  filters: Filter[];
  onRemove: (id: string) => void;
}

const operatorLabels: Record<string, string> = {
  equals: "=",
  notEquals: "≠",
  contains: "contains",
  startsWith: "starts with",
  endsWith: "ends with",
  gt: ">",
  lt: "<",
  isTrue: "is true",
  isFalse: "is false",
};

function filterLabel(f: Filter): string {
  const op = operatorLabels[f.operator] ?? f.operator;
  if (f.operator === "isTrue" || f.operator === "isFalse") {
    return `${f.field} ${op}`;
  }
  return `${f.field} ${op} ${f.value}`;
}

export function FilterChips({ filters, onRemove }: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.map((f) => (
        <span
          key={f.id}
          className="inline-flex items-center gap-1 rounded-4xl border border-border bg-input/30 px-2.5 py-1 text-xs text-foreground/70"
        >
          {filterLabel(f)}
          <button
            onClick={() => onRemove(f.id)}
            className="hover:text-foreground transition-colors"
          >
            <X size={12} />
          </button>
        </span>
      ))}
    </div>
  );
}
