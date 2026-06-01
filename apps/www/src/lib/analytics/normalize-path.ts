const NUMERIC_SEG = /^\d+$/;
const MAX_SEGMENTS = 5;

export function normalizePath(url: string): string {
  let raw: string;
  try {
    raw = new URL(url).pathname;
  } catch {
    raw = url.startsWith("/") ? url : `/${url}`;
  }

  if (raw.length > 1 && raw.endsWith("/")) {
    raw = raw.slice(0, -1);
  }

  const segments = raw.split("/").filter(Boolean);
  const normalized = segments
    .map((s) => (NUMERIC_SEG.test(s) ? ":id" : s))
    .slice(0, MAX_SEGMENTS);

  return "/" + normalized.join("/");
}
