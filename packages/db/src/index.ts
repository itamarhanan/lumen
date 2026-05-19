import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

export type DbRole = "admin" | "api" | "processor";

function getConnectionUrl(role: DbRole): string {
  switch (role) {
    case "admin":
      return process.env.DATABASE_URL!;
    case "api":
      return process.env.DATABASE_URL_API!;
    case "processor":
      return process.env.DATABASE_URL_PROCESSOR!;
  }
}

export function createClient(role: DbRole = "admin") {
  const client = postgres(getConnectionUrl(role));
  const db = drizzle(client, { schema });
  return { db, close: () => client.end() };
}
