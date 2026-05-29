import { createClient } from "@lumen/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authedProcedure, t } from "../init";
import * as schema from "@lumen/db/schema";

const PropertySchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    type: z.enum(["string", "number", "boolean", "date", "object", "array"]),
    required: z.boolean().optional(),
    description: z.string().optional(),
    properties: z.record(z.string(), PropertySchema).optional(),
  }),
);

const PropertiesSchema = z.record(z.string(), PropertySchema);

export const schemasRouter = t.router({
  list: authedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, close } = createClient("api");
      try {
        const site = await db.query.sites.findFirst({
          where: (sites, { eq, and }) =>
            and(eq(sites.id, input.projectId), eq(sites.userId, ctx.user.id)),
        });
        if (!site) return [];

        const schemas = await db.query.eventSchemas.findMany({
          where: (es, { eq }) => eq(es.siteId, input.projectId),
          orderBy: (es, { asc }) => [asc(es.eventName)],
        });
        return schemas;
      } finally {
        await close();
      }
    }),

  getByName: authedProcedure
    .input(
      z.object({ projectId: z.string().uuid(), eventName: z.string().min(1) }),
    )
    .query(async ({ ctx, input }) => {
      const { db, close } = createClient("api");
      try {
        const site = await db.query.sites.findFirst({
          where: (sites, { eq, and }) =>
            and(eq(sites.id, input.projectId), eq(sites.userId, ctx.user.id)),
        });
        if (!site) return null;

        const es = await db.query.eventSchemas.findFirst({
          where: (eventSchemas, { eq, and }) =>
            and(
              eq(eventSchemas.siteId, input.projectId),
              eq(eventSchemas.eventName, input.eventName),
            ),
        });
        return es ?? null;
      } finally {
        await close();
      }
    }),

  upsert: authedProcedure
    .input(
      z.object({
        siteId: z.string().uuid(),
        eventName: z.string().min(1),
        description: z.string().optional(),
        propertiesSchema: PropertiesSchema,
        enforceStrict: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, close } = createClient("api");
      try {
        const site = await db.query.sites.findFirst({
          where: (sites, { eq, and }) =>
            and(eq(sites.id, input.siteId), eq(sites.userId, ctx.user.id)),
        });
        if (!site) throw new TRPCError({ code: "FORBIDDEN", message: "Site not found" });

        const existing = await db.query.eventSchemas.findFirst({
          where: (es, { eq, and }) =>
            and(eq(es.siteId, input.siteId), eq(es.eventName, input.eventName)),
        });

        if (existing) {
          const [updated] = await db
            .update(schema.eventSchemas)
            .set({
              description: input.description,
              propertiesSchema: input.propertiesSchema,
              enforceStrict: input.enforceStrict,
              updatedAt: new Date(),
            })
            .where(eq(schema.eventSchemas.id, existing.id))
            .returning();
          return updated;
        }

        const [created] = await db
          .insert(schema.eventSchemas)
          .values({
            siteId: input.siteId,
            eventName: input.eventName,
            description: input.description,
            propertiesSchema: input.propertiesSchema,
            enforceStrict: input.enforceStrict,
          })
          .returning();
        return created;
      } finally {
        await close();
      }
    }),

  delete: authedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, close } = createClient("api");
      try {
        const es = await db.query.eventSchemas.findFirst({
          where: (eventSchemas, { eq }) => eq(eventSchemas.id, input.id),
        });
        if (!es) throw new TRPCError({ code: "NOT_FOUND" });

        const site = await db.query.sites.findFirst({
          where: (sites, { eq, and }) =>
            and(eq(sites.id, es.siteId), eq(sites.userId, ctx.user.id)),
        });
        if (!site) throw new TRPCError({ code: "FORBIDDEN" });

        await db
          .delete(schema.eventSchemas)
          .where(eq(schema.eventSchemas.id, input.id));
        return { success: true as const };
      } finally {
        await close();
      }
    }),
});
