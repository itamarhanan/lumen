"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EventsFiltersProps {
  eventName: string;
  onEventNameChange: (v: string) => void;
  eventType: string;
  onEventTypeChange: (v: string) => void;
  propKey: string;
  onPropKeyChange: (v: string) => void;
  propValue: string;
  onPropValueChange: (v: string) => void;
}

export function EventsFilters({
  eventName,
  onEventNameChange,
  eventType,
  onEventTypeChange,
  propKey,
  onPropKeyChange,
  propValue,
  onPropValueChange,
}: EventsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Event name..."
        value={eventName}
        onChange={(e) => onEventNameChange(e.target.value)}
        className="h-8 w-44 rounded-lg text-xs"
      />
      <Select value={eventType} onValueChange={onEventTypeChange}>
        <SelectTrigger className="h-8 w-32 rounded-lg text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-lg">
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="pageview">Pageview</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>
      <Input
        placeholder="Property key..."
        value={propKey}
        onChange={(e) => onPropKeyChange(e.target.value)}
        className="h-8 w-32 rounded-lg text-xs"
      />
      <Input
        placeholder="Property value..."
        value={propValue}
        onChange={(e) => onPropValueChange(e.target.value)}
        className="h-8 w-32 rounded-lg text-xs"
      />
    </div>
  );
}
