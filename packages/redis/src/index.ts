import { Redis } from "ioredis";

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export interface StreamEntry {
  id: string;
  fields: Record<string, string>;
}

export interface RedisClient {
  readStream(
    group: string,
    consumer: string,
    stream: string,
    count: number,
    blockMs: number,
  ): Promise<StreamEntry[]>;
  claimPending(
    stream: string,
    group: string,
    consumer: string,
    minIdleMs: number,
    count: number,
  ): Promise<StreamEntry[]>;
  acknowledge(stream: string, group: string, ...ids: string[]): Promise<void>;
  ensureGroup(stream: string, group: string): Promise<void>;
  deadLetter(stream: string, data: unknown, error: string): Promise<void>;
  close(): Promise<void>;
}

export function createRedisClient(config: RedisConfig): RedisClient {
  const client = new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db ?? 0,
    retryStrategy: (times) => {
      const delay = Math.min(Math.pow(2, times - 1) * 1000, 30000);
      console.warn(`Redis reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableReadyCheck: true,
  });

  async function readStream(
    group: string,
    consumer: string,
    stream: string,
    count: number,
    blockMs: number,
  ): Promise<StreamEntry[]> {
    const result = await client.xreadgroup(
      "GROUP",
      group,
      consumer,
      "COUNT",
      count,
      "BLOCK",
      blockMs,
      "STREAMS",
      stream,
      ">",
    );
    if (!result) return [];

    const parsed = result as [string, [string, string[]][]][];
    const entries: StreamEntry[] = [];
    for (const [, messages] of parsed) {
      for (const [id, fieldsArr] of messages) {
        const fields: Record<string, string> = {};
        for (let j = 0; j < fieldsArr.length; j += 2) {
          fields[fieldsArr[j] as string] = fieldsArr[j + 1] as string;
        }
        entries.push({ id, fields });
      }
    }
    return entries;
  }

  async function claimPending(
    stream: string,
    group: string,
    consumer: string,
    minIdleMs: number,
    count: number,
  ): Promise<StreamEntry[]> {
    const result = await client.xautoclaim(
      stream,
      group,
      consumer,
      minIdleMs,
      "0-0",
      "COUNT",
      count,
    );
    if (!result) return [];

    const parsed = result as [string | null | undefined, [string, string[]][]];
    const entries: StreamEntry[] = [];
    for (const [id, fieldsArr] of parsed[1]) {
      const fields: Record<string, string> = {};
      for (let j = 0; j < fieldsArr.length; j += 2) {
        fields[fieldsArr[j] as string] = fieldsArr[j + 1] as string;
      }
      entries.push({ id, fields });
    }
    return entries;
  }

  async function acknowledge(
    stream: string,
    group: string,
    ...ids: string[]
  ): Promise<void> {
    if (ids.length === 0) return;
    await client.xack(stream, group, ...ids);
  }

  async function ensureGroup(stream: string, group: string): Promise<void> {
    try {
      await client.xgroup("CREATE", stream, group, "$", "MKSTREAM");
    } catch (err: unknown) {
      if (err instanceof Error && !err.message.includes("BUSYGROUP")) {
        throw err;
      }
    }
  }

  async function deadLetter(
    stream: string,
    data: unknown,
    error: string,
  ): Promise<void> {
    const dlStream = `${stream}:dead`;
    await client.xadd(
      dlStream,
      "*",
      "data",
      JSON.stringify(data),
      "error",
      error,
    );
  }

  async function close(): Promise<void> {
    await client.quit();
  }

  return { readStream, claimPending, acknowledge, ensureGroup, deadLetter, close };
}
