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
  query<T>(sql: string): Promise<T[]>;
  close(): Promise<void>;
}

export interface InsertEventsResult {
  inserted: number;
}

const DEFAULT_BATCH_SIZE = 1000;

export function createClient(config?: ClickHouseConfig): ClickHouseClient {
  const client = createCHClient({
    url: config?.url ?? "http://localhost:8123",
    username: config?.username ?? "default",
    password: config?.password ?? "",
    database: config?.database ?? "default",
  });

  async function insert(table: string, rows: object[]) {
    if (rows.length === 0) return;
    await client.insert({ table, values: rows, format: "JSONEachRow" });
  }

  async function query<T>(sql: string): Promise<T[]> {
    const result = await client.query({ query: sql, format: "JSONEachRow" });
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
