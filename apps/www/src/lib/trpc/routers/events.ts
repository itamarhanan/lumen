import { createClient } from "@lumen/clickhouse";
import { z } from "zod";
import { authedProcedure, t } from "../init";

const ch = createClient({ database: "lumen" });

function toChDate(iso: string): string {
  return iso.replace("T", " ").replace("Z", "").slice(0, 23);
}

function buildBucket(granularity: string): string {
  switch (granularity) {
    case "hour":
      return "toStartOfHour(timestamp)";
    case "day":
      return "toDate(timestamp)";
    case "week":
      return "toMonday(timestamp)";
    default:
      return "toDate(timestamp)";
  }
}

export const eventsRouter = t.router({
  list: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        from: z.string(),
        to: z.string(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(50),
        eventType: z.string().optional(),
        eventName: z.string().optional(),
        personId: z.string().optional(),
        propertyFilters: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
      }),
    )
    .query(async ({ input }) => {
      const conditions: string[] = [
        "project_id = {projectId: String}",
        "timestamp >= {from: String}",
        "timestamp <= {to: String}",
      ];
      const params: Record<string, unknown> = {
        projectId: input.projectId,
        from: toChDate(input.from),
        to: toChDate(input.to),
      };

      if (input.cursor) {
        conditions.push("timestamp <= {cursor: String}");
        params.cursor = toChDate(input.cursor);
      }

      if (input.eventType) {
        conditions.push("event_type = {eventType: String}");
        params.eventType = input.eventType;
      }

      if (input.eventName) {
        conditions.push("event_name = {eventName: String}");
        params.eventName = input.eventName;
      }

      if (input.personId) {
        conditions.push("person_id = {personId: String}");
        params.personId = input.personId;
      }

      if (input.propertyFilters) {
        input.propertyFilters.forEach((f, i) => {
          conditions.push(`JSONExtractString(properties, {pk${i}: String}) = {pv${i}: String}`);
          params[`pk${i}`] = f.key;
          params[`pv${i}`] = f.value;
        });
      }

      const where = conditions.join(" AND ");
      const take = input.limit + 1;

      const rows = await ch.query<{
        event_id: string;
        event_type: string;
        event_name: string;
        properties: string;
        person_id: string;
        session_id: string;
        project_id: string;
        source: string;
        timestamp: string;
      }>(
        `SELECT
           event_id, event_type, event_name, properties,
           person_id, session_id, project_id, source, timestamp
         FROM lumen.events
         WHERE ${where}
         ORDER BY timestamp DESC
         LIMIT {take: UInt32}`,
        { ...params, take },
      );

      const hasMore = rows.length > input.limit;
      const events = hasMore ? rows.slice(0, input.limit) : rows;
      const nextCursor = hasMore ? events[events.length - 1]!.timestamp : null;

      return { events, nextCursor };
    }),

  distribution: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        from: z.string(),
        to: z.string(),
        granularity: z.enum(["hour", "day", "week"]).default("day"),
      }),
    )
    .query(async ({ input }) => {
      const bucket = buildBucket(input.granularity);

      const rows = await ch.query<{
        date: string;
        event_name: string;
        count: string;
      }>(
        `SELECT
           ${bucket} AS date,
           event_name,
           count() AS count
         FROM lumen.events
         WHERE project_id = {projectId: String}
           AND timestamp >= {from: String}
           AND timestamp <= {to: String}
         GROUP BY date, event_name
         ORDER BY date ASC`,
        {
          projectId: input.projectId,
          from: toChDate(input.from),
          to: toChDate(input.to),
        },
      );

      return rows.map((r) => ({
        date: String(r.date),
        eventName: r.event_name,
        count: Number(r.count),
      }));
    }),

  person: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        personId: z.string(),
        limit: z.number().int().min(1).max(100).default(10),
      }),
    )
    .query(async ({ input }) => {
      const [profiles, recentEvents] = await Promise.all([
        ch.query<{
          person_id: string;
          project_id: string;
          is_identified: string;
          properties: string;
          first_seen_at: string;
          updated_at: string;
        }>(
          `SELECT
             person_id, project_id, is_identified, properties,
             first_seen_at, updated_at
           FROM lumen.person_profiles FINAL
           WHERE project_id = {projectId: String}
             AND person_id = {personId: String}`,
          { projectId: input.projectId, personId: input.personId },
        ),
        ch.query<{
          event_id: string;
          event_type: string;
          event_name: string;
          properties: string;
          person_id: string;
          session_id: string;
          project_id: string;
          source: string;
          timestamp: string;
        }>(
          `SELECT
             event_id, event_type, event_name, properties,
             person_id, session_id, project_id, source, timestamp
           FROM lumen.events
           WHERE project_id = {projectId: String}
             AND person_id = {personId: String}
           ORDER BY timestamp DESC
           LIMIT {limit: UInt32}`,
          { projectId: input.projectId, personId: input.personId, limit: input.limit },
        ),
      ]);

      return {
        profile: profiles[0] ?? null,
        recentEvents,
      };
    }),
});
