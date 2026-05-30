import { createClient, type ClickHouseEvent } from "@lumen/clickhouse";
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

const FilterOperator = z.enum([
  "equals",
  "notEquals",
  "contains",
  "startsWith",
  "endsWith",
  "gt",
  "lt",
  "isTrue",
  "isFalse",
]);

const FilterFieldType = z.enum(["string", "number", "boolean"]);

export const eventsRouter = t.router({
  list: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        from: z.string(),
        to: z.string(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(50),
        searchQuery: z.string().optional(),
        filters: z
          .array(
            z.object({
              field: z.string(),
              fieldType: FilterFieldType.default("string"),
              operator: FilterOperator,
              value: z.string(),
            }),
          )
          .optional(),
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

      if (input.searchQuery) {
        conditions.push(
          `(event_name ILIKE '%' || {search: String} || '%' OR properties ILIKE '%' || {search: String} || '%' OR person_id ILIKE '%' || {search: String} || '%')`,
        );
        params.search = input.searchQuery;
      }

      if (input.filters) {
        input.filters.forEach((f, i) => {
          const keyParam = `fk${i}`;
          const valParam = `fv${i}`;

          let fieldExpr: string;
          if (
            f.field === "event_name" ||
            f.field === "event_type" ||
            f.field === "person_id"
          ) {
            fieldExpr = f.field;
            params[valParam] = f.value;
          } else {
            params[keyParam] = f.field;
            if (f.fieldType === "number") {
              fieldExpr = `JSONExtractFloat(properties, {${keyParam}: String})`;
              params[valParam] = Number(f.value);
            } else if (f.fieldType === "boolean") {
              fieldExpr = `JSONExtractBool(properties, {${keyParam}: String})`;
              params[valParam] = f.value === "true" ? 1 : 0;
            } else {
              fieldExpr = `JSONExtractString(properties, {${keyParam}: String})`;
              params[valParam] = f.value;
            }
          }

          const isBuiltin =
            f.field === "event_name" ||
            f.field === "event_type" ||
            f.field === "person_id";
          const isNumberField = f.fieldType === "number" && !isBuiltin;
          const isBoolField = f.fieldType === "boolean" && !isBuiltin;
          const valType = isNumberField ? "Float64" : isBoolField ? "UInt8" : "String";

          let condition: string;
          switch (f.operator) {
            case "equals":
              condition = `${fieldExpr} = {${valParam}: ${valType}}`;
              break;
            case "notEquals":
              condition = `${fieldExpr} != {${valParam}: ${valType}}`;
              break;
            case "contains":
              condition = `${fieldExpr} ILIKE '%' || {${valParam}: String} || '%'`;
              break;
            case "startsWith":
              condition = `${fieldExpr} ILIKE {${valParam}: String} || '%'`;
              break;
            case "endsWith":
              condition = `${fieldExpr} ILIKE '%' || {${valParam}: String}`;
              break;
            case "gt":
              condition = `${fieldExpr} > {${valParam}: Float64}`;
              break;
            case "lt":
              condition = `${fieldExpr} < {${valParam}: Float64}`;
              break;
            case "isTrue":
              condition = `${fieldExpr} = 1`;
              break;
            case "isFalse":
              condition = `${fieldExpr} = 0`;
              break;
            default:
              condition = "1=1";
          }
          conditions.push(condition);
        });
      }

      const where = conditions.join(" AND ");
      const take = input.limit + 1;

      const rows = await ch.query<ClickHouseEvent>(
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

  getById: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        eventId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const rows = await ch.query<ClickHouseEvent>(
        `SELECT
           event_id, event_type, event_name, properties,
           person_id, session_id, project_id, source, timestamp
         FROM lumen.events
         WHERE project_id = {projectId: String}
           AND event_id = {eventId: String}
         LIMIT 1`,
        { projectId: input.projectId, eventId: input.eventId },
      );
      return rows[0] ?? null;
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
          is_identified: number;
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
        ch.query<ClickHouseEvent>(
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
