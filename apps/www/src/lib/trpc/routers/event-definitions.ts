import { createClient } from "@lumen/db";
import { eventDefinitions } from "@lumen/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { authedProcedure, t } from "../init";

const propertySchemaEntry = z.object({
  type: z.enum(["string", "number", "boolean"]),
  description: z.string().optional(),
});

const upsertInput = z.object({
  projectId: z.string(),
  eventName: z.string(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  propertySchema: z.record(z.string(), propertySchemaEntry).nullable().optional(),
});

export const eventDefinitionsRouter = t.router({
  list: authedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const { db, close } = createClient("api");
      try {
        const rows = await db
          .select()
          .from(eventDefinitions)
          .where(eq(eventDefinitions.siteId, input.projectId));
        return rows;
      } finally {
        await close();
      }
    }),

  upsert: authedProcedure
    .input(upsertInput)
    .mutation(async ({ input }) => {
      const { db, close } = createClient("api");
      try {
        const existing = await db
          .select({ id: eventDefinitions.id })
          .from(eventDefinitions)
          .where(
            and(
              eq(eventDefinitions.siteId, input.projectId),
              eq(eventDefinitions.eventName, input.eventName),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          const [updated] = await db
            .update(eventDefinitions)
            .set({
              description: input.description ?? null,
              color: input.color ?? null,
              propertySchema: (input.propertySchema ?? null) as Record<string, { type: "string" | "number" | "boolean"; description?: string }> | null,
              updatedAt: new Date(),
            })
            .where(eq(eventDefinitions.id, existing[0]!.id))
            .returning();
          return updated;
        }

        const [created] = await db
          .insert(eventDefinitions)
          .values({
            siteId: input.projectId,
            eventName: input.eventName,
            description: input.description ?? null,
            color: input.color ?? null,
            propertySchema: (input.propertySchema ?? null) as Record<string, { type: "string" | "number" | "boolean"; description?: string }> | null,
          })
          .returning();
        return created;
      } finally {
        await close();
      }
    }),

  delete: authedProcedure
    .input(z.object({ projectId: z.string(), eventName: z.string() }))
    .mutation(async ({ input }) => {
      const { db, close } = createClient("api");
      try {
        await db
          .delete(eventDefinitions)
          .where(
            and(
              eq(eventDefinitions.siteId, input.projectId),
              eq(eventDefinitions.eventName, input.eventName),
            ),
          );
      } finally {
        await close();
      }
    }),
});
