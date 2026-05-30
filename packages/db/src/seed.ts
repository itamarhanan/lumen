import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import { createClient } from "./index";
import * as schema from "./schema/index";

const CH_URL = process.env.CLICKHOUSE_URL ?? "http://localhost:8123";
const CH_DB = "lumen";

const PUBLIC_IPS = [
  "8.8.8.8",
  "1.1.1.1",
  "208.67.222.222",
  "185.228.168.9",
  "76.76.19.19",
  "94.140.14.14",
  "203.0.113.1",
  "198.51.100.1",
  "192.0.2.1",
  "45.33.32.156",
];

const PATHS = [
  "/",
  "/blog",
  "/pricing",
  "/about",
  "/contact",
  "/blog/hello-world",
  "/blog/tips",
  "/blog/deep-dive",
  "/products",
  "/products/1",
  "/products/2",
];

const CUSTOM_EVENT_NAMES = [
  "button_click",
  "signup",
  "purchase",
  "feature_used",
];

const EVENT_SCHEMAS = [
  {
    eventName: "button_click",
    description: "Tracks button clicks across the site",
    propertiesSchema: {
      button_id: { type: "string" as const, required: true, description: "DOM element ID" },
      page: { type: "string" as const, required: true, description: "Page URL" },
      label: { type: "string" as const, required: false, description: "Button label text" },
    },
    enforceStrict: false,
  },
  {
    eventName: "signup",
    description: "User signup event",
    propertiesSchema: {
      method: { type: "string" as const, required: true, description: "Signup method (email, google, github)" },
      plan: { type: "string" as const, required: false, description: "Selected plan tier" },
      referrer: { type: "string" as const, required: false, description: "Referral source" },
    },
    enforceStrict: true,
  },
  {
    eventName: "purchase",
    description: "Product purchase event",
    propertiesSchema: {
      product_id: { type: "string" as const, required: true, description: "Purchased product ID" },
      amount: { type: "number" as const, required: true, description: "Purchase amount in cents" },
      currency: { type: "string" as const, required: true, description: "Currency code" },
      quantity: { type: "number" as const, required: false, description: "Item quantity" },
    },
    enforceStrict: false,
  },
  {
    eventName: "feature_used",
    description: "Feature usage event",
    propertiesSchema: {
      feature: { type: "string" as const, required: true, description: "Feature name" },
      component: { type: "string" as const, required: false, description: "UI component" },
      metadata: {
        type: "object" as const,
        required: false,
        description: "Additional context",
        properties: {
          source: { type: "string" as const, description: "Navigation source" },
          version: { type: "string" as const, description: "Feature version" },
        },
      },
    },
    enforceStrict: false,
  },
];

const IDENTIFIED_PERSONS = [
  { id: crypto.randomUUID(), name: "Alice Johnson", email: "alice@example.com", plan: "pro" },
  { id: crypto.randomUUID(), name: "Bob Smith", email: "bob@example.com", plan: "enterprise" },
  { id: crypto.randomUUID(), name: "Carol Davis", email: "carol@example.com", plan: "free" },
  { id: crypto.randomUUID(), name: "David Wilson", email: "david@example.com", plan: "pro" },
  { id: crypto.randomUUID(), name: "Eve Martin", email: "eve@example.com", plan: "enterprise" },
];

function chNow(ts: Date): string {
  return ts.toISOString().replace("T", " ").replace("Z", "").slice(0, 23);
}

async function insertCH(body: string): Promise<void> {
  const res = await fetch(
    `${CH_URL}/?query=INSERT INTO ${CH_DB}.events FORMAT JSONEachRow`,
    { method: "POST", body, headers: { "Content-Type": "text/plain" } },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClickHouse insert failed: ${text}`);
  }
}

async function seedClickhouse(projectId: string): Promise<number> {
  const events: object[] = [];
  const now = new Date();

  const personPool = [
    ...IDENTIFIED_PERSONS.map((p) => p.id),
    ...Array.from({ length: 15 }, () => crypto.randomUUID()),
  ];

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

      const path = PATHS[Math.floor(Math.random() * PATHS.length)]!;
      const isPageview = Math.random() < 0.65;
      const personId = personPool[Math.floor(Math.random() * personPool.length)]!;

      const ip = PUBLIC_IPS[Math.floor(Math.random() * PUBLIC_IPS.length)]!;

      if (isPageview) {
        events.push({
          event_type: "pageview",
          event_name: "pageview",
          properties: JSON.stringify({ url: path, title: path === "/" ? "Home" : path.replace("/", ""), ip }),
          person_id: personId,
          session_id: sessionId,
          project_id: projectId,
          source: "web",
          timestamp: chNow(ts),
        });
      } else {
        const customName = CUSTOM_EVENT_NAMES[Math.floor(Math.random() * CUSTOM_EVENT_NAMES.length)]!;
        let props: Record<string, unknown>;

        switch (customName) {
          case "button_click":
            props = { button_id: `btn-${Math.floor(Math.random() * 10)}`, page: path, label: "Click me" };
            break;
          case "signup":
            props = { method: ["email", "google", "github"][Math.floor(Math.random() * 3)]!, plan: ["free", "pro", "enterprise"][Math.floor(Math.random() * 3)]! };
            break;
          case "purchase":
            props = { product_id: `prod-${Math.floor(Math.random() * 5)}`, amount: Math.floor(Math.random() * 5000) + 999, currency: "USD", quantity: Math.floor(Math.random() * 3) + 1 };
            break;
          case "feature_used":
            props = { feature: ["search", "dashboard", "export", "api"][Math.floor(Math.random() * 4)]!, component: "MainPanel", metadata: { source: "sidebar", version: "1.0" } };
            break;
          default:
            props = {};
        }

        props.ip = ip;
        events.push({
          event_type: "custom",
          event_name: customName,
          properties: JSON.stringify(props),
          person_id: personId,
          session_id: sessionId,
          project_id: projectId,
          source: "web",
          timestamp: chNow(ts),
        });
      }
    }
  }

  let inserted = 0;
  const batchSize = 1000;
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    await insertCH(batch.map((e) => JSON.stringify(e)).join("\n"));
    inserted += batch.length;
  }

  return inserted;
}

async function seedPersonProfiles(projectId: string): Promise<void> {
  const now = chNow(new Date());
  const profiles = IDENTIFIED_PERSONS.map((p) => ({
    person_id: p.id,
    project_id: projectId,
    is_identified: 1,
    properties: JSON.stringify({ name: p.name, email: p.email, plan: p.plan }),
    first_seen_at: now,
    updated_at: now,
  }));

  const res = await fetch(
    `${CH_URL}/?query=INSERT INTO ${CH_DB}.person_profiles FORMAT JSONEachRow`,
    { method: "POST", body: profiles.map((p) => JSON.stringify(p)).join("\n"), headers: { "Content-Type": "text/plain" } },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClickHouse person_profiles insert failed: ${text}`);
  }
  console.log(`  Inserted ${profiles.length} person profiles`);
}

async function seedEventSchemas(siteId: string): Promise<void> {
  const { db, close } = createClient("admin");
  try {
    for (const es of EVENT_SCHEMAS) {
      const existing = await db.query.eventSchemas.findFirst({
        where: (eventSchemas, { eq, and }) =>
          and(eq(eventSchemas.siteId, siteId), eq(eventSchemas.eventName, es.eventName)),
      });
      if (existing) continue;
      await db.insert(schema.eventSchemas).values({
        siteId,
        eventName: es.eventName,
        description: es.description,
        propertiesSchema: es.propertiesSchema,
        enforceStrict: es.enforceStrict,
      });
    }
    console.log(`  Inserted ${EVENT_SCHEMAS.length} event schemas for site ${siteId}`);
  } finally {
    await close();
  }
}

async function seed() {
  const { db, close } = createClient("admin");

  const existingUsers = await db.select().from(schema.users).limit(1);
  let userId: string;

  if (existingUsers.length > 0) {
    const user = existingUsers[0]!;
    userId = user.id;
    console.log(`Found user: ${user.email} (${userId})`);
  } else {
    console.log("No user found in public.users.");
    console.log("Please log in via OAuth first, then re-run seed.");
    return;
  }

  const existingSites = await db
    .select({ id: schema.sites.id })
    .from(schema.sites)
    .where(eq(schema.sites.userId, userId))
    .limit(1);

  let site1Id: string;
  let site2Id: string;

  let allSites: Array<{ id: string; name: string }>;

  if (existingSites.length > 0) {
    console.log("Sites already exist, skipping.");
    allSites = await db
      .select({ id: schema.sites.id, name: schema.sites.name })
      .from(schema.sites)
      .where(eq(schema.sites.userId, userId));
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

    console.debug(`  API key (raw): ${rawKey}`);

    allSites = await db
      .select({ id: schema.sites.id, name: schema.sites.name })
      .from(schema.sites)
      .where(eq(schema.sites.userId, userId));
  }

  console.log("Seeding event schemas...");
  for (const site of allSites) {
    await seedEventSchemas(site.id);
  }

  console.log("Seeding person profiles...");
  for (const site of allSites) {
    await seedPersonProfiles(site.id);
  }

  console.log("Seeding ClickHouse events...");
  for (const site of allSites) {
    const n = await seedClickhouse(site.id);
    console.log(`  Inserted ${n} events for "${site.name}"`);
  }

  await close();
  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
