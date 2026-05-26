"use client";

import { Download, Share2, Plus } from "lucide-react";

interface QuickActionsProps {
  onExport?: () => void;
  onShare?: () => void;
  onNew?: () => void;
}

export function QuickActions({ onExport, onShare, onNew }: QuickActionsProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onExport}
        aria-label="Export"
        className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <Download size={16} strokeWidth={1.5} />
      </button>

      <button
        onClick={onShare}
        aria-label="Share"
        className="flex size-12 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none"
      >
        <Share2 size={16} strokeWidth={1.5} />
      </button>

      <button
        onClick={onNew}
        aria-label="Add site"
        className="flex size-12 items-center justify-center rounded-full bg-accent text-foreground transition-colors hover:bg-accent/80 focus-visible:ring-2 focus-visible:ring-accent-foreground focus-visible:outline-none"
      >
        <Plus size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
}
