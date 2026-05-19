import { pgTable, uuid, text, timestamp, unique } from "drizzle-orm/pg-core";
import { sites } from "./sites.js";

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  siteId: uuid("site_id").notNull().references(() => sites.id),
  sessionId: text("session_id").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  country: text("country"),
  device: text("device"),
  browser: text("browser"),
  os: text("os"),
}, (table) => ({
  uqSiteSession: unique("uq_sessions_site_session").on(table.siteId, table.sessionId),
}));
