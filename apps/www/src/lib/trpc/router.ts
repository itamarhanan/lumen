import { t } from "./init";
import { analyticsRouter } from "./routers/analytics";
import { sitesRouter } from "./routers/sites";
import { eventsRouter } from "./routers/events";
import { schemasRouter } from "./routers/schemas";

export const appRouter = t.router({
  sites: sitesRouter,
  analytics: analyticsRouter,
  events: eventsRouter,
  schemas: schemasRouter,
});

export type AppRouter = typeof appRouter;
