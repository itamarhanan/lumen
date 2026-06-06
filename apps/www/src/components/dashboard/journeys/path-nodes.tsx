"use client";

import { useRef, useCallback } from "react";

interface PathNodesProps {
  path: string[];
  timestamps?: string[];
}

const DRAG_THRESHOLD = 5;
const DRAG_MULTIPLIER = 1.5;

export function PathNodes({ path }: PathNodesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const dragged = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragged.current = false;
    startX.current = e.pageX - (containerRef.current?.offsetLeft ?? 0);
    scrollLeft.current = containerRef.current?.scrollLeft ?? 0;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - (containerRef.current?.offsetLeft ?? 0);
    const walk = (x - startX.current) * DRAG_MULTIPLIER;
    if (Math.abs(walk) > DRAG_THRESHOLD) dragged.current = true;
    if (containerRef.current) {
      containerRef.current.scrollLeft = scrollLeft.current - walk;
    }
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    isDragging.current = true;
    dragged.current = false;
    startX.current = touch.pageX - (containerRef.current?.offsetLeft ?? 0);
    scrollLeft.current = containerRef.current?.scrollLeft ?? 0;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const x = touch.pageX - (containerRef.current?.offsetLeft ?? 0);
    const walk = (x - startX.current) * DRAG_MULTIPLIER;
    if (Math.abs(walk) > DRAG_THRESHOLD) dragged.current = true;
    if (containerRef.current) {
      containerRef.current.scrollLeft = scrollLeft.current - walk;
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (dragged.current) {
      e.stopPropagation();
    }
  }, []);

  if (path.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="overflow-x-auto flex items-center gap-0 cursor-grab active:cursor-grabbing select-none"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={handleClick}
    >
      {path.map((page, i) => (
        <div key={i} className="flex items-center gap-0 shrink-0">
          {i > 0 && (
            <span className="mx-1.5 text-foreground/30 text-xs shrink-0">
              →
            </span>
          )}
          <span
            title={page}
            className="rounded-xl bg-muted px-3 py-1.5 text-xs font-mono text-foreground/80 max-w-45 truncate shrink-0"
          >
            {page}
          </span>
        </div>
      ))}
    </div>
  );
}
