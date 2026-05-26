import { pgTable, uuid, text, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { sites } from "./sites";

export const eventDefinitions = pgTable(
  "event_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    eventName: text("event_name").notNull(),
    description: text("description"),
    color: text("color"),
    propertySchema: jsonb("property_schema").$type<Record<string, { type: "string" | "number" | "boolean"; description?: string }>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("uq_event_definitions_site_event").on(table.siteId, table.eventName),
  ],
);
