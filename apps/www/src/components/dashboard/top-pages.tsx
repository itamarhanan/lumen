import { cn } from "@/lib/utils";

interface Page {
  path: string;
  pageviews: number;
  avgDuration: string | null;
}

interface TopPagesProps {
  pages: Page[];
  loading?: boolean;
}

export function TopPages({ pages, loading }: TopPagesProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-foreground">Top pages</p>
        <p className="text-xs text-foreground/30">by pageviews</p>
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
                  Path
                </th>
                <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-foreground/30">
                  Views
                </th>
                <th className="hidden sm:table-cell px-3 sm:px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-foreground/30">
                  Avg. time
                </th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p, i) => (
                <tr
                  key={p.path}
                  className={cn(
                    "transition-colors hover:bg-black/2 dark:hover:bg-white/3",
                    i !== pages.length - 1 &&
                      "border-b border-border/50 dark:border-white/4",
                  )}
                >
                  <td className="max-w-35 truncate px-3 sm:max-w-none sm:px-4 py-3 font-mono text-xs text-foreground/70">
                    {p.path}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right text-foreground/50 tabular-nums whitespace-nowrap">
                    {p.pageviews.toLocaleString()}
                  </td>
                  <td className="hidden sm:table-cell px-3 sm:px-4 py-3 text-right text-foreground/35 tabular-nums whitespace-nowrap">
                    {p.avgDuration ?? "\u2014"}
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
