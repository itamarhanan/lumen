import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { nanoid } from "nanoid";
import * as schema from "./schema/index.js";

const SEED_USER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function seed() {
  console.log("Seeding user...");
  await db.insert(schema.users).values({
    id: SEED_USER_ID,
    email: "dev@lumen.dev",
    name: "Dev User",
  }).onConflictDoNothing();

  console.log("Seeding sites...");
  const site1Id = crypto.randomUUID();
  await db.insert(schema.sites).values({
    id: site1Id,
    userId: SEED_USER_ID,
    name: "My Personal Blog",
    domain: "blog.example.com",
    publicId: nanoid(12),
    ingestUrl: "http://localhost:3001/api/collect",
  }).onConflictDoNothing();

  const site2Id = crypto.randomUUID();
  await db.insert(schema.sites).values({
    id: site2Id,
    userId: SEED_USER_ID,
    name: "E-Commerce Store",
    domain: "store.example.com",
    publicId: nanoid(12),
    ingestUrl: "http://localhost:3001/api/collect",
  }).onConflictDoNothing();

  console.log("Seeding API keys...");
  await db.insert(schema.apiKeys).values({
    siteId: site1Id,
    keyHash: `dev-key-blog-${nanoid(32)}`,
    label: "Development",
  }).onConflictDoNothing();

  console.log("✅ Seed complete");
  console.log(`   User: ${SEED_USER_ID}`);
  console.log(`   2 sites created with public IDs`);

  await client.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
