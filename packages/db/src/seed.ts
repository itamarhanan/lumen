import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import { createClient } from "./index";
import * as schema from "./schema/index";

const CH_URL = process.env.CLICKHOUSE_URL ?? "http://localhost:8123";
const CH_DB = "lumen";

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

const EVENT_TEMPLATES = [
  {
    name: "button_click",
    weight: 25,
    props: () => ({
      buttonId: randomItem(["cta-hero", "nav-signup", "submit-form", "menu-toggle", "social-share"]),
      page: randomItem(PATHS),
      label: "",
    }),
  },
  {
    name: "page_scroll",
    weight: 20,
    props: () => ({
      depth: randomInt(10, 100),
      page: randomItem(PATHS),
    }),
  },
  {
    name: "form_submit",
    weight: 12,
    props: () => ({
      formName: randomItem(["newsletter", "contact", "signup", "feedback"]),
      fieldsCount: randomInt(3, 12),
      isValid: Math.random() > 0.2,
    }),
  },
  {
    name: "search",
    weight: 10,
    props: () => ({
      query: randomItem(["react hooks", "tailwind css", "next.js", "typescript", "docker compose", "postgresql"]),
      resultsCount: randomInt(0, 50),
    }),
  },
  {
    name: "video_play",
    weight: 8,
    props: () => ({
      videoId: randomItem(["intro", "tutorial-1", "demo", "webinar"]),
      duration: randomInt(30, 600),
      autoplay: Math.random() > 0.5,
    }),
  },
  {
    name: "error",
    weight: 5,
    props: () => ({
      message: randomItem([
        "Network request failed",
        "Invalid form data",
        "Session expired. Please refresh the page and try again. If the problem persists, contact support.",
        "Failed to load resource",
      ]),
      code: randomInt(400, 503),
    }),
  },
  {
    name: "nested_data",
    weight: 3,
    props: () => ({
      metadata: {
        source: randomItem(["api", "web", "mobile"]),
        version: randomInt(1, 5),
        tags: randomItem([["urgent", "feature"], ["bug"], ["enhancement", "ui", "a11y"], []]),
      },
    }),
  },
  {
    name: "payment",
    weight: 5,
    props: () => ({
      amount: randomInt(5, 200),
      currency: randomItem(["USD", "EUR", "GBP"]),
      success: Math.random() > 0.1,
    }),
  },
  {
    name: "empty_event",
    weight: 4,
    props: () => ({}),
  },
  {
    name: "feature_flag",
    weight: 3,
    props: () => ({
      flag: randomItem(["new_checkout", "dark_mode", "beta_search", "recommendations"]),
      enabled: Math.random() > 0.5,
      variants: null,
    }),
  },
  {
    name: "notification_click",
    weight: 3,
    props: () => ({
      type: randomItem(["promo", "reminder", "alert", "update"]),
      campaign: randomItem(["spring_sale", "welcome", "abandoned_cart", "weekly_digest"]),
    }),
  },
  {
    name: "rating",
    weight: 2,
    props: () => ({
      score: randomInt(1, 5),
      comment: Math.random() > 0.7
        ? randomItem([
            "Amazing product! Would definitely recommend to others. The quality exceeded my expectations.",
            "Good but could be improved.",
            "Not what I expected, but it works fine for basic use cases.",
          ])
        : "",
    }),
  },
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickWeightedEvent(): (typeof EVENT_TEMPLATES)[number] {
  const totalWeight = EVENT_TEMPLATES.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const tpl of EVENT_TEMPLATES) {
    roll -= tpl.weight;
    if (roll <= 0) return tpl;
  }
  return EVENT_TEMPLATES[0]!;
}

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
      const sessionId = sessions[sessionIdx]!;

      const path = PATHS[Math.floor(Math.random() * PATHS.length)]!;
      const isPageview = Math.random() < 0.65;

      if (isPageview) {
        events.push({
          event_type: "pageview",
          event_name: "pageview",
          properties: JSON.stringify({
            url: path,
            title: path === "/" ? "Home" : path.replace("/", ""),
          }),
          actor_id: crypto.randomUUID(),
          session_id: sessionId,
          project_id: projectId,
          source: "web",
          timestamp: ts
            .toISOString()
            .replace("T", " ")
            .replace("Z", "")
            .slice(0, 23),
        });
      } else {
        const tpl = pickWeightedEvent();
        events.push({
          event_type: "custom",
          event_name: tpl.name,
          properties: JSON.stringify({
            ...tpl.props(),
            url: path,
          }),
          actor_id: crypto.randomUUID(),
          session_id: sessionId,
          project_id: projectId,
          source: "web",
          timestamp: ts
            .toISOString()
            .replace("T", " ")
            .replace("Z", "")
            .slice(0, 23),
        });
      }
    }
  }

  // Bulk insert main events in batches
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
  }

  // Sprinkle rare events (1-3 occurrences each) to test low-volume rendering
  const RARE_EVENTS = [
    { name: "admin_action", props: { action: "user_ban", targetId: crypto.randomUUID(), severity: "high" } },
    { name: "data_export", props: { format: "csv", rows: 15000, estimatedSizeMB: 2.4 } },
    { name: "webhook_failed", props: { endpoint: "https://api.example.com/hooks/1", statusCode: 504, retryCount: 3 } },
  ];

  const rareBatch: object[] = [];
  for (const evt of RARE_EVENTS) {
    const count = randomInt(1, 3);
    for (let i = 0; i < count; i++) {
      const ts = new Date(now);
      ts.setMinutes(ts.getMinutes() - randomInt(1, 60));
      rareBatch.push({
        event_type: "custom",
        event_name: evt.name,
        properties: JSON.stringify(evt.props),
        actor_id: crypto.randomUUID(),
        session_id: crypto.randomUUID(),
        project_id: projectId,
        source: "web",
        timestamp: ts.toISOString().replace("T", " ").replace("Z", "").slice(0, 23),
      });
    }
  }

  if (rareBatch.length > 0) {
    const body = rareBatch.map((e) => JSON.stringify(e)).join("\n");
    const res = await fetch(
      `${CH_URL}/?query=INSERT INTO ${CH_DB}.events FORMAT JSONEachRow`,
      { method: "POST", body, headers: { "Content-Type": "text/plain" } },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ClickHouse rare events insert failed: ${text}`);
    }
  }

  return events.length + rareBatch.length;
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

  if (existingSites.length > 0) {
    console.log("Sites already exist, skipping.");
    const allSites = await db
      .select()
      .from(schema.sites)
      .where(eq(schema.sites.userId, userId));
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
    const allSites = await db
      .select()
      .from(schema.sites)
      .where(eq(schema.sites.userId, userId));
    for (const site of allSites) {
      const n = await seedClickhouse(site.id);
      console.log(`  Inserted ${n} events for "${site.name}"`);
    }
  }

  await close();
  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
