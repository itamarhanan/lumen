import { createClient } from "@lumen/clickhouse";
import { z } from "zod";
import { authedProcedure, t } from "../init";

const ch = createClient({ database: "lumen" });

function escape(s: string) {
  return s.replace(/'/g, "\\'");
}

function chDate(s: string) {
  return s.replace("T", " ").replace("Z", "").slice(0, 23);
}

async function fetchOverviewMetrics(
  projectId: string,
  from: string,
  to: string,
) {
  const rows = await ch.query<{
    pageviews: string;
    visitors: string;
    sessions: string;
    single_page_sessions: string;
  }>(
    `SELECT
       countIf(event_type = 'pageview')                        AS pageviews,
       uniqExact(session_id)                                   AS visitors,
       uniqExact(session_id)                                   AS sessions,
       uniqExactIf(session_id, event_type = 'pageview')        AS single_page_sessions
     FROM lumen.events
     WHERE project_id = '${escape(projectId)}'
       AND timestamp >= '${chDate(from)}'
       AND timestamp <= '${chDate(to)}'`,
  );

  const r = rows[0] ?? {
    pageviews: "0",
    visitors: "0",
    sessions: "0",
    single_page_sessions: "0",
  };
  const sessions = Number(r.sessions);
  const bounceRate =
    sessions > 0
      ? Math.round((Number(r.single_page_sessions) / sessions) * 100)
      : 0;

  return {
    pageviews: Number(r.pageviews),
    visitors: Number(r.visitors),
    sessions,
    bounceRate,
  };
}

export const analyticsRouter = t.router({
  overview: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        from: z.string(),
        to: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const intervalMs =
        new Date(input.to).getTime() - new Date(input.from).getTime();
      const prevTo = new Date(input.from).toISOString();
      const prevFrom = new Date(
        new Date(input.from).getTime() - intervalMs,
      ).toISOString();

      const [curr, prev] = await Promise.all([
        fetchOverviewMetrics(input.projectId, input.from, input.to),
        fetchOverviewMetrics(input.projectId, prevFrom, prevTo),
      ]);

      const delta = (c: number, p: number) =>
        p === 0 ? null : parseFloat((((c - p) / p) * 100).toFixed(1));

      return {
        ...curr,
        pageviewsDelta: delta(curr.pageviews, prev.pageviews),
        visitorsDelta: delta(curr.visitors, prev.visitors),
        sessionsDelta: delta(curr.sessions, prev.sessions),
        bounceRateDelta: delta(curr.bounceRate, prev.bounceRate),
      };
    }),

  timeseries: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        from: z.string(),
        to: z.string(),
        granularity: z.enum(["hour", "day"]).default("day"),
      }),
    )
    .query(async ({ input }) => {
      const bucket =
        input.granularity === "hour"
          ? "toStartOfHour(timestamp)"
          : "toDate(timestamp)";

      const rows = await ch.query<{
        date: string;
        pageviews: string;
        visitors: string;
      }>(
        `SELECT
           ${bucket}                           AS date,
           countIf(event_type = 'pageview')    AS pageviews,
           uniqExact(session_id)               AS visitors
         FROM lumen.events
         WHERE project_id = '${escape(input.projectId)}'
           AND timestamp >= '${chDate(input.from)}'
           AND timestamp <= '${chDate(input.to)}'
         GROUP BY date
         ORDER BY date ASC`,
      );

      return rows.map((r) => ({
        date: String(r.date),
        pageviews: Number(r.pageviews),
        visitors: Number(r.visitors),
      }));
    }),

  topPages: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        from: z.string(),
        to: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const rows = await ch.query<{
        path: string;
        pageviews: string;
      }>(
        `SELECT
           JSONExtractString(properties, 'url') AS path,
           count()                               AS pageviews
         FROM lumen.events
         WHERE project_id = '${escape(input.projectId)}'
           AND event_type = 'pageview'
           AND timestamp >= '${chDate(input.from)}'
           AND timestamp <= '${chDate(input.to)}'
         GROUP BY path
         ORDER BY pageviews DESC
         LIMIT 10`,
      );

      return rows.map((r) => ({
        path: r.path,
        pageviews: Number(r.pageviews),
        avgDuration: null as string | null,
      }));
    }),

  topSources: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        from: z.string(),
        to: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const rows = await ch.query<{
        name: string;
        visitors: string;
      }>(
        `SELECT
           multiIf(
             JSONExtractString(properties, 'referrer') = ''
               OR JSONExtractString(properties, 'referrer') IS NULL,
             'direct',
             domain(JSONExtractString(properties, 'referrer'))
           )               AS name,
           uniqExact(session_id) AS visitors
         FROM lumen.events
         WHERE project_id = '${escape(input.projectId)}'
           AND timestamp >= '${chDate(input.from)}'
           AND timestamp <= '${chDate(input.to)}'
         GROUP BY name
         ORDER BY visitors DESC
         LIMIT 10`,
      );

      const total = rows.reduce((s, r) => s + Number(r.visitors), 0);
      return rows.map((r) => ({
        name: r.name,
        visitors: Number(r.visitors),
        share: total > 0 ? Math.round((Number(r.visitors) / total) * 100) : 0,
      }));
    }),

  liveCount: authedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      // 5-min activity window, no Redis dependency from tRPC layer
      const from = chDate(new Date(Date.now() - 5 * 60 * 1000).toISOString());
      const rows = await ch.query<{ count: string }>(
        `SELECT uniqExact(session_id) AS count
         FROM lumen.events
         WHERE project_id = '${escape(input.projectId)}'
           AND timestamp >= '${from}'`,
      );
      return Number(rows[0]?.count ?? 0);
    }),
});
