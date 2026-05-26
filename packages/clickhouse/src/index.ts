import { createClient as createCHClient } from "@clickhouse/client";

export interface ClickHouseConfig {
  url?: string;
  username?: string;
  password?: string;
  database?: string;
}

export interface ClickHouseEvent {
  event_id: string;
  event_type: string;
  event_name: string;
  properties: string;
  actor_id: string;
  session_id: string;
  project_id: string;
  source: string;
  timestamp: string;
  inserted_at?: string;
}

export interface ClickHouseClient {
  insert(table: string, rows: object[]): Promise<void>;
  query<T>(sql: string, params?: Record<string, unknown>): Promise<T[]>;
  close(): Promise<void>;
}

export interface InsertEventsResult {
  inserted: number;
}

const DEFAULT_BATCH_SIZE = 1000;

const EVENTS_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS {db}.events (
    event_id UUID DEFAULT generateUUIDv4(),
    event_type LowCardinality(String),
    event_name String,
    properties String,
    actor_id String,
    session_id String,
    project_id String,
    source LowCardinality(String),
    timestamp DateTime64(3) NOT NULL,
    inserted_at DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY (project_id, event_type, toStartOfHour(timestamp), event_id)
TTL toDate(timestamp) + INTERVAL 90 DAY
SETTINGS index_granularity = 8192
`;

async function ensureSchema(
  client: ReturnType<typeof createCHClient>,
  database: string,
): Promise<void> {
  await client.query({ query: `CREATE DATABASE IF NOT EXISTS ${database}` });
  await client.query({
    query: EVENTS_TABLE_DDL.replace(/\{db\}/g, database),
  });
}

export function createClient(config?: ClickHouseConfig): ClickHouseClient {
  const database = config?.database ?? "default";
  const client = createCHClient({
    url: config?.url ?? "http://localhost:8123",
    username: config?.username ?? "default",
    password: config?.password ?? "",
    database,
  });

  ensureSchema(client, database).catch((err: Error) => {
    process.stderr.write(
      `[clickhouse] Schema migration failed (db=${database}): ${err.message}\n`,
    );
  });

  async function insert(table: string, rows: object[]) {
    if (rows.length === 0) return;
    await client.insert({ table, values: rows, format: "JSONEachRow" });
  }

  async function query<T>(
    sql: string,
    params?: Record<string, unknown>,
  ): Promise<T[]> {
    const result = await client.query({
      query: sql,
      format: "JSONEachRow",
      query_params: params,
    });
    return await result.json();
  }

  return { insert, query, close: () => client.close() };
}

export async function insertEvents(
  client: ClickHouseClient,
  events: ClickHouseEvent[],
  options?: { batchSize?: number },
): Promise<InsertEventsResult[]> {
  if (events.length === 0) return [];

  const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE;
  const results: InsertEventsResult[] = [];

  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    await client.insert("events", batch);
    results.push({ inserted: batch.length });
  }

  return results;
}
