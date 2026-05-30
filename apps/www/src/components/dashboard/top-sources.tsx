import { cn } from "@/lib/utils";

interface Source {
  name: string;
  visitors: number;
  share: number;
}

interface TopSourcesProps {
  sources: Source[];
  loading?: boolean;
}

export function TopSources({ sources, loading }: TopSourcesProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-foreground">Top sources</p>
        <p className="text-xs text-foreground/30">by visitors</p>
      </div>

      <div className="rounded-[1.5rem] bg-muted dark:bg-white/4 overflow-hidden">
        {loading ? (
          <div className="flex flex-col gap-px p-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-xl bg-black/3 dark:bg-white/3"
              />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border dark:border-white/5">
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-foreground/30">
                  Source
                </th>
                <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-foreground/30">
                  Visitors
                </th>
                <th className="w-24 px-3 sm:px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-foreground/30">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s, i) => (
                <tr
                  key={s.name}
                  className={cn(
                    "transition-colors hover:bg-black/2 dark:hover:bg-white/3",
                    i !== sources.length - 1 &&
                      "border-b border-border/50 dark:border-white/4",
                  )}
                >
                  <td className="max-w-30 truncate px-3 sm:max-w-none sm:px-4 py-3 font-medium text-foreground/80">
                    {s.name}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right text-foreground/50 tabular-nums whitespace-nowrap">
                    {s.visitors.toLocaleString()}
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <div className="hidden sm:block h-1.5 w-16 overflow-hidden rounded-full bg-muted-foreground/15 dark:bg-white/[0.07]">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{ width: `${s.share}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs text-foreground/35 tabular-nums">
                        {s.share}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
