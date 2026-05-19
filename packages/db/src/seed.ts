import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import { createClient } from "./index.js";
import * as schema from "./schema/index.js";

const SEED_USER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

const { db: seedDb, close } = createClient("admin");

async function seed() {
  console.log("Seeding user...");
  await seedDb.insert(schema.users).values({
    id: SEED_USER_ID,
    email: "dev@lumen.dev",
    name: "Dev User",
  }).onConflictDoNothing();

  const existingSites = await seedDb.select({ id: schema.sites.id })
    .from(schema.sites)
    .where(eq(schema.sites.userId, SEED_USER_ID))
    .limit(1);

  if (existingSites.length > 0) {
    console.log("Sites already exist, skipping site/key seed.");
    return;
  }

  console.log("Seeding sites...");
  const site1Id = crypto.randomUUID();
  await seedDb.insert(schema.sites).values({
    id: site1Id,
    userId: SEED_USER_ID,
    name: "My Personal Blog",
    domain: "blog.example.com",
    publicId: nanoid(12),
    ingestUrl: "http://localhost:3001/api/collect",
  });

  const site2Id = crypto.randomUUID();
  await seedDb.insert(schema.sites).values({
    id: site2Id,
    userId: SEED_USER_ID,
    name: "E-Commerce Store",
    domain: "store.example.com",
    publicId: nanoid(12),
    ingestUrl: "http://localhost:3001/api/collect",
  });

  console.log("Seeding API keys...");
  const rawKey = `lumen_dev_${nanoid(48)}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  await seedDb.insert(schema.apiKeys).values({
    siteId: site1Id,
    keyHash,
    label: "Development",
  });

  console.log("✅ Seed complete");
  console.log(`   User: ${SEED_USER_ID}`);
  console.log(`   2 sites created with public IDs`);
  console.log(`   API key (raw): ${rawKey}`);
}

seed()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => close());
