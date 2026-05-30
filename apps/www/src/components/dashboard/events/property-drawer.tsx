"use client";

import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, Braces, AlertCircle } from "lucide-react";
import {
  type PropSchema,
  type PropsSchema,
  depthBorder,
  inferType,
  TypeTag,
  ScalarValue,
  MissingBadge,
  ArrayContent,
  InferredRow,
  SectionLabel,
} from "./property-inspector";

interface PropertyDrawerProps {
  projectId: string;
  eventName: string;
  properties: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SchemaPropRow({
  propKey,
  schema,
  value,
  depth = 0,
}: {
  propKey: string;
  schema: PropSchema;
  value: unknown;
  depth?: number;
}) {
  const isObject =
    schema.type === "object" &&
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value);
  const isArr = schema.type === "array" && Array.isArray(value);
  const isMissing = schema.required && (value === undefined || value === null);
  const isExpandable = isObject || (isArr && (value as unknown[]).length > 0);

  const [expanded, setExpanded] = useState(depth < 1);

  const subEntries = isObject
    ? Object.entries(value as Record<string, unknown>)
    : [];
  const schemaSubKeys = schema.properties ? Object.keys(schema.properties) : [];
  const hasSubSchema = schemaSubKeys.length > 0;

  return (
    <div
      className={cn(
        "group rounded-lg border-l-2 transition-colors",
        isMissing
          ? "bg-rose-500/5 border-rose-500/20"
          : "border-transparent hover:border-foreground/10 hover:bg-white/6",
      )}
    >
      <div className="flex items-center justify-between gap-2 pr-2 py-2 min-w-0">
        {isExpandable ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-foreground/30 hover:text-foreground transition-colors cursor-pointer shrink-0"
          >
            {expanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
        ) : (
          <span className="size-3.5 shrink-0" />
        )}

        <span className="text-xs font-semibold text-foreground/80 whitespace-nowrap font-mono shrink-0">
          {propKey}
          {schema.required && (
            <span className="text-rose-400 ml-0.5 font-medium">*</span>
          )}
        </span>

        <TypeTag type={schema.type} />

        {schema.description && (
          <span className="text-xs text-foreground/25 font-sans truncate min-w-0 flex-1">
            {schema.description}
          </span>
        )}

        <div className="ml-auto shrink-0 pl-2">
          {isMissing ? (
            <MissingBadge />
          ) : !isExpandable ? (
            <ScalarValue value={value} type={schema.type} />
          ) : null}
        </div>
      </div>

      {isExpandable && expanded && (
        <div className={cn("ml-6 pl-3 pb-1.5 border-l-2", depthBorder(depth))}>
          {isObject ? (
            hasSubSchema ? (
              <>
                {schemaSubKeys.map((subKey) => (
                  <SchemaPropRow
                    key={subKey}
                    propKey={subKey}
                    schema={schema.properties![subKey]!}
                    value={(value as Record<string, unknown>)[subKey]}
                    depth={depth + 1}
                  />
                ))}
                {subEntries
                  .filter(([k]) => !schemaSubKeys.includes(k))
                  .map(([k, v]) => (
                    <InferredRow
                      key={k}
                      propKey={k}
                      value={v}
                      depth={depth + 1}
                    />
                  ))}
              </>
            ) : (
              subEntries.map(([k, v]) => (
                <InferredRow key={k} propKey={k} value={v} depth={depth + 1} />
              ))
            )
          ) : (
            <ArrayContent value={value as unknown[]} depth={depth} />
          )}
        </div>
      )}
    </div>
  );
}

function RawKeyValueList({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  return (
    <div className="space-y-0.5">
      <SectionLabel label="Properties" count={entries.length} />
      {entries.map(([k, v]) => (
        <SchemaPropRow
          key={k}
          propKey={k}
          schema={{ type: inferType(v) as PropSchema["type"] }}
          value={v}
        />
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-1">
      <div className="h-3 w-28 mb-3 animate-pulse rounded bg-white/5" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-2">
          <div className="size-3.5 shrink-0" />
          <div className="h-2.5 w-14 animate-pulse rounded bg-white/5" />
          <div className="h-4 w-10 animate-pulse rounded-md bg-white/8" />
          <div className="h-2.5 w-20 animate-pulse rounded bg-white/5 ml-auto" />
        </div>
      ))}
    </div>
  );
}

export function PropertyDrawer({
  projectId,
  eventName,
  properties: rawProperties,
  open,
  onOpenChange,
}: PropertyDrawerProps) {
  const { data: schemaData, isLoading: schemaLoading } =
    trpc.schemas.getByName.useQuery(
      { projectId, eventName },
      { enabled: open },
    );

  const parsed = useMemo(() => {
    try {
      return JSON.parse(rawProperties) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [rawProperties]);

  const schema = schemaData?.propertiesSchema as PropsSchema | null;

  const schemaKeys = useMemo(
    () => (schema ? new Set(Object.keys(schema)) : null),
    [schema],
  );

  const unknownKeys = useMemo(() => {
    if (!parsed || !schemaKeys) return [];
    return Object.keys(parsed).filter((k) => !schemaKeys.has(k));
  }, [parsed, schemaKeys]);

  const schemaEntries = schema ? Object.entries(schema) : [];
  const missingCount = schemaEntries.filter(
    ([k, s]) =>
      s.required && (parsed?.[k] === undefined || parsed?.[k] === null),
  ).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="px-4 pt-6 pb-3">
          <SheetTitle className="text-sm font-semibold flex items-center gap-2">
            <Braces className="size-4 text-foreground/40" />
            {eventName}
            {missingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-mono text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/20 px-1.5 py-0.5 rounded-md">
                <AlertCircle className="size-2.5" />
                {missingCount} missing
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="text-xs text-foreground/40">
            Event properties
            {schema && (
              <span className="ml-1.5 text-foreground/25">
                · {schemaEntries.length} defined
                {unknownKeys.length > 0 && `, ${unknownKeys.length} extra`}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6 mt-6 space-y-6">
          {schemaLoading ? (
            <LoadingSkeleton />
          ) : parsed === null ? (
            <p className="text-xs text-foreground/30 text-center py-8">
              Could not parse properties for this event.
            </p>
          ) : schema ? (
            <>
              <div className="space-y-0.5">
                <SectionLabel
                  label="Schema properties"
                  count={schemaEntries.length}
                />
                {schemaEntries.map(([key, propSchema]) => (
                  <SchemaPropRow
                    key={key}
                    propKey={key}
                    schema={propSchema}
                    value={parsed[key]}
                  />
                ))}
              </div>

              {unknownKeys.length > 0 && (
                <div className="space-y-0.5">
                  <SectionLabel
                    label="Additional properties"
                    count={unknownKeys.length}
                  />
                  {unknownKeys.map((k) => (
                    <SchemaPropRow
                      key={k}
                      propKey={k}
                      schema={{
                        type: inferType(parsed[k]) as PropSchema["type"],
                      }}
                      value={parsed[k]}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <RawKeyValueList data={parsed} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
