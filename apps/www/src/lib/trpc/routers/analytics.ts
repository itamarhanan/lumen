import { createClient } from "@lumen/clickhouse";
import { createClient as createDbClient } from "@lumen/db";
import { sessions } from "@lumen/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { authedProcedure, t } from "../init";

const ch = createClient({ database: "lumen" });

function toChDate(iso: string): string {
  return iso.replace("T", " ").replace("Z", "").slice(0, 23);
}

export type DiscoveredProperty = { key: string; type: string };

export async function discoverSchema(
  chClient: typeof ch,
  projectId: string,
  pFrom: string,
  pTo: string,
  options?: { sample?: number },
): Promise<Map<string, Array<DiscoveredProperty>>> {
  const sample = options?.sample ?? 1000;

  const rows = await chClient.query<{
    event_name: string;
    key: string;
    type: string;
  }>(
    `SELECT
       event_name,
       key,
       any(
         multiIf(
           JSONExtract(properties, key, 'String') IN ('true', 'false'), 'boolean',
           JSONExtract(properties, key, 'String') LIKE '[%', 'array',
           JSONExtract(properties, key, 'String') LIKE '{%', 'object',
           isFinite(toFloat64OrNull(JSONExtract(properties, key, 'String'))), 'number',
           'string'
         )
       ) AS type
     FROM (
       SELECT
         event_name,
         properties,
         arrayJoin(JSONExtractKeys(properties)) AS key
       FROM (
         SELECT event_name, properties
         FROM lumen.events
         WHERE project_id = {project_id: String}
           AND event_type = 'custom'
           AND timestamp >= {from: String}
           AND timestamp <= {to: String}
         ORDER BY timestamp DESC
         LIMIT {sample: UInt64} BY event_name
       )
     )
     GROUP BY event_name, key
     ORDER BY event_name, key`,
    {
      project_id: projectId,
      from: toChDate(pFrom),
      to: toChDate(pTo),
      sample,
    },
  );

  const map = new Map<string, Array<DiscoveredProperty>>();
  for (const r of rows) {
    if (!map.has(r.event_name)) map.set(r.event_name, []);
    map.get(r.event_name)!.push({ key: String(r.key), type: String(r.type) });
  }
  return map;
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
        { project_id: input.projectId, from: toChDate(input.from), to: toChDate(input.to) },
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
        { project_id: input.projectId, from: toChDate(input.from), to: toChDate(input.to) },
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
        { project_id: input.projectId, from: toChDate(input.from), to: toChDate(input.to) },
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

  eventsSummary: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        from: z.string(),
        to: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const rows = await ch.query<{
        event_names: string;
        occurrences: string;
        users: string;
      }>(
        `SELECT
           count(DISTINCT event_name)  AS event_names,
           count()                     AS occurrences,
           uniqExact(actor_id)         AS users
         FROM lumen.events
         WHERE project_id = {project_id: String}
           AND event_type = 'custom'
           AND timestamp >= {from: String}
           AND timestamp <= {to: String}`,
        { project_id: input.projectId, from: toChDate(input.from), to: toChDate(input.to) },
      );

      const r = rows[0] ?? { event_names: "0", occurrences: "0", users: "0" };
      return {
        totalEventNames: Number(r.event_names),
        totalOccurrences: Number(r.occurrences),
        totalUsers: Number(r.users),
      };
    }),

  events: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        from: z.string(),
        to: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const rows = await ch.query<{
        event_name: string;
        volume: string;
      }>(
        `SELECT
           event_name,
           count()                    AS volume
         FROM lumen.events
         WHERE project_id = {project_id: String}
           AND event_type = 'custom'
           AND timestamp >= {from: String}
           AND timestamp <= {to: String}
         GROUP BY event_name
         ORDER BY volume DESC
         LIMIT 10`,
        {
          project_id: input.projectId,
          from: toChDate(input.from),
          to: toChDate(input.to),
        },
      );

      return rows.map((r) => ({
        name: r.event_name,
        volume: Number(r.volume),
      }));
    }),

  eventFeed: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        from: z.string(),
        to: z.string(),
        page: z.number().min(1).default(1),
        eventName: z.string().optional(),
        date: z.string().optional(),
        search: z.string().optional(),
        properties: z
          .array(
            z.object({
              path: z.string(),
              type: z.enum(["string", "number", "boolean"]),
              operator: z.enum(["eq", "neq", "gt", "lt", "contains"]),
              value: z.string(),
            }),
          )
          .optional(),
      }),
    )
    .query(async ({ input }) => {
      const limit = 20;
      const offset = (input.page - 1) * limit;

      const clauses: string[] = [];
      const params: Record<string, string | number> = {
        project_id: input.projectId,
        from: toChDate(input.from),
        to: toChDate(input.to),
      };

      if (input.eventName) {
        clauses.push(`AND event_name = {event_name: String}`);
        params.event_name = input.eventName;
      }

      if (input.date) {
        clauses.push(`AND toDate(timestamp) = {filter_date: Date}`);
        params.filter_date = input.date;
      }

      if (input.search) {
        clauses.push(`AND event_name ILIKE {search: String}`);
        params.search = `%${input.search}%`;
      }

      if (input.properties) {
        input.properties.forEach((p, i) => {
          const valKey = `prop_val_${i}`;
          const pathKey = `prop_path_${i}`;

          const extractFn =
            p.type === "number"
              ? "JSONExtractFloat"
              : "JSONExtractString";

          if (p.operator === "contains") {
            clauses.push(
              `AND ${extractFn}(properties, {${pathKey}: String}) ILIKE {${valKey}: String}`,
            );
            params[pathKey] = p.path;
            params[valKey] = `%${p.value}%`;
          } else {
            const sqlOp =
              p.operator === "eq"
                ? "="
                : p.operator === "neq"
                  ? "!="
                  : p.operator;
            clauses.push(
              `AND ${extractFn}(properties, {${pathKey}: String}) ${sqlOp} {${valKey}: String}`,
            );
            params[pathKey] = p.path;
            params[valKey] = p.value;
          }
        });
      }

      const filterClause = clauses.join(" ");

      const [rows, totalRows] = await Promise.all([
        ch.query<{
          event_name: string;
          timestamp: string;
          actor_id: string;
          session_id: string;
          properties: string;
        }>(
          `SELECT
             event_name,
             timestamp,
             actor_id,
             session_id,
             properties
           FROM lumen.events
           WHERE project_id = {project_id: String}
             AND event_type = 'custom'
             AND timestamp >= {from: String}
             AND timestamp <= {to: String}
             ${filterClause}
           ORDER BY timestamp DESC
           LIMIT {limit: UInt64}
           OFFSET {offset: UInt64}`,
          {
            ...params,
            limit,
            offset,
          } as Record<string, string | number>,
        ),
        ch.query<{ total: string }>(
          `SELECT count() AS total
           FROM lumen.events
           WHERE project_id = {project_id: String}
             AND event_type = 'custom'
             AND timestamp >= {from: String}
             AND timestamp <= {to: String}
             ${filterClause}`,
          params as Record<string, string | number>,
        ),
      ]);

      return {
        events: rows.map((r) => ({
          eventName: r.event_name,
          timestamp: r.timestamp,
          visitorId: r.actor_id,
          sessionId: r.session_id,
          properties: (() => {
            try {
              return JSON.parse(r.properties);
            } catch {
              return {};
            }
          })() as Record<string, unknown>,
        })),
        total: Number(totalRows[0]?.total ?? 0),
        page: input.page,
        totalPages: Math.ceil(Number(totalRows[0]?.total ?? 0) / limit),
      };
    }),

  eventDetail: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        eventName: z.string(),
        from: z.string(),
        to: z.string(),
        page: z.number().min(1).default(1),
      }),
    )
    .query(async ({ input }) => {
      const limit = 20;
      const offset = (input.page - 1) * limit;

      const [rows, totalRows] = await Promise.all([
        ch.query<{
          timestamp: string;
          session_id: string;
          properties: string;
        }>(
          `SELECT
             timestamp,
             session_id,
             properties
           FROM lumen.events
           WHERE project_id = {project_id: String}
             AND event_type = 'custom'
             AND event_name = {event_name: String}
             AND timestamp >= {from: String}
             AND timestamp <= {to: String}
           ORDER BY timestamp DESC
           LIMIT {limit: UInt64}
           OFFSET {offset: UInt64}`,
          {
            project_id: input.projectId,
            event_name: input.eventName,
            from: toChDate(input.from),
            to: toChDate(input.to),
            limit,
            offset,
          },
        ),
        ch.query<{ total: string }>(
          `SELECT count() AS total
           FROM lumen.events
           WHERE project_id = {project_id: String}
             AND event_type = 'custom'
             AND event_name = {event_name: String}
             AND timestamp >= {from: String}
             AND timestamp <= {to: String}`,
          { project_id: input.projectId, event_name: input.eventName, from: toChDate(input.from), to: toChDate(input.to) },
        ),
      ]);

      return {
        occurrences: rows.map((r) => ({
          timestamp: r.timestamp,
          sessionId: r.session_id,
          properties: (() => { try { return JSON.parse(r.properties); } catch { return {}; } })() as Record<string, unknown>,
        })),
        total: Number(totalRows[0]?.total ?? 0),
        page: input.page,
        totalPages: Math.ceil(Number(totalRows[0]?.total ?? 0) / limit),
      };
    }),

  eventsTimeseries: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        from: z.string(),
        to: z.string(),
        granularity: z.enum(["hour", "day", "week"]).default("day"),
        eventName: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const bucket =
        input.granularity === "hour"
          ? "toStartOfHour(timestamp)"
          : input.granularity === "week"
            ? "toMonday(timestamp)"
            : "toDate(timestamp)";

      const filterClause = input.eventName
        ? `AND event_name = {event_name: String}`
        : "";

      const rows = await ch.query<{
        date: string;
        event_name: string;
        volume: string;
      }>(
        `SELECT
           ${bucket}              AS date,
           event_name,
           count()                AS volume
         FROM lumen.events
         WHERE project_id = {project_id: String}
           AND event_type = 'custom'
           AND timestamp >= {from: String}
           AND timestamp <= {to: String}
           ${filterClause}
         GROUP BY date, event_name
         ORDER BY date ASC, volume DESC`,
        {
          project_id: input.projectId,
          from: toChDate(input.from),
          to: toChDate(input.to),
          ...(input.eventName ? { event_name: input.eventName } : {}),
        },
      );

      return rows.map((r) => ({
        date: String(r.date),
        eventName: r.event_name,
        volume: Number(r.volume),
      }));
    }),

  sessionDetail: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        sessionId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const [sessionRows, timelineRows] = await Promise.all([
        (async () => {
          const pg = createDbClient("api");
          try {
            return await pg.db
              .select()
              .from(sessions)
              .where(
                and(
                  eq(sessions.siteId, input.projectId),
                  eq(sessions.sessionId, input.sessionId),
                ),
              )
              .limit(1);
          } finally {
            pg.close();
          }
        })(),
        ch.query<{
          event_name: string;
          timestamp: string;
          properties: string;
        }>(
          `SELECT
             event_name,
             timestamp,
             properties
           FROM lumen.events
           WHERE project_id = {project_id: String}
             AND session_id = {session_id: String}
           ORDER BY timestamp ASC`,
          { project_id: input.projectId, session_id: input.sessionId },
        ),
      ]);

      const session = sessionRows[0] ?? null;

      return {
        autoProperties: {
          browser: session?.browser ?? null,
          device: session?.device ?? null,
          country: session?.country ?? null,
          os: session?.os ?? null,
          referrer: session?.referrer ?? null,
          entryPage: session?.entryPage ?? null,
        },
        developerProperties: (session?.sessionProperties ?? null) as Record<string, unknown> | null,
        timeline: timelineRows.map((r) => ({
          eventName: r.event_name,
          timestamp: r.timestamp,
          properties: (() => {
            try { return JSON.parse(r.properties); } catch { return {}; }
          })() as Record<string, unknown>,
        })),
      };
    }),

  personDetail: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        visitorId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const chRows = await ch.query<{
        event_name: string;
        timestamp: string;
        session_id: string;
        properties: string;
      }>(
        `SELECT
           event_name,
           timestamp,
           session_id,
           properties
         FROM lumen.events
         WHERE project_id = {project_id: String}
           AND actor_id = {actor_id: String}
         ORDER BY timestamp ASC
         LIMIT 1000`,
        { project_id: input.projectId, actor_id: input.visitorId },
      );

      if (chRows.length === 0) return null;

      const sessionIds = [...new Set(chRows.map((r) => r.session_id))];

      const pg = createDbClient("api");
      let sessionRows: Array<{
        sessionId: string;
        browser: string | null;
        device: string | null;
        os: string | null;
        country: string | null;
        referrer: string | null;
        entryPage: string | null;
        sessionProperties: unknown;
      }> = [];
      try {
        sessionRows = await pg.db
          .select({
            sessionId: sessions.sessionId,
            browser: sessions.browser,
            device: sessions.device,
            os: sessions.os,
            country: sessions.country,
            referrer: sessions.referrer,
            entryPage: sessions.entryPage,
            sessionProperties: sessions.sessionProperties,
          })
          .from(sessions)
          .where(
            and(
              eq(sessions.siteId, input.projectId),
              inArray(sessions.sessionId, sessionIds),
            ),
          );
      } finally {
        pg.close();
      }

      const sessionMap = new Map(
        sessionRows.map((s) => [
          s.sessionId,
          {
            browser: s.browser,
            device: s.device,
            os: s.os,
            country: s.country,
            referrer: s.referrer,
            entryPage: s.entryPage,
            sessionProperties:
              s.sessionProperties && typeof s.sessionProperties === "object"
                ? (s.sessionProperties as Record<string, unknown>)
                : {},
          },
        ]),
      );

      const mergedProperties: Record<string, unknown> = {};
      for (const s of sessionRows) {
        if (
          s.sessionProperties &&
          typeof s.sessionProperties === "object" &&
          !Array.isArray(s.sessionProperties)
        ) {
          Object.assign(
            mergedProperties,
            s.sessionProperties as Record<string, unknown>,
          );
        }
      }

      const sessionGroups = new Map<
        string,
        {
          sessionId: string;
          browser: string | null;
          device: string | null;
          os: string | null;
          country: string | null;
          referrer: string | null;
          entryPage: string | null;
          events: Array<{
            eventName: string;
            timestamp: string;
            properties: Record<string, unknown>;
          }>;
        }
      >();

      for (const row of chRows) {
        if (!sessionGroups.has(row.session_id)) {
          const meta = sessionMap.get(row.session_id);
          sessionGroups.set(row.session_id, {
            sessionId: row.session_id,
            browser: meta?.browser ?? null,
            device: meta?.device ?? null,
            os: meta?.os ?? null,
            country: meta?.country ?? null,
            referrer: meta?.referrer ?? null,
            entryPage: meta?.entryPage ?? null,
            events: [],
          });
        }
        const group = sessionGroups.get(row.session_id)!;
        group.events.push({
          eventName: row.event_name,
          timestamp: row.timestamp,
          properties: (() => {
            try {
              return JSON.parse(row.properties);
            } catch {
              return {};
            }
          })(),
        });
      }

      const sortedSessions = [...sessionGroups.values()].sort((a, b) => {
        const aLast = a.events[a.events.length - 1]?.timestamp ?? "";
        const bLast = b.events[b.events.length - 1]?.timestamp ?? "";
        return bLast.localeCompare(aLast);
      });

      const firstSeen = chRows[0]!.timestamp;
      const lastSeen = chRows[chRows.length - 1]!.timestamp;

      return {
        visitorId: input.visitorId,
        properties: mergedProperties,
        sessions: sortedSessions,
        firstSeen,
        lastSeen,
        totalEvents: chRows.length,
        totalSessions: sortedSessions.length,
      };
    }),

  eventBreakdown: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        eventName: z.string(),
        from: z.string(),
        to: z.string(),
        propertyPath: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const rows = await ch.query<{
        value: string;
        count: string;
      }>(
        `SELECT
           JSONExtractString(properties, {property_path: String}) AS value,
           count()                                                AS count
         FROM lumen.events
         WHERE project_id = {project_id: String}
           AND event_type = 'custom'
           AND event_name = {event_name: String}
           AND timestamp >= {from: String}
           AND timestamp <= {to: String}
         GROUP BY value
         ORDER BY count DESC
         LIMIT 10`,
        {
          project_id: input.projectId,
          event_name: input.eventName,
          from: toChDate(input.from),
          to: toChDate(input.to),
          property_path: input.propertyPath,
        },
      );

      const total = rows.reduce((s, r) => s + Number(r.count), 0);
      return rows.map((r) => ({
        value: r.value,
        count: Number(r.count),
        percentage: total > 0 ? Math.round((Number(r.count) / total) * 100) : 0,
      }));
    }),

  eventTypes: authedProcedure
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

      async function fetchTypes(pFrom: string, pTo: string) {
        return ch.query<{
          event_name: string;
          volume: string;
          users: string;
          last_seen: string;
        }>(
          `SELECT
             event_name,
             count()                    AS volume,
             uniqExact(actor_id)        AS users,
             max(timestamp)             AS last_seen
           FROM lumen.events
           WHERE project_id = {project_id: String}
             AND event_type = 'custom'
             AND timestamp >= {from: String}
             AND timestamp <= {to: String}
           GROUP BY event_name
           ORDER BY volume DESC`,
          { project_id: input.projectId, from: toChDate(pFrom), to: toChDate(pTo) },
        );
      }

      const [currRows, prevRows] = await Promise.all([
        fetchTypes(input.from, input.to),
        fetchTypes(prevFrom, prevTo),
      ]);

      const prevMap = new Map(
        prevRows.map((r) => [r.event_name, Number(r.volume)]),
      );

      const schemaMap = await discoverSchema(ch, input.projectId, input.from, input.to);

      const totalVolume = currRows.reduce(
        (sum, r) => sum + Number(r.volume),
        0,
      );

      return {
        totalVolume,
        eventTypes: currRows.map((r) => {
          const prevVolume = prevMap.get(r.event_name) ?? 0;
          const trend =
            prevVolume === 0
              ? null
              : parseFloat(
                  (
                    ((Number(r.volume) - prevVolume) / prevVolume) *
                    100
                  ).toFixed(1),
                );

          return {
            name: r.event_name,
            volume: Number(r.volume),
            users: Number(r.users),
            trend,
            lastSeen: r.last_seen,
            properties: schemaMap.get(r.event_name) ?? [],
          };
        }),
      };
    }),
});
