import { t } from "./init";
import { analyticsRouter } from "./routers/analytics";
import { sitesRouter } from "./routers/sites";

export const appRouter = t.router({
  sites: sitesRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
