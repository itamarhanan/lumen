"use client";

import { useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PathNodesProps {
  pages: string[];
}

export function PathNodes({ pages }: PathNodesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  const scroll = useCallback((dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = 200;
    el.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
    setTimeout(updateScrollState, 150);
  }, [updateScrollState]);

  if (pages.length === 0) {
    return (
      <span className="text-xs text-foreground/30 italic">No pages</span>
    );
  }

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 size-5 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft size={10} />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex items-center gap-1.5 overflow-x-auto scroll-smooth no-scrollbar py-1"
      >
        {pages.map((page, i) => (
          <span key={`${page}-${i}`} className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center rounded-md bg-black/5 dark:bg-white/8 px-2 py-0.5 font-mono text-[11px] text-foreground/70 whitespace-nowrap leading-5">
              {page}
            </span>
            {i < pages.length - 1 && (
              <span className="text-foreground/20 shrink-0">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </span>
            )}
          </span>
        ))}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 size-5 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight size={10} />
        </button>
      )}
    </div>
  );
}
