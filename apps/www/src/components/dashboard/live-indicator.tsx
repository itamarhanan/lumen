"use client";

import { useEffect, useState } from "react";

export function LiveIndicator({ count }: { count: number }) {
  const [tick, setTick] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => !t), 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 rounded-full border border-border dark:border-white/[0.07] bg-muted dark:bg-white/4 px-3 py-1.5">
      <span
        className="size-1.5 rounded-full bg-primary transition-opacity duration-700"
        style={{ opacity: tick ? 1 : 0.3 }}
      />
      <span className="text-xs font-medium text-foreground/50">
        <span className="text-foreground">{count}</span>
        <span className="hidden sm:inline"> online now</span>
      </span>
    </div>
  );
}
