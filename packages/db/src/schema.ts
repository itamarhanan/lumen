import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const sites = pgTable("sites", {
  id: uuid("id").defaultRandom().primaryKey(),
  publicId: text("public_id").unique().notNull(),
  name: text("name").notNull(),
  ingestUrl: text("ingest_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
