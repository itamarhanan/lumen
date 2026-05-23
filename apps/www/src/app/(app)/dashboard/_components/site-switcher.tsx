"use client";

import { trpc } from "@/lib/trpc/client";

export function SiteSwitcher() {
  const { data: sites } = trpc.sites.list.useQuery();

  const current = sites?.[0];

  if (!current) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-medium">{current.name}</span>
      {current.domain && (
        <span className="text-muted-foreground">{current.domain}</span>
      )}
    </div>
  );
}
