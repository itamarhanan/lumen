"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronDown,
  Braces,
  Type,
  Hash,
  ToggleLeft,
  Calendar,
  List,
  AlertCircle,
} from "lucide-react";

export interface PropSchema {
  type: "string" | "number" | "boolean" | "date" | "object" | "array";
  required?: boolean;
  description?: string;
  properties?: Record<string, PropSchema>;
}

export type PropsSchema = Record<string, PropSchema>;

const TYPE_META: Record<
  string,
  { icon: React.ReactNode; label: string; classes: string }
> = {
  string: {
    icon: <Type className="size-3" />,
    label: "string",
    classes: "text-sky-400 bg-sky-500/15 ring-1 ring-sky-500/20",
  },
  number: {
    icon: <Hash className="size-3" />,
    label: "number",
    classes: "text-emerald-400 bg-emerald-500/15 ring-1 ring-emerald-500/20",
  },
  boolean: {
    icon: <ToggleLeft className="size-3" />,
    label: "bool",
    classes: "text-amber-400 bg-amber-500/15 ring-1 ring-amber-500/20",
  },
  date: {
    icon: <Calendar className="size-3" />,
    label: "date",
    classes: "text-cyan-400 bg-cyan-500/15 ring-1 ring-cyan-500/20",
  },
  object: {
    icon: <Braces className="size-3" />,
    label: "object",
    classes: "text-violet-400 bg-violet-500/15 ring-1 ring-violet-500/20",
  },
  array: {
    icon: <List className="size-3" />,
    label: "array",
    classes: "text-blue-400 bg-blue-500/15 ring-1 ring-blue-500/20",
  },
  null: {
    icon: null,
    label: "null",
    classes: "text-foreground/30 bg-muted ring-1 ring-border/40",
  },
};

const VALUE_COLORS: Record<string, string> = {
  string: "text-foreground/80",
  number: "text-emerald-400 tabular-nums",
  boolean: "",
  date: "text-cyan-400 tabular-nums",
  object: "text-foreground",
  array: "text-foreground",
};

const DEPTH_BORDER = [
  "border-violet-500/30",
  "border-sky-500/25",
  "border-emerald-500/25",
  "border-amber-500/20",
];

export function depthBorder(depth: number) {
  return DEPTH_BORDER[depth % DEPTH_BORDER.length];
}

export function inferType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function SectionLabel({
  label,
  count,
}: {
  label: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 pb-2">
      <span className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/30">
        {label}
      </span>
      {count !== undefined && (
        <span className="text-xs font-mono text-foreground/20 tabular-nums">
          {count}
        </span>
      )}
    </div>
  );
}

function ObjectPreview({ value }: { value: Record<string, unknown> }) {
  const keys = Object.keys(value).slice(0, 4);
  const overflow = Object.keys(value).length - keys.length;
  return (
    <span className="text-xs font-mono text-foreground/35 truncate">
      {"{ "}
      {keys.map((k, i) => (
        <span key={k}>
          <span className="text-foreground/50">{k}</span>
          {i < keys.length - 1 && (
            <span className="text-foreground/20">, </span>
          )}
        </span>
      ))}
      {overflow > 0 && <span className="text-foreground/25"> +{overflow}</span>}
      {" }"}
    </span>
  );
}

function ArrayPreview({ value }: { value: unknown[] }) {
  if (value.length === 0)
    return (
      <span className="text-foreground/25 italic text-xs font-mono">empty</span>
    );
  const first = value[0];
  const preview =
    typeof first === "object" && first !== null
      ? `{…}`
      : String(formatValue(first)).slice(0, 24);
  return (
    <span className="text-xs font-mono text-foreground/35 truncate">
      [{value.length}]{" "}
      <span className="text-foreground/25">
        {preview}
        {value.length > 1 ? ", …" : ""}
      </span>
    </span>
  );
}

export function TypeTag({ type }: { type: string }) {
  const meta = TYPE_META[type] ?? TYPE_META["null"]!;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-mono font-medium leading-none shrink-0",
        meta.classes,
      )}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}

function BoolValue({ value }: { value: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-mono font-semibold uppercase tracking-wide",
        value ? "text-emerald-400" : "text-foreground/30",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          value ? "bg-emerald-400" : "bg-foreground/20",
        )}
      />
      {String(value)}
    </span>
  );
}

export function EmptyValue() {
  return <span className="text-foreground/20 italic text-xs font-mono">—</span>;
}

export function ScalarValue({ value, type }: { value: unknown; type: string }) {
  if (value === null || value === undefined) return <EmptyValue />;
  if (type === "boolean" && typeof value === "boolean")
    return <BoolValue value={value} />;
  const color = VALUE_COLORS[type] ?? "text-foreground";
  return (
    <span className={cn("text-xs truncate block font-mono", color)}>
      {formatValue(value)}
    </span>
  );
}

export function MissingBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-mono text-rose-400/80 bg-rose-500/10 ring-1 ring-rose-500/20 px-1.5 py-0.5 rounded-md leading-none">
      <AlertCircle className="size-2.5" />
      missing
    </span>
  );
}

function ObjectContent({
  value,
  depth = 0,
}: {
  value: Record<string, unknown>;
  depth?: number;
}) {
  const [open, setOpen] = useState(depth < 1);
  const entries = Object.entries(value);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-foreground/40 hover:text-foreground transition-colors cursor-pointer"
      >
        {open ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRight className="size-3.5" />
        )}
        {open ? (
          <span className="text-xs font-mono text-foreground/30">
            {`{${entries.length}}`}
          </span>
        ) : (
          <ObjectPreview value={value} />
        )}
      </button>
      {open && (
        <div className={cn("mt-1 ml-2 pl-2 border-l-2", depthBorder(depth))}>
          {entries.map(([k, v]) => (
            <InferredRow key={k} propKey={k} value={v} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ArrayContent({
  value,
  depth = 0,
}: {
  value: unknown[];
  depth?: number;
}) {
  const [open, setOpen] = useState(false);

  if (value.length === 0) {
    return (
      <span className="text-foreground/20 italic text-xs font-mono">empty</span>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-foreground/40 hover:text-foreground transition-colors cursor-pointer"
      >
        {open ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRight className="size-3.5" />
        )}
        {open ? (
          <span className="text-xs font-mono text-foreground/30">
            [{value.length}]
          </span>
        ) : (
          <ArrayPreview value={value} />
        )}
      </button>
      {open && (
        <div
          className={cn(
            "mt-1 ml-2 pl-2 border-l-2 space-y-0.5",
            depthBorder(depth),
          )}
        >
          {value.map((item, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-xs font-mono text-foreground/20 shrink-0 mt-0.5 leading-none w-4 text-right">
                {i}
              </span>
              <div className="min-w-0 flex-1">
                {typeof item === "object" && item !== null ? (
                  <ObjectContent
                    value={item as Record<string, unknown>}
                    depth={depth + 1}
                  />
                ) : (
                  <span className="text-xs text-foreground/60 font-mono truncate block leading-snug">
                    {formatValue(item)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function InferredRow({
  propKey,
  value,
  depth = 0,
}: {
  propKey: string;
  value: unknown;
  depth?: number;
}) {
  const type = inferType(value);
  const isObj =
    typeof value === "object" && value !== null && !Array.isArray(value);
  const isArr = Array.isArray(value);

  return (
    <div className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white/4 transition-colors">
      <span className="text-xs font-semibold text-foreground/70 whitespace-nowrap font-mono pt-px">
        {propKey}
      </span>
      <TypeTag type={type} />
      <div className="min-w-0 flex-1 pt-px">
        {isObj ? (
          <ObjectContent
            value={value as Record<string, unknown>}
            depth={depth}
          />
        ) : isArr ? (
          <ArrayContent value={value as unknown[]} depth={depth} />
        ) : (
          <span className="text-xs text-foreground/60 font-mono truncate block leading-snug text-right">
            {formatValue(value)}
          </span>
        )}
      </div>
    </div>
  );
}
