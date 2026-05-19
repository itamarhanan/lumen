import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { minify } from "terser";
import { db } from "@lumen/db";
import { sites } from "@lumen/db/schema";
import { eq } from "drizzle-orm";

const CACHE_TTL = 3600;

const scriptCache = new Map<string, { code: string; expires: number }>();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;

  const cached = scriptCache.get(publicId);
  if (cached && cached.expires > Date.now()) {
    return serveScript(cached.code);
  }

  const site = await db
    .select({ id: sites.id, ingestUrl: sites.ingestUrl })
    .from(sites)
    .where(eq(sites.publicId, publicId))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!site) {
    return new NextResponse("Not found", { status: 404 });
  }

  const sourcePath = path.join(process.cwd(), "src/lib/web-source.js");
  const source = await readFile(sourcePath, "utf-8");

  const ingestUrl = site.ingestUrl || "";
  const preamble = `window.__LUMEN__={siteId:${JSON.stringify(publicId)},ingestUrl:${JSON.stringify(ingestUrl)}};`;
  const withConfig = preamble + source;

  const result = await minify(withConfig, {
    compress: {
      passes: 3,
      dead_code: true,
      toplevel: true,
      unsafe: true,
      switches: true,
      computed_props: true,
    },
    mangle: {
      toplevel: true,
      eval: true,
      properties: {
        // We must protect window hooks, native DOM elements, and dataset selectors.
        reserved: [
          "__LUMEN__",
          "lumen",
          "dataset",
          "siteId",
          "ingestUrl",
          "pushState",
          "popstate",
          "sendBeacon",
          "fetch",
          "method",
          "headers",
          "body",
          "keepalive",
          "currentScript",
        ],
      },
    },
    format: {
      comments: false,
    },
  });

  if (!result.code) {
    return new NextResponse("Build error", { status: 500 });
  }

  scriptCache.set(publicId, {
    code: result.code,
    expires: Date.now() + CACHE_TTL * 1000,
  });

  return serveScript(result.code);
}

function serveScript(code: string) {
  return new NextResponse(code, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": `public, max-age=${CACHE_TTL}, stale-while-revalidate=86400`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
