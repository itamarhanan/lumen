"use client";

import { useState, useCallback, useMemo } from "react";
import { ChevronDown, ChevronUp, ExternalLink, RefreshCw, AlertCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { PathNodes } from "./path-nodes";

const PAGE_SIZE = 50;

function formatDuration(seconds: number, pageCount: number): string {
  if (pageCount <= 1) return "\u2014";
  if (seconds < 60) return "<1m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    const secs = seconds % 60;
    return `${hours}h ${minutes}m${secs > 0 ? ` ${secs}s` : ""}`;
  }
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

interface Session {
  sessionId: string;
  personId: string;
  path: string[];
  pages: number;
  entryPage: string;
  exitPage: string;
  duration: number;
  browser: string | null;
  device: string | null;
  os: string | null;
  country: string | null;
}

const PAGE_PATHS = [
  "/",
  "/pricing",
  "/login",
  "/signup",
  "/dashboard",
  "/docs",
  "/blog",
  "/features",
  "/settings",
  "/integrations",
  "/enterprise",
  "/about",
  "/contact",
  "/changelog",
  "/security",
  "/guides",
  "/api-docs",
  "/community",
  "/status",
  "/tutorials",
];

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generatePageSequence(rng: () => number): string[] {
  const len = rng() < 0.12 ? 1 : 2 + Math.floor(rng() * 7);
  const seq: string[] = [];
  for (let i = 0; i < len; i++) {
    seq.push(pick(PAGE_PATHS, rng));
  }
  return seq;
}

const BROWSERS = ["Chrome", "Firefox", "Safari", "Edge", null];
const DEVICES = ["Desktop", "Mobile", "Tablet", null];
const OSES = ["Windows", "macOS", "iOS", "Android", "Linux", null];
const COUNTRIES = ["US", "GB", "DE", "FR", "JP", "CA", "AU", null];

function generateMockSessions(): Session[] {
  const rng = seededRandom(42);
  const sessions: Session[] = [];

  for (let i = 0; i < 350; i++) {
    const path = generatePageSequence(rng);
    const entryPage = path[0] ?? "/";
    const exitPage = path[path.length - 1] ?? "/";
    const pages = path.length;
    const duration =
      pages <= 1 ? 0 : Math.round(pages * (30 + rng() * 270));

    sessions.push({
      sessionId: `ses_${String(i + 1).padStart(6, "0")}`,
      personId: `pers_${Math.floor(rng() * 1000)
        .toString(16)
        .padStart(6, "0")}`,
      path,
      pages,
      entryPage,
      exitPage,
      duration,
      browser: pick(BROWSERS, rng),
      device: pick(DEVICES, rng),
      os: pick(OSES, rng),
      country: pick(COUNTRIES, rng),
    });
  }

  return sessions;
}

interface SessionsListProps {
  sessions?: Session[];
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function SessionsList({
  sessions: propSessions,
  loading,
  error,
  onRetry,
}: SessionsListProps) {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allSessions = useMemo(() => propSessions ?? generateMockSessions(), [propSessions]);

  const totalPages = Math.max(1, Math.ceil(allSessions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSessions = useMemo(
    () => allSessions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [allSessions, safePage],
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const goToPage = useCallback(
    (p: number) => {
      setPage(Math.max(1, Math.min(p, totalPages)));
      setExpandedId(null);
    },
    [totalPages],
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20" />
        <div className="rounded-[1.5rem] bg-muted dark:bg-white/4 overflow-hidden">
          <div className="flex flex-col gap-px p-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[1.5rem] bg-muted dark:bg-white/4">
        <Empty>
          <EmptyMedia variant="icon">
            <AlertCircle className="text-destructive" />
          </EmptyMedia>
          <EmptyTitle>Failed to load sessions</EmptyTitle>
          <EmptyDescription>
            Something went wrong while fetching session data
          </EmptyDescription>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw />
              Try again
            </Button>
          )}
        </Empty>
      </div>
    );
  }

  if (allSessions.length === 0) {
    return (
      <div className="rounded-[1.5rem] bg-muted dark:bg-white/4">
        <Empty>
          <EmptyMedia variant="icon">
            <Users className="text-foreground/25" />
          </EmptyMedia>
          <EmptyTitle>No page views recorded for this period</EmptyTitle>
          <EmptyDescription>
            Sessions will appear here once visitors start browsing
          </EmptyDescription>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-foreground">
          Sessions
        </p>
        <p className="text-xs text-foreground/30">
          {allSessions.length} total
        </p>
      </div>

      <div className="rounded-[1.5rem] bg-muted dark:bg-white/4 overflow-hidden">
        <div className="divide-y divide-border/50 dark:divide-white/5">
          {pageSessions.map((s) => {
            const isOpen = expandedId === s.sessionId;
            return (
              <div
                key={s.sessionId}
                className={cn(
                  "transition-colors",
                  isOpen
                    ? "bg-black/3 dark:bg-white/3"
                    : "hover:bg-black/2 dark:hover:bg-white/3",
                )}
              >
                <button
                  onClick={() => toggleExpand(s.sessionId)}
                  className="flex w-full items-center gap-3 px-3 sm:px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="font-mono text-xs text-foreground/70 truncate max-w-[120px] sm:max-w-[200px]">
                      {s.entryPage}
                    </span>
                    <span className="text-foreground/20 shrink-0">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M5 12h14M13 5l7 7-7 7" />
                      </svg>
                    </span>
                    <span className="font-mono text-xs text-foreground/70 truncate max-w-[120px] sm:max-w-[200px]">
                      {s.exitPage}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <Badge variant="outline" className="text-xs tabular-nums text-foreground/45 font-normal">
                      {s.pages} {s.pages === 1 ? "page" : "pages"}
                    </Badge>
                    <span className="text-xs tabular-nums text-foreground/45 w-16 text-right">
                      {formatDuration(s.duration, s.pages)}
                    </span>
                    <span className="text-foreground/20 shrink-0">
                      {isOpen ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-3 sm:px-4 pb-4">
                    <div className="ml-0.5 border-l-2 border-border/40 dark:border-white/8 pl-4 space-y-3">
                      <div className="pt-1">
                        <PathNodes path={s.path} />
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground/45">
                        <span>
                          <span className="text-foreground/25">Browser:</span>{" "}
                          {s.browser ?? "\u2014"}
                        </span>
                        <span>
                          <span className="text-foreground/25">Device:</span>{" "}
                          {s.device ?? "\u2014"}
                        </span>
                        <span>
                          <span className="text-foreground/25">OS:</span>{" "}
                          {s.os ?? "\u2014"}
                        </span>
                        <span>
                          <span className="text-foreground/25">Country:</span>{" "}
                          {s.country ?? "\u2014"}
                        </span>
                      </div>

                      <a
                        href={`/dashboard/events?person=${s.personId}`}
                        className="inline-flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors"
                      >
                        <ExternalLink size={10} />
                        View all events ({s.personId.slice(0, 10)}&hellip;)
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {totalPages > 1 && (
        <PaginationBar
          page={safePage}
          totalPages={totalPages}
          onPageChange={goToPage}
        />
      )}
    </div>
  );
}

function PaginationBar({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const pages = useMemo(() => {
    const items: (number | "dots")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
      return items;
    }
    items.push(1);
    if (page > 3) items.push("dots");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) items.push(i);
    if (page < totalPages - 2) items.push("dots");
    items.push(totalPages);
    return items;
  }, [page, totalPages]);

  return (
    <div className="flex items-center justify-between gap-4 px-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Previous
      </Button>

      <div className="flex items-center gap-1">
        {pages.map((item, i) =>
          item === "dots" ? (
            <span
              key={`dots-${i}`}
              className="size-7 flex items-center justify-center text-xs text-foreground/20"
            >
              &hellip;
            </span>
          ) : (
            <Button
              key={item}
              variant={item === page ? "outline" : "ghost"}
              size="icon-xs"
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          ),
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </Button>
    </div>
  );
}
