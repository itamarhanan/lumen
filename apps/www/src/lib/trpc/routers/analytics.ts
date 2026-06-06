import { createClient } from "@lumen/clickhouse";
import { z } from "zod";
import { authedProcedure, t } from "../init";
import { normalizePath } from "@/lib/analytics/normalize-path";

const ch = createClient({ database: "lumen" });

function toChDate(iso: string): string {
  return iso.replace("T", " ").replace("Z", "").slice(0, 23);
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
     WHERE project_id = {project_id: String}
       AND timestamp >= {from: String}
       AND timestamp <= {to: String}`,
    { project_id: projectId, from: toChDate(from), to: toChDate(to) },
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
         WHERE project_id = {project_id: String}
           AND timestamp >= {from: String}
           AND timestamp <= {to: String}
         GROUP BY date
         ORDER BY date ASC`,
        {
          project_id: input.projectId,
          from: toChDate(input.from),
          to: toChDate(input.to),
        },
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
         WHERE project_id = {project_id: String}
           AND event_type = 'pageview'
           AND timestamp >= {from: String}
           AND timestamp <= {to: String}
         GROUP BY path
         ORDER BY pageviews DESC
         LIMIT 10`,
        {
          project_id: input.projectId,
          from: toChDate(input.from),
          to: toChDate(input.to),
        },
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
         WHERE project_id = {project_id: String}
           AND timestamp >= {from: String}
           AND timestamp <= {to: String}
         GROUP BY name
         ORDER BY visitors DESC
         LIMIT 10`,
        {
          project_id: input.projectId,
          from: toChDate(input.from),
          to: toChDate(input.to),
        },
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
      const from = toChDate(new Date(Date.now() - 5 * 60 * 1000).toISOString());
      const rows = await ch.query<{ count: string }>(
        `SELECT uniqExact(session_id) AS count
         FROM lumen.events
         WHERE project_id = {project_id: String}
           AND timestamp >= {from: String}`,
        { project_id: input.projectId, from },
      );
      return Number(rows[0]?.count ?? 0);
    }),

  journeys: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        from: z.string(),
        to: z.string(),
        limit: z.number().int().positive().default(10_000),
      }),
    )
    .query(async ({ input }) => {
      const { projectId, limit } = input;
      const from = toChDate(input.from);
      const to = toChDate(input.to);

      const [totalRows] = await ch.query<{ total: string }>(
        `SELECT uniqExact(session_id) AS total
         FROM lumen.events
         WHERE project_id = {project_id: String}
           AND event_type = 'pageview'
           AND timestamp >= {from: String}
           AND timestamp <= {to: String}`,
        { project_id: projectId, from, to },
      );
      const total = Number(totalRows?.total ?? 0);

      if (total === 0) {
        return { transitions: [], sessions: [], total: 0 };
      }

      type SessionRow = {
        session_id: string;
        person_id: string;
        urls: string[];
        timestamps: string[];
        started_at: string;
        ended_at: string;
        page_count: string;
        browser: string;
        device: string;
        os: string;
        country: string;
      };

      const rows = await ch.query<SessionRow>(
        `SELECT
           session_id,
           any(person_id)                                                     AS person_id,
           groupArray(JSONExtractString(properties, 'url') ORDER BY timestamp ASC) AS urls,
           groupArray(timestamp ORDER BY timestamp ASC)                       AS timestamps,
           min(timestamp)                                                     AS started_at,
           max(timestamp)                                                     AS ended_at,
           count()                                                            AS page_count,
           any(JSONExtractString(properties, 'browser'))                      AS browser,
           any(JSONExtractString(properties, 'device'))                       AS device,
           any(JSONExtractString(properties, 'os'))                           AS os,
           any(JSONExtractString(properties, 'geo_country'))                  AS country
         FROM lumen.events
         WHERE project_id = {project_id: String}
           AND event_type = 'pageview'
           AND timestamp >= {from: String}
           AND timestamp <= {to: String}
         GROUP BY session_id
         ORDER BY started_at DESC
         LIMIT {limit: UInt32}`,
        { project_id: projectId, from, to, limit },
      );

      const sessions = rows.map((r) => {
        const paired = r.urls
          .map((url, i) => ({ url, ts: r.timestamps[i] }))
          .filter((p): p is { url: string; ts: string } => p.url != null && p.url !== "");
        const path = paired.map((p) => normalizePath(p.url));
        const timestamps = paired.map((p) => p.ts);
        const startedAt = r.started_at;
        const endedAt = r.ended_at;
        const durationSec = Math.round(
          (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
        );

        return {
          sessionId: r.session_id,
          personId: r.person_id,
          pages: Number(r.page_count),
          duration: Math.max(0, durationSec),
          startedAt,
          entryPage: path[0] ?? "/",
          exitPage: path[path.length - 1] ?? "/",
          path,
          timestamps,
          browser: r.browser || null,
          device: r.device || null,
          os: r.os || null,
          country: r.country || null,
        };
      });

      const transitionCounts = new Map<string, number>();
      for (const s of sessions) {
        if (s.path.length < 2) continue;
        for (let i = 0; i < s.path.length - 1; i++) {
          const key = `${s.path[i]}\0${s.path[i + 1]}`;
          transitionCounts.set(key, (transitionCounts.get(key) ?? 0) + 1);
        }
      }

      const transitions = [...transitionCounts.entries()]
        .map(([key, value]) => {
          const sep = key.indexOf("\0");
          return {
            source: key.slice(0, sep),
            target: key.slice(sep + 1),
            value,
          };
        })
        .sort((a, b) => b.value - a.value);

      return { transitions, sessions, total };
    }),
});
