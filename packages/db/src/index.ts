import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

/**
 * Owner-privilege DB client – connects with the default (superuser) role.
 * RLS is bypassed. Use only for admin tasks (seeds, migrations, setup).
 *
 * For user-scoped access create a separate Drizzle instance with the
 * `lumen_api` or `lumen_processor` connection string.
 */
const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
