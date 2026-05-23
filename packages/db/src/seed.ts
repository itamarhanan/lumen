import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import postgres from "postgres";
import { createClient } from "./index";
import * as schema from "./schema/index";

const CH_URL = process.env.CLICKHOUSE_URL ?? "http://localhost:8123";
const CH_DB = "lumen";

const PATHS = [
  "/", "/blog", "/pricing", "/about", "/contact",
  "/blog/hello-world", "/blog/tips", "/blog/deep-dive",
  "/products", "/products/1", "/products/2",
];

async function seedClickhouse(projectId: string): Promise<number> {
  const events: object[] = [];
  const now = new Date();

  for (let day = 29; day >= 0; day--) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);

    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const count = isWeekend
      ? 20 + Math.floor(Math.random() * 20)
      : 50 + Math.floor(Math.random() * 50);

    const sessions: string[] = [];
    for (let i = 0; i < Math.ceil(count * 0.4); i++) {
      sessions.push(crypto.randomUUID());
    }

    for (let i = 0; i < count; i++) {
      const ts = new Date(date);
      ts.setHours(Math.floor(Math.random() * 24));
      ts.setMinutes(Math.floor(Math.random() * 60));
      ts.setSeconds(Math.floor(Math.random() * 60));
      ts.setMilliseconds(0);

      const sessionIdx = Math.floor(Math.random() * sessions.length);
      const sessionId = sessions[sessionIdx];

      const path = PATHS[Math.floor(Math.random() * PATHS.length)];
      const isPageview = Math.random() < 0.75;

      events.push({
        event_type: isPageview ? "pageview" : "custom",
        event_name: isPageview ? "pageview" : "button_click",
        properties: JSON.stringify({ url: path, title: path === "/" ? "Home" : path.replace("/", "") }),
        actor_id: crypto.randomUUID(),
        session_id: sessionId,
        project_id: projectId,
        source: "web",
        timestamp: ts.toISOString().replace("T", " ").replace("Z", "").slice(0, 23),
      });
    }
  }

  let inserted = 0;
  const batchSize = 1000;
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    const body = batch.map((e) => JSON.stringify(e)).join("\n");

    const res = await fetch(
      `${CH_URL}/?query=INSERT INTO ${CH_DB}.events FORMAT JSONEachRow`,
      { method: "POST", body, headers: { "Content-Type": "text/plain" } },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ClickHouse insert failed at batch ${i}: ${text}`);
    }

    inserted += batch.length;
  }

  return inserted;
}

async function seed() {
  const { db, close } = createClient("admin");

  const existingUsers = await db.select().from(schema.users).limit(1);
  let userId: string;

  if (existingUsers.length > 0) {
    userId = existingUsers[0].id;
    console.log(`Found user: ${existingUsers[0].email} (${userId})`);
  } else {
    console.log("No user found in public.users.");
    console.log("Please log in via OAuth first, then re-run seed.");
    return;
  }

  const existingSites = await db.select({ id: schema.sites.id })
    .from(schema.sites)
    .where(eq(schema.sites.userId, userId))
    .limit(1);

  let site1Id: string;
  let site2Id: string;

  if (existingSites.length > 0) {
    console.log("Sites already exist, skipping.");
    const allSites = await db.select().from(schema.sites).where(eq(schema.sites.userId, userId));
    const siteIds = allSites.map((s) => s.id);

    console.log("Seeding ClickHouse for existing sites...");
    for (const sid of siteIds) {
      const n = await seedClickhouse(sid);
      console.log(`  Inserted ${n} events for site ${sid}`);
    }
  } else {
    console.log("Creating sites...");
    site1Id = crypto.randomUUID();
    await db.insert(schema.sites).values({
      id: site1Id,
      userId,
      name: "My Personal Blog",
      domain: "blog.example.com",
      publicId: nanoid(12),
      ingestUrl: "http://localhost:3001/api/collect",
    });

    site2Id = crypto.randomUUID();
    await db.insert(schema.sites).values({
      id: site2Id,
      userId,
      name: "E-Commerce Store",
      domain: "store.example.com",
      publicId: nanoid(12),
      ingestUrl: "http://localhost:3001/api/collect",
    });

    const rawKey = `lumen_dev_${nanoid(48)}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    await db.insert(schema.apiKeys).values({
      siteId: site1Id,
      keyHash,
      label: "Development",
    });

    console.log(`  API key (raw): ${rawKey}`);
  }

  if (existingSites.length === 0) {
    console.log("Seeding ClickHouse...");
    const allSites = await db.select().from(schema.sites).where(eq(schema.sites.userId, userId));
    for (const site of allSites) {
      const n = await seedClickhouse(site.id);
      console.log(`  Inserted ${n} events for "${site.name}"`);
    }
  }

  close();
  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
