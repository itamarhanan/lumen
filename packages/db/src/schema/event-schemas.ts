import { pgTable, uuid, text, timestamp, jsonb, boolean, unique } from "drizzle-orm/pg-core";
import { sites } from "./sites";

export const eventSchemas = pgTable(
  "event_schemas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    eventName: text("event_name").notNull(),
    description: text("description"),
    propertiesSchema: jsonb("properties_schema").notNull(),
    enforceStrict: boolean("enforce_strict").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("uq_event_schemas_site_event").on(table.siteId, table.eventName),
  ],
);
