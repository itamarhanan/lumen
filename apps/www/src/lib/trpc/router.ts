import { t } from "./init";
import { analyticsRouter } from "./routers/analytics";
import { eventDefinitionsRouter } from "./routers/event-definitions";
import { sitesRouter } from "./routers/sites";

export const appRouter = t.router({
  sites: sitesRouter,
  analytics: analyticsRouter,
  eventDefinitions: eventDefinitionsRouter,
});

export type AppRouter = typeof appRouter;
