"use client";

import {
  Bell,
  Settings,
  ChevronDown,
  Check,
  Menu,
  LayoutDashboard,
  Zap,
  Globe,
  GitBranch,
  Radio,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { useDashboardStore } from "@/lib/store/dashboard";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MOBILE_NAV = [
  { icon: LayoutDashboard, href: "/dashboard", label: "Overview" },
  { icon: Zap, href: "/dashboard/events", label: "Events" },
  { icon: Globe, href: "/dashboard/geo", label: "Geo" },
  { icon: GitBranch, href: "/dashboard/journeys", label: "Journeys" },
  { icon: Radio, href: "/dashboard/live", label: "Live" },
];

const DATE_RANGES = [
  { label: "Last 24 hours", value: "24h", days: 1 },
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 90 days", value: "90d", days: 90 },
] as const;

export function TopBar() {
  const pathname = usePathname();
  const { data: sitesData, isLoading: sitesLoading } =
    trpc.sites.list.useQuery();

  const storeProjectId = useDashboardStore((s) => s.selectedProjectId);
  const setSelectedProjectId = useDashboardStore((s) => s.setSelectedProjectId);
  const storeDateRange = useDashboardStore((s) => s.dateRange);
  const setDateRange = useDashboardStore((s) => s.setDateRange);

  const sites = sitesData ?? [];
  const firstSite = sites[0] ?? null;

  const selectedSite = storeProjectId
    ? (sites.find((s) => s.id === storeProjectId) ?? firstSite)
    : firstSite;

  // Sync first site into store on initial load
  useEffect(() => {
    if (!storeProjectId && firstSite) {
      setSelectedProjectId(firstSite.id);
    }
  }, [firstSite, firstSite?.id, setSelectedProjectId, storeProjectId]);

  const handleSiteChange = (site: { id: string; name: string }) => {
    setSelectedProjectId(site.id);
  };

  return (
    <Sheet>
      <header className="flex shrink-0 items-center justify-between gap-2 px-2 sm:px-3.5 sm:pr-6 py-3 sm:py-4 border-b border-border dark:border-[oklch(0.16_0_0)]">
        <div className="flex items-center gap-1">
          <SheetTrigger asChild>
            <button
              aria-label="Open navigation"
              className="lg:hidden flex size-9 items-center justify-center rounded-xl text-foreground/30 transition-colors hover:bg-accent dark:hover:bg-white/5 hover:text-foreground/70"
            >
              <Menu size={16} strokeWidth={1.5} />
            </button>
          </SheetTrigger>
          <Link
            href="/"
            aria-label="Lumen"
            className="hidden sm:flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 transition-colors hover:bg-primary/20"
          >
            <span
              className="text-primary text-sm font-bold tracking-tight font-sans"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              L
            </span>
          </Link>
        </div>

        <div className="hidden sm:flex items-center gap-1 sm:gap-2 min-w-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-xl px-2 sm:px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent dark:hover:bg-white/5 outline-none truncate max-w-40 sm:max-w-none">
                <span
                  className="size-1.5 shrink-0 rounded-full bg-primary"
                  aria-hidden
                />
                <span className="truncate">{selectedSite?.name}</span>
                <ChevronDown
                  size={13}
                  className="shrink-0 text-foreground/30 ml-0.5"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={6}
              className="w-52 border-border bg-popover dark:border-[oklch(0.20_0_0)] dark:bg-[oklch(0.13_0_0)] rounded-lg p-1 shadow-2xl"
            >
              {sitesLoading ? (
                <DropdownMenuItem
                  disabled
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground/30 cursor-default"
                >
                  Loading…
                </DropdownMenuItem>
              ) : sites.length === 0 ? (
                <DropdownMenuItem
                  disabled
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground/30 cursor-default"
                >
                  No sites found
                </DropdownMenuItem>
              ) : (
                sites.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onSelect={() => handleSiteChange(s)}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer",
                      s.id === selectedSite?.id
                        ? "text-foreground bg-accent dark:bg-white/6"
                        : "text-foreground/50 hover:text-foreground",
                    )}
                  >
                    {s.name}
                    {s.id === selectedSite?.id && (
                      <Check size={12} className="text-primary" />
                    )}
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator className="bg-border dark:bg-white/6 my-1" />
              <DropdownMenuItem className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/40 hover:text-foreground cursor-pointer">
                + Add site
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="hidden sm:inline text-foreground/15 text-lg font-light select-none">
            /
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-xl px-2 sm:px-3 py-2 text-sm text-foreground/50 transition-colors hover:bg-accent dark:hover:bg-white/5 hover:text-foreground outline-none">
                <span className="hidden sm:inline">
                  {storeDateRange?.label}
                </span>
                <span className="sm:hidden">
                  {storeDateRange?.label
                    .replace("Last ", "")
                    .replace(" days", "d")}
                </span>
                <ChevronDown
                  size={13}
                  className="shrink-0 text-foreground/30 ml-0.5"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={6}
              className="w-44 border-border bg-popover dark:border-[oklch(0.20_0_0)] dark:bg-[oklch(0.13_0_0)] rounded-xl p-1 shadow-2xl"
            >
              {DATE_RANGES.map((r) => (
                <DropdownMenuItem
                  key={r.value}
                  onSelect={() =>
                    setDateRange({ label: r.label, days: r.days })
                  }
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer",
                    r.label === storeDateRange?.label
                      ? "text-foreground bg-accent dark:bg-white/6"
                      : "text-foreground/50 hover:text-foreground",
                  )}
                >
                  {r.label}
                  {r.label === storeDateRange?.label && (
                    <Check size={12} className="text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1">
          <button
            aria-label="Notifications"
            className="relative flex size-9 items-center justify-center rounded-xl text-foreground/30 transition-colors hover:bg-accent dark:hover:bg-white/5 hover:text-foreground/70"
          >
            <Bell size={16} strokeWidth={1.5} />
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
          </button>
          <button
            aria-label="Settings"
            className="flex size-9 items-center justify-center rounded-xl text-foreground/30 transition-colors hover:bg-accent dark:hover:bg-white/5 hover:text-foreground/70"
          >
            <Settings size={16} strokeWidth={1.5} />
          </button>
          <button
            aria-label="User menu"
            className="hidden lg:flex ml-1 size-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary transition-colors hover:bg-primary/25"
          >
            A
          </button>
        </div>
      </header>

      <SheetContent
        side="left"
        className="w-64 border-r border-border dark:border-white/6 bg-background dark:bg-[oklch(0.10_0_0)] p-6"
      >
        <div className="flex h-full flex-col gap-8">
          <span className="text-primary text-sm font-bold tracking-tight">
            Lumen
          </span>

          <div className="flex flex-col">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-accent dark:hover:bg-white/4">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/30">
                    Site
                  </span>
                  <span className="flex items-center gap-1.5 text-foreground/70">
                    {selectedSite?.name}
                    <ChevronDown size={13} className="text-foreground/30" />
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={6}
                className="w-52 border-border bg-popover dark:border-[oklch(0.20_0_0)] dark:bg-[oklch(0.13_0_0)] rounded-lg p-1 shadow-2xl"
              >
                {sitesLoading ? (
                  <DropdownMenuItem
                    disabled
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground/30 cursor-default"
                  >
                    Loading…
                  </DropdownMenuItem>
                ) : sites.length === 0 ? (
                  <DropdownMenuItem
                    disabled
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground/30 cursor-default"
                  >
                    No sites found
                  </DropdownMenuItem>
                ) : (
                  sites.map((s) => (
                    <DropdownMenuItem
                      key={s.id}
                      onSelect={() => handleSiteChange(s)}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer",
                        s.id === selectedSite?.id
                          ? "text-foreground bg-accent dark:bg-white/6"
                          : "text-foreground/50 hover:text-foreground",
                      )}
                    >
                      {s.name}
                      {s.id === selectedSite?.id && (
                        <Check size={12} className="text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-accent dark:hover:bg-white/4">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/30">
                    Period
                  </span>
                  <span className="flex items-center gap-1.5 text-foreground/70">
                    {storeDateRange?.label}
                    <ChevronDown size={13} className="text-foreground/30" />
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={6}
                className="w-44 border-border bg-popover dark:border-[oklch(0.20_0_0)] dark:bg-[oklch(0.13_0_0)] rounded-lg p-1 shadow-2xl"
              >
                {DATE_RANGES.map((r) => (
                  <DropdownMenuItem
                    key={r.value}
                    onSelect={() =>
                      setDateRange({ label: r.label, days: r.days })
                    }
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer",
                      r.label === storeDateRange?.label
                        ? "text-foreground bg-accent dark:bg-white/6"
                        : "text-foreground/50 hover:text-foreground",
                    )}
                  >
                    {r.label}
                    {r.label === storeDateRange?.label && (
                      <Check size={12} className="text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <nav className="flex flex-col gap-1">
            {MOBILE_NAV.map(({ icon: Icon, href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                    active
                      ? "bg-accent dark:bg-white/8 text-foreground font-medium"
                      : "text-foreground/40 hover:text-foreground/70 hover:bg-accent dark:hover:bg-white/4",
                  )}
                >
                  <Icon strokeWidth={1.4} className="size-4.5 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto flex items-center gap-3 rounded-xl border border-border dark:border-white/6 px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              A
            </span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-medium text-foreground truncate">
                Account
              </span>
              <span className="text-xs text-foreground/40 truncate">
                Signed in
              </span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
