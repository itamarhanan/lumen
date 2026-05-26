import { t } from "./init";
import { analyticsRouter } from "./routers/analytics";
import { sitesRouter } from "./routers/sites";
import { eventsRouter } from "./routers/events";

export const appRouter = t.router({
  sites: sitesRouter,
  analytics: analyticsRouter,
  events: eventsRouter,
});

export type AppRouter = typeof appRouter;
