"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";

interface PersonDrawerProps {
  projectId: string;
  personId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PersonDrawer({
  projectId,
  personId,
  open,
  onOpenChange,
}: PersonDrawerProps) {
  const { data, isLoading } = trpc.events.person.useQuery(
    { projectId, personId, limit: 10 },
    { enabled: open },
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-sm font-semibold">
            Person details
          </SheetTitle>
          <SheetDescription className="text-xs text-foreground/40 break-all font-mono">
            {personId}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="mt-6 space-y-3">
            <div className="h-4 w-24 animate-pulse rounded bg-white/5" />
            <div className="h-20 w-full animate-pulse rounded-xl bg-white/5" />
          </div>
        ) : data?.profile ? (
          <div className="mt-6 space-y-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground/35 mb-2">
                Profile
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-foreground/40">Status</span>
                  <Badge
                    variant={data.profile.is_identified === "1" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {data.profile.is_identified === "1" ? "Identified" : "Anonymous"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-foreground/40">First seen</span>
                  <span>{data.profile.first_seen_at}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-foreground/40">Last updated</span>
                  <span>{data.profile.updated_at}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground/35 mb-2">
                Properties
              </p>
              <pre className="rounded-xl bg-muted dark:bg-white/4 p-3 text-xs overflow-x-auto">
                {JSON.stringify(
                  JSON.parse(data.profile.properties ?? "{}"),
                  null,
                  2,
                )}
              </pre>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground/35 mb-2">
                Recent events ({data.recentEvents.length})
              </p>
              <div className="space-y-1">
                {data.recentEvents.map((e) => (
                  <div
                    key={e.event_id}
                    className="rounded-lg bg-muted dark:bg-white/4 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{e.event_name}</span>
                      <span className="text-foreground/40">{e.timestamp}</span>
                    </div>
                    <span className="text-foreground/30 text-[10px]">
                      {e.event_type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-xs text-foreground/40">
            No profile found for this person.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
