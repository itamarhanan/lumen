# Lumen — Product analytics platform

## Monorepo (pnpm workspace + Turborepo)

- `apps/www` — Next.js 16 app (dashboard, auth, marketing). tRPC, Supabase, Drizzle ORM, Tailwind v4. Runs on `:3000`.
- `apps/ingest` — NestJS ingestion API. Validates events with Zod, enqueues to Redis stream `lumen:events`. Runs on `:3001`.
- `apps/processor` — Minimal Express app. Reads from Redis stream, enriches (UA parsing, geoip), batches to ClickHouse. Runs on `:3002`.
- `packages/sdk` — Browser tracking SDK (pageview/custom/identify).
- `packages/db` — Drizzle schema + `createClient(role)` factory (roles: `admin`/`api`/`processor`). Migrations in `packages/db/migrations/`.
- `packages/clickhouse` — Typed `@clickhouse/client` wrapper. SQL migrations in `packages/db/migrations/clickhouse/`.
- `packages/redis` — Redis stream consumer-group wrapper.
- `packages/types` — Shared event type definitions.
- `packages/config` — Shared tsconfigs.

## Data flow

SDK → `apps/ingest` POST `/api/collect` → validated via Zod → Redis stream `lumen:events` → `apps/processor` reads stream → enriches (UA, geoip) → batch inserts to ClickHouse.

Identity events are handled immediately by processor (upsert to `person_profiles`); pageview/custom events are batched.

## Commands

| Command | What |
|---|---|
| `pnpm dev` | Spins up Docker (Redis, ClickHouse), Supabase local, writes env keys to `www/.env.local`, runs `turbo dev` |
| `pnpm lint` | `turbo lint` (ESLint across all workspaces) |
| `pnpm check-types` | `turbo check-types` (tsc --noEmit across all workspaces) |
| `pnpm knip` | Dead code detection |
| `pnpm test` | `turbo test` (no real tests exist yet — CI has it commented out) |
| `pnpm ci` | `install → lint → check-types → knip → test` (full CI pipeline) |

Per-package:
- `packages/db`: `db:generate`, `db:push`, `db:migrate`, `db:seed`, `db:setup` — all require `dotenv -e ../../.env` prefix
- ClickHouse migrations: `pnpm migrate:clickhouse` (from root, runs `packages/db/migrations/clickhouse/*.sql` against local ClickHouse)

## Dev setup quirks

- `./dev.sh` is the ONLY way to start dev (starts infra, writes dynamic env). Do not run `turbo dev` directly.
- Supabase local keys (`ANON_KEY`, `SERVICE_ROLE_KEY`) are written to `apps/www/.env.local` by `dev.sh` — they change per session. This file is gitignored.
- OAuth secrets for Supabase can be placed in `supabase/.env.local` (loaded by `dev.sh`).
- Express v5 is used (different from v4 — router params, error handling).
- Next.js 16 has breaking changes from earlier versions — check `node_modules/next/dist/docs/` before writing code.
- `apps/www` has a `scripts/build-script.mjs` that runs before every `next dev`/`next build`.

## Logging & watching services

`turbo dev` runs all three apps in one terminal (stdout interleaved). To watch a specific service:

| Service | How to tail |
|---|---|
| Next.js (www) | `tail -f /tmp/next.log` — piped by dev script (`next dev 2>&1 \| tee /tmp/next.log`) |
| Ingest (NestJS) | `turbo --filter=ingest dev` (or check stdout in the turbo session) |
| Processor | `turbo --filter=@lumen/processor dev` (or check stdout in the turbo session) |
| Supabase | `supabase start` output logged to `/tmp/supabase-start.log` (startup only) |
| Docker services | `docker compose -f docker-compose.dev.yml logs -f redisdb clickhousedb` |

There is no centralized log aggregator — each process logs to stdout, and Next.js additionally tees to `/tmp/next.log`.
- CI runs on Node 20, pnpm 9; local uses pnpm@10.28.1.
- `.npmrc` sets `inject-workspace-packages=true` — workspace packages are symlinked into node_modules, not hoisted.
- No tests exist yet in any package (apps/ingest has a placeholder).
- `apps/www/src/proxy.ts` is the Supabase auth middleware (routes `/dashboard/*`, `/login`, `/api/auth/*`).

## Architecture notes

- Postgres (via Drizzle) stores relational data: users, sites, sessions, API keys, event schemas.
- ClickHouse stores analytics events (`events` table) and person profiles (`person_profiles` table).
- Redis streams provide at-least-once delivery with consumer groups, dead-letter queue, and buffer overflow handling.
- The SDK generates visitor/session IDs client-side via nanoid.
- Ingest rate-limited: 100 req/60s per IP, 10s block.
