import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@lumen/db";
import { sites } from "@lumen/db/schema";
import { eq } from "drizzle-orm";
import { SCRIPT_TEMPLATE } from "@/lib/script-template";

const CACHE_TTL = 3600;
const RATE_LIMIT_MAX = 50;
const RATE_LIMIT_WINDOW = 60_000;
const MAX_CACHE_SIZE = 10_000;
const MAX_RATE_BUCKETS = 5_000;

const { db } = createClient("api");

const scriptCache = new Map<string, { code: string; etag: string; expires: number }>();

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

const inflight = new Map<string, Promise<{ code: string; etag: string }>>();

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "127.0.0.1";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    rateLimitBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    if (rateLimitBuckets.size > MAX_RATE_BUCKETS) {
      for (const [key, val] of rateLimitBuckets) {
        if (val.resetAt < now) rateLimitBuckets.delete(key);
      }
    }
    return false;
  }
  bucket.count++;
  return bucket.count > RATE_LIMIT_MAX;
}

function sanitizePublicId(id: string): string | null {
  if (id.length > 64) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  return id;
}

async function buildScript(publicId: string, ingestUrl: string): Promise<{ code: string; etag: string }> {
  const preamble = `window.__LUMEN__={siteId:${JSON.stringify(publicId)},ingestUrl:${JSON.stringify(ingestUrl)}};`;
  const code = preamble + SCRIPT_TEMPLATE;
  const etag = createHash("sha1").update(code).digest("hex");
  return { code, etag };
}

function evictExpired(): void {
  const now = Date.now();
  if (scriptCache.size >= MAX_CACHE_SIZE) {
    let evicted = 0;
    for (const [key, val] of scriptCache) {
      if (val.expires < now) {
        scriptCache.delete(key);
        evicted++;
        if (evicted >= Math.floor(MAX_CACHE_SIZE / 10)) break;
      }
    }
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const rawId = (await params).publicId;
  const publicId = sanitizePublicId(rawId);
  if (!publicId) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  const now = Date.now();

  const cached = scriptCache.get(publicId);
  if (cached && cached.expires > now) {
    if (req.headers.get("if-none-match") === cached.etag) {
      return new NextResponse(null, { status: 304 });
    }
    return serveScript(cached.code, cached.etag);
  }

  const inflightPromise = inflight.get(publicId);
  if (inflightPromise) {
    const result = await inflightPromise;
    return serveScript(result.code, result.etag);
  }

  const promise = (async () => {
    const site = await db
      .select({ ingestUrl: sites.ingestUrl })
      .from(sites)
      .where(eq(sites.publicId, publicId))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!site) {
      return null;
    }

    const result = await buildScript(publicId, site.ingestUrl || "");

    evictExpired();
    scriptCache.set(publicId, {
      code: result.code,
      etag: result.etag,
      expires: now + CACHE_TTL * 1000,
    });

    return result;
  })();

  inflight.set(publicId, promise);
  try {
    const result = await promise;
    if (!result) {
      return new NextResponse("Not found", { status: 404 });
    }
    return serveScript(result.code, result.etag);
  } finally {
    inflight.delete(publicId);
  }
}

function serveScript(code: string, etag: string) {
  return new NextResponse(code, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": `public, max-age=${CACHE_TTL}, stale-while-revalidate=86400`,
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
      "ETag": etag,
    },
  });
}
