import "dotenv/config";

import {
  createRedisClient,
  type RedisClient,
  type StreamEntry,
} from "@lumen/redis";
import {
  createClient as createClickHouseClient,
  type ClickHouseClient,
} from "@lumen/clickhouse";
import { UAParser } from "ua-parser-js";
import express from "express";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

const REDIS_HOST = requireEnv("REDIS_HOST");
const REDIS_PORT = parseInt(requireEnv("REDIS_PORT"), 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const CLICKHOUSE_URL = requireEnv("CLICKHOUSE_URL");
const CLICKHOUSE_USER = requireEnv("CLICKHOUSE_USER");
const CLICKHOUSE_PASSWORD = requireEnv("CLICKHOUSE_PASSWORD");
const CLICKHOUSE_DB = requireEnv("CLICKHOUSE_DB");
const REDIS_STREAM = requireEnv("REDIS_STREAM");
const REDIS_CONSUMER_GROUP = requireEnv("REDIS_CONSUMER_GROUP");
const REDIS_CONSUMER_ID = requireEnv("REDIS_CONSUMER_ID");
const batchSize = parseInt(requireEnv("BATCH_SIZE"), 10);
const flushIntervalMs = parseInt(requireEnv("FLUSH_INTERVAL_MS"), 10);
const bufferMax = parseInt(requireEnv("BUFFER_MAX"), 10);
const PROCESSOR_PORT = parseInt(requireEnv("PROCESSOR_PORT"), 10);

interface RedisEnvelope {
  raw: {
    type: "pageview" | "custom" | "identify";
    siteId: string;
    sessionId: string;
    visitorId: string;
    personId?: string;
    timestamp: number;
    url?: string;
    referrer?: string;
    name?: string;
    properties?: Record<string, unknown>;
  };
  receivedAt: number;
  ip?: string;
  userAgent?: string;
}

interface PendingEntry {
  id: string;
  retries: number;
  envelope: RedisEnvelope;
  row: {
    event_type: string;
    event_name: string;
    properties: string;
    person_id: string;
    session_id: string;
    project_id: string;
    source: string;
    timestamp: string;
  };
}

let redis: RedisClient;
let clickhouse: ClickHouseClient;
let running = true;
const pending: PendingEntry[] = [];
let lastFlush = Date.now();
let flushing = false;

function parseUa(userAgent?: string) {
  if (!userAgent) {
    return {
      browser: "Unknown",
      browserVersion: null,
      os: "Unknown",
      osVersion: null,
      device: null,
      deviceModel: null,
      deviceVendor: null,
    };
  }
  const parser = new UAParser(userAgent);
  const { browser, os, device } = parser.getResult();
  return {
    browser: browser.name ?? "Unknown",
    browserVersion: browser.version ?? null,
    os: os.name ?? "Unknown",
    osVersion: os.version ?? null,
    device: device.type ?? null,
    deviceModel: device.model ?? null,
    deviceVendor: device.vendor ?? null,
  };
}

function toRow(envelope: RedisEnvelope): PendingEntry["row"] {
  const { raw, ip, userAgent } = envelope;

  if (!raw.sessionId) {
    console.warn("Missing sessionId, generating fallback UUID");
    raw.sessionId = crypto.randomUUID();
  }

  const ua = parseUa(userAgent);

  const properties: Record<string, unknown> = {
    ...(raw.type === "custom" ? raw.properties : undefined),
    ...ua,
  };

  if (ip) properties.ip = ip;
  if (userAgent) properties.userAgent = userAgent;

  if (raw.type === "pageview") {
    if (raw.url) properties.url = raw.url;
    if (raw.referrer) properties.referrer = raw.referrer;
  }

  return {
    event_type: raw.type,
    event_name: raw.type === "pageview" ? "pageview" : (raw.name ?? "custom"),
    properties: JSON.stringify(properties),
    person_id: raw.personId ?? raw.visitorId,
    session_id: raw.sessionId,
    project_id: raw.siteId,
    source: "web",
    timestamp: new Date(raw.timestamp)
      .toISOString()
      .slice(0, 23)
      .replace("T", " "),
  };
}

async function handleIdentifyEvent(envelope: RedisEnvelope) {
  const { raw } = envelope;

  const now = new Date(raw.timestamp)
    .toISOString()
    .slice(0, 23)
    .replace("T", " ");

  const profileRow = {
    person_id: raw.personId ?? raw.visitorId,
    project_id: raw.siteId,
    is_identified: 1,
    properties: JSON.stringify(raw.properties ?? {}),
    first_seen_at: now,
    updated_at: now,
  };

  try {
    await clickhouse.insert(`${CLICKHOUSE_DB}.person_profiles`, [profileRow]);
  } catch (err) {
    console.error("Failed to upsert person profile:", err);
    throw err;
  }
}

async function flush() {
  if (flushing || pending.length === 0) return;
  flushing = true;
  const batch = pending.splice(0);
  lastFlush = Date.now();

  try {
    await clickhouse.insert(
      `${CLICKHOUSE_DB}.events`,
      batch.map((e) => e.row),
    );
  } catch {
    const retries: PendingEntry[] = [];
    const dead: PendingEntry[] = [];

    for (const entry of batch) {
      entry.retries++;
      if (entry.retries >= 3) {
        dead.push(entry);
      } else {
        retries.push(entry);
      }
    }

    if (dead.length > 0) {
      for (const entry of dead) {
        try {
          await redis.deadLetter(
            REDIS_STREAM,
            entry.envelope,
            `ClickHouse write failed after ${entry.retries} retries`,
          );
        } catch {
          /* best-effort */
        }
        try {
          await redis.acknowledge(REDIS_STREAM, REDIS_CONSUMER_GROUP, entry.id);
        } catch {
          /* best-effort */
        }
      }
      console.warn(
        `Dead-lettered ${dead.length} events after exhausting retries`,
      );
    }

    pending.unshift(...retries);

    if (pending.length > bufferMax) {
      const dropped = pending.splice(0, pending.length - bufferMax);
      for (const entry of dropped) {
        try {
          await redis.deadLetter(
            REDIS_STREAM,
            entry.envelope,
            "Buffer overflow",
          );
        } catch {
          /* best-effort */
        }
        try {
          await redis.acknowledge(REDIS_STREAM, REDIS_CONSUMER_GROUP, entry.id);
        } catch {
          /* best-effort */
        }
      }
      console.warn(`Dropped ${dropped.length} events due to buffer overflow`);
    }

    return;
  } finally {
    flushing = false;
  }

  try {
    await redis.acknowledge(
      REDIS_STREAM,
      REDIS_CONSUMER_GROUP,
      ...batch.map((e) => e.id),
    );
  } catch {
    console.warn("Acknowledge failed after successful insert");
  }
}

async function main() {
  redis = createRedisClient({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
  });

  clickhouse = createClickHouseClient({
    url: CLICKHOUSE_URL,
    username: CLICKHOUSE_USER,
    password: CLICKHOUSE_PASSWORD,
  });

  await redis.ensureGroup(REDIS_STREAM, REDIS_CONSUMER_GROUP);

  const pendingEntries: StreamEntry[] = await redis.claimPending(
    REDIS_STREAM,
    REDIS_CONSUMER_GROUP,
    REDIS_CONSUMER_ID,
    1000,
    batchSize,
  );
  for (const entry of pendingEntries) {
    try {
      const envelope = JSON.parse(
        entry.fields["data"] ?? "{}",
      ) as RedisEnvelope;
      if (envelope.raw.type === "identify") {
        await handleIdentifyEvent(envelope);
        await redis.acknowledge(REDIS_STREAM, REDIS_CONSUMER_GROUP, entry.id);
      } else {
        pending.push({
          id: entry.id,
          retries: 0,
          envelope,
          row: toRow(envelope),
        });
      }
    } catch {
      await redis.acknowledge(REDIS_STREAM, REDIS_CONSUMER_GROUP, entry.id);
    }
  }
  if (pendingEntries.length > 0) {
    console.info(`Reclaimed ${pendingEntries.length} pending events from PEL`);
  }

  const app = express();
  app.get("/", (_req, res) =>
    res.json({ status: "ok", buffered: pending.length }),
  );
  app.listen(PROCESSOR_PORT);

  const timer = setInterval(() => {
    if (Date.now() - lastFlush >= flushIntervalMs) {
      flush().catch(() => {});
    }
  }, flushIntervalMs / 2);
  timer.unref();

  while (running) {
    try {
      const entries = await redis.readStream(
        REDIS_CONSUMER_GROUP,
        REDIS_CONSUMER_ID,
        REDIS_STREAM,
        batchSize,
        flushIntervalMs * 2,
      );

      if (!running) break;

      for (const entry of entries) {
        try {
          const envelope = JSON.parse(
            entry.fields["data"] ?? "{}",
          ) as RedisEnvelope;
          if (envelope.raw.type === "identify") {
            await handleIdentifyEvent(envelope);
            await redis.acknowledge(REDIS_STREAM, REDIS_CONSUMER_GROUP, entry.id);
          } else {
            pending.push({
              id: entry.id,
              retries: 0,
              envelope,
              row: toRow(envelope),
            });
          }
        } catch {
          await redis.acknowledge(REDIS_STREAM, REDIS_CONSUMER_GROUP, entry.id);
        }
      }

      if (pending.length >= batchSize) {
        await flush();
      }
    } catch {
      if (running) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  clearInterval(timer);
  await flush();
  await redis.close();
  await clickhouse.close();
}

function shutdown() {
  if (!running) return;
  running = false;
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
