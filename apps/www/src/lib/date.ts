import {
  formatDistanceToNow,
  parse,
  differenceInHours,
  format,
} from "date-fns";

export function formatEventTime(
  ts: string,
  fmt = "MMM d, HH:mm",
): string {
  try {
    const parsed = parse(ts.slice(0, 19), "yyyy-MM-dd HH:mm:ss", new Date());
    const hoursDiff = differenceInHours(new Date(), parsed);
    if (hoursDiff < 24) {
      return formatDistanceToNow(parsed, { addSuffix: true });
    }
    return format(parsed, fmt);
  } catch {
    return ts;
  }
}
