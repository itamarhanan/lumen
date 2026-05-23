import { createClient } from "@lumen/db";
import { z } from "zod";
import { authedProcedure, t } from "../init";

export const sitesRouter = t.router({
  list: authedProcedure.query(async ({ ctx }) => {
    const { db, close } = createClient("api");
    try {
      const sites = await db.query.sites.findMany({
        where: (sites, { eq }) => eq(sites.userId, ctx.user.id),
      });
      return sites;
    } finally {
      await close();
    }
  }),

  getByPublicId: authedProcedure
    .input(z.object({ publicId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db, close } = createClient("api");
      try {
        const site = await db.query.sites.findFirst({
          where: (sites, { eq, and }) =>
            and(eq(sites.publicId, input.publicId), eq(sites.userId, ctx.user.id)),
        });
        return site ?? null;
      } finally {
        await close();
      }
    }),
});
