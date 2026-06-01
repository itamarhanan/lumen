import { z } from "zod";

const InputSchema = z.string().min(1, { message: "URL must not be empty" });
const UuidSchema = z.string().uuid();
const NumericSchema = z.string().regex(/^\d+$/, { message: "Must be numeric" });
const MAX_SEGMENTS = 5;

export function normalizePath(
  url: string,
  maxSegments: number = MAX_SEGMENTS,
): string {
  const input = InputSchema.safeParse(url);
  if (!input.success) return "/";

  let raw: string;
  try {
    raw = new URL(input.data, "http://localhost").pathname;
  } catch {
    raw = input.data.startsWith("/") ? input.data : `/${input.data}`;
  }

  if (raw.length > 1 && raw.endsWith("/")) {
    raw = raw.slice(0, -1);
  }

  const segments = raw.split("/").filter(Boolean);
  const normalized = segments
    .map((s) => {
      const decoded = decodeURIComponent(s);
      if (NumericSchema.safeParse(decoded).success) return ":id";
      if (UuidSchema.safeParse(decoded).success) return ":id";
      return decoded;
    })
    .slice(0, maxSegments);

  return "/" + normalized.join("/");
}
