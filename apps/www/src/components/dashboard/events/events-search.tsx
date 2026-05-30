"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";

interface EventsSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function EventsSearch({
  value,
  onChange,
  placeholder = "Search across all event data...",
}: EventsSearchProps) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => clearTimeout(timer.current);
  }, []);

  const handleChange = (v: string) => {
    setLocal(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), 300);
  };

  const handleClear = () => {
    setLocal("");
    clearTimeout(timer.current);
    onChange("");
  };

  return (
    <div className="relative flex-1 max-w-md">
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30 pointer-events-none"
      />
      <input
        type="text"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-2xl border border-border bg-input/30 pl-8 pr-8 text-xs text-foreground placeholder:text-foreground/25 outline-none focus:border-foreground/20 focus:bg-input/50 transition-colors"
      />
      {local && (
        <button
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
