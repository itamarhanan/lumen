import { pgTable, uuid, text, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { sites } from "./sites";

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
    country: text("country"),
    device: text("device"),
    browser: text("browser"),
    os: text("os"),
    referrer: text("referrer"),
    entryPage: text("entry_page"),
    sessionProperties: jsonb("session_properties"),
  },
  (table) => [
    unique("uq_sessions_site_session").on(table.siteId, table.sessionId),
  ],
);
