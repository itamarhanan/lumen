import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

type Variant = "gold" | "white" | "dim";

interface StatCardProps {
  label: string;
  value: string;
  delta?: number | null;
  variant?: Variant;
  loading?: boolean;
  className?: string;
}

const surface: Record<Variant, string> = {
  gold: "bg-primary",
  white: "bg-foreground",
  dim: "bg-muted dark:bg-white/[0.05]",
};
const labelColor: Record<Variant, string> = {
  gold: "text-primary-foreground/55",
  white: "text-background/50",
  dim: "text-foreground/35",
};
const valueColor: Record<Variant, string> = {
  gold: "text-primary-foreground",
  white: "text-background",
  dim: "text-foreground",
};
const trendPos: Record<Variant, string> = {
  gold: "text-primary-foreground/70",
  white: "text-background/60",
  dim: "text-primary",
};
const trendNeg: Record<Variant, string> = {
  gold: "text-primary-foreground/70",
  white: "text-background/60",
  dim: "text-destructive",
};

export function StatCard({
  label,
  value,
  delta,
  variant = "dim",
  loading,
  className,
}: StatCardProps) {
  const pos = (delta ?? 0) >= 0;

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-[1.5rem] p-4 sm:p-5 min-h-28",
        surface[variant],
        className,
      )}
    >
      <p
        className={cn(
          "text-xs font-semibold uppercase tracking-[0.14em]",
          labelColor[variant],
        )}
      >
        {label}
      </p>

      {loading ? (
        <div className="h-8 w-16 animate-pulse rounded-xl bg-black/10 dark:bg-white/10" />
      ) : (
        <div className="flex flex-col gap-1">
          <p
            className={cn(
              "text-[2rem] font-light leading-none tracking-tight",
              valueColor[variant],
            )}
          >
            {value}
          </p>
          {delta != null && (
            <span
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                pos ? trendPos[variant] : trendNeg[variant],
              )}
            >
              {pos ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
              {pos ? "+" : ""}
              {delta.toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
