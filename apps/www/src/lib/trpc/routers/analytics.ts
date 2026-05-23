import { createClient } from "@lumen/clickhouse";
import { z } from "zod";
import { authedProcedure, t } from "../init";

const ch = createClient({ database: "lumen" });

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
      const rows = await ch.query<{
        pageviews: string;
        visitors: string;
        total_events: string;
      }>(
        `SELECT
          countIf(event_type = 'pageview') AS pageviews,
          uniqExact(session_id) AS visitors,
          count(*) AS total_events
        FROM lumen.events
        WHERE project_id = '${input.projectId}'
          AND timestamp >= '${input.from}'
          AND timestamp <= '${input.to}'`,
      );

      const row = rows[0] ?? { pageviews: "0", visitors: "0", total_events: "0" };

      return {
        pageviews: Number(row.pageviews),
        visitors: Number(row.visitors),
        totalEvents: Number(row.total_events),
        bounceRate: Number(row.visitors) > 0
          ? Math.round((1 - Number(row.pageviews) / Number(row.visitors)) * 100)
          : 0,
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
      const interval = input.granularity === "hour" ? "toStartOfHour(timestamp)" : "toDate(timestamp)";

      const rows = await ch.query<{
        date: string;
        pageviews: string;
        visitors: string;
      }>(
        `SELECT
          ${interval} AS date,
          countIf(event_type = 'pageview') AS pageviews,
          uniqExact(session_id) AS visitors
        FROM lumen.events
        WHERE project_id = '${input.projectId}'
          AND timestamp >= '${input.from}'
          AND timestamp <= '${input.to}'
        GROUP BY date
        ORDER BY date ASC`,
      );

      return rows.map((r) => ({
        date: r.date,
        pageviews: Number(r.pageviews),
        visitors: Number(r.visitors),
      }));
    }),
});
