"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Zap, Globe, GitBranch, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

const MAIN_NAV = [
  { icon: LayoutDashboard, href: "/dashboard", label: "Overview" },
  { icon: Zap, href: "/dashboard/events", label: "Events" },
  { icon: Globe, href: "/dashboard/geo", label: "Geo" },
  { icon: GitBranch, href: "/dashboard/journeys", label: "Journeys" },
  { icon: Radio, href: "/dashboard/live", label: "Live" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex h-full w-16 shrink-0 flex-col items-center justify-between py-6 select-none border-r border-border dark:border-[oklch(0.16_0_0)]"
    >
      <div className="flex flex-col items-center gap-10 w-full">
        <nav className="flex flex-col items-center gap-1 w-full px-2">
          {MAIN_NAV.map(({ icon: Icon, href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                title={label}
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl transition-all duration-200",
                  active
                    ? "bg-accent dark:bg-white/8 text-foreground"
                    : "text-foreground/25 hover:text-foreground/60 hover:bg-accent dark:hover:bg-white/4",
                )}
              >
                <Icon strokeWidth={1.4} className="size-4.5" />
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
