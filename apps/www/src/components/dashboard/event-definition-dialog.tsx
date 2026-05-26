"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Plus, Trash2 } from "lucide-react";

const PALETTE = [
  "#7C6AF7",
  "#4EADFF",
  "#F97B6B",
  "#4FD1A0",
  "#F6AD55",
  "#A78BFA",
  "#F472B6",
  "#34D399",
];

interface PropertyRow {
  key: string;
  type: "string" | "number" | "boolean";
  description: string;
}

interface EventDefinitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventName: string;
  projectId: string;
  initialDescription?: string | null;
  initialColor?: string | null;
  initialSchema?: Record<string, { type: string; description?: string }> | null;
}

export function EventDefinitionDialog({
  open,
  onOpenChange,
  eventName,
  projectId,
  initialDescription,
  initialColor,
  initialSchema,
}: EventDefinitionDialogProps) {
  const [description, setDescription] = useState(initialDescription ?? "");
  const [color, setColor] = useState(initialColor ?? "");
  const [props, setProps] = useState<PropertyRow[]>(() =>
    initialSchema
      ? Object.entries(initialSchema).map(([key, val]) => ({
          key,
          type: val.type as PropertyRow["type"],
          description: val.description ?? "",
        }))
      : [],
  );

  const utils = trpc.useUtils();

  const upsert = trpc.eventDefinitions.upsert.useMutation({
    onSuccess: () => {
      utils.analytics.eventTypes.invalidate();
      utils.eventDefinitions.list.invalidate();
      onOpenChange(false);
    },
  });

  const remove = trpc.eventDefinitions.delete.useMutation({
    onSuccess: () => {
      utils.analytics.eventTypes.invalidate();
      utils.eventDefinitions.list.invalidate();
      onOpenChange(false);
    },
  });

  const addRow = () => {
    setProps((prev) => [...prev, { key: "", type: "string", description: "" }]);
  };

  const updateRow = (i: number, field: keyof PropertyRow, value: string) => {
    setProps((prev) => {
      const next = [...prev];
      next[i] = { ...next[i]!, [field]: value };
      return next;
    });
  };

  const removeRow = (i: number) => {
    setProps((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = () => {
    const schema: Record<string, { type: "string" | "number" | "boolean"; description?: string }> = {};
    for (const row of props) {
      if (row.key.trim()) {
        schema[row.key.trim()] = {
          type: row.type,
          ...(row.description ? { description: row.description } : {}),
        };
      }
    }
    upsert.mutate({
      projectId,
      eventName,
      description: description || null,
      color: color || null,
      propertySchema: Object.keys(schema).length > 0 ? schema : null,
    });
  };

  const handleDelete = () => {
    remove.mutate({ projectId, eventName });
  };

  const hasUnsaved = description !== (initialDescription ?? "")
    || color !== (initialColor ?? "")
    || JSON.stringify(props) !== JSON.stringify(
      initialSchema
        ? Object.entries(initialSchema).map(([key, val]) => ({
            key,
            type: val.type,
            description: val.description ?? "",
          }))
        : [],
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">{eventName}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="flex flex-col gap-5 py-2">
            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] text-foreground/40">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description for this event type"
                className="h-8 text-xs bg-white/3 border-white/6 placeholder:text-foreground/20"
              />
            </div>

            {/* Color swatches */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] text-foreground/40">Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(color === c ? "" : c)}
                    className="size-7 rounded-full transition-all ring-offset-2 ring-offset-background"
                    style={{
                      backgroundColor: c,
                      outline: color === c ? `2px solid ${c}` : "none",
                      boxShadow: color === c ? `0 0 0 2px var(--background)` : "none",
                    }}
                  />
                ))}
                {color && (
                  <button
                    type="button"
                    onClick={() => setColor("")}
                    className="size-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-foreground/30 hover:text-foreground/60 transition-colors"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>

            {/* Property keys */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-foreground/40">Property Schema</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-foreground/40 gap-1"
                  onClick={addRow}
                >
                  <Plus size={10} />
                  Add key
                </Button>
              </div>

              {props.length === 0 && (
                <p className="text-[11px] text-foreground/25 text-center py-6 rounded-xl border border-dashed border-white/6">
                  No properties defined. Click &quot;Add key&quot; to start.
                </p>
              )}

              <div className="flex flex-col gap-2">
                {props.map((row, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-white/6 bg-white/[0.02] p-3 flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={row.key}
                        onChange={(e) => updateRow(i, "key", e.target.value)}
                        placeholder="Key name"
                        className="h-7 text-xs font-mono flex-1 bg-white/3 border-white/6 placeholder:text-foreground/20"
                      />
                      <Select
                        value={row.type}
                        onValueChange={(v) =>
                          updateRow(i, "type", v as PropertyRow["type"])
                        }
                      >
                        <SelectTrigger className="h-7 text-xs w-28 bg-white/3 border-white/6">
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
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="size-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-foreground/30 hover:text-destructive/70 transition-colors shrink-0"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                    <Input
                      value={row.description}
                      onChange={(e) => updateRow(i, "description", e.target.value)}
                      placeholder="Optional description"
                      className="h-7 text-xs bg-white/3 border-white/6 placeholder:text-foreground/20"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t border-white/6">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-destructive/70 hover:text-destructive"
            onClick={handleDelete}
          >
            Delete definition
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-foreground/40"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={!hasUnsaved || upsert.isPending}
              onClick={handleSave}
            >
              {upsert.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
