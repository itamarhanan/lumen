#!/bin/bash
set -e

_CLEANING=""

cleanup() {
  if [ -n "$_CLEANING" ]; then return; fi
  _CLEANING=1
  echo ""
  echo "Shutting down databases..."
  supabase stop 2>/dev/null || true
  docker compose -f docker-compose.dev.yml down
  echo "Done."
}

# Trap exit signals so cleanup always runs
trap cleanup INT TERM EXIT

echo "Starting databases..."
docker compose -f docker-compose.dev.yml up -d redisdb clickhousedb

# Load OAuth secrets from gitignored local env (if present)
if [ -f supabase/.env.local ]; then
  set -a; source supabase/.env.local; set +a
fi

echo "Starting Supabase local instance..."
supabase start 2>&1 | tee /tmp/supabase-start.log || { echo "❌ Supabase failed to start. Logs at /tmp/supabase-start.log"; exit 1; }

# Wait for supabase to report healthy (DB container may briefly restart)
echo "Waiting for Supabase to report healthy..."
for i in $(seq 1 15); do
  if supabase status -o json > /tmp/supabase-status.json 2>/dev/null; then
    python3 << 'PYEOF' /tmp/supabase-status.json
import json, sys
data = json.load(open(sys.argv[1]))
with open('apps/www/.env.local', 'w') as f:
    f.write(f"SUPABASE_URL={data['API_URL']}\n")
    f.write(f"SUPABASE_ANON_KEY={data['ANON_KEY']}\n")
    f.write(f"SUPABASE_SERVICE_ROLE_KEY={data['SERVICE_ROLE_KEY']}\n")
    f.write(f"NEXT_PUBLIC_SUPABASE_URL={data['API_URL']}\n")
    f.write(f"NEXT_PUBLIC_SUPABASE_ANON_KEY={data['ANON_KEY']}\n")
    f.write(f"DATABASE_URL={data['DB_URL']}\n")
    f.write(f"DATABASE_URL_API={data['DB_URL']}\n")
    f.write(f"DATABASE_URL_PROCESSOR={data['DB_URL']}\n")
PYEOF
test -s apps/www/.env.local || { echo "❌ Failed to write .env.local"; exit 1; }
echo "✅ .env.local written"
    break
  fi
  if [ "$i" -eq 15 ]; then
    echo "❌ Supabase failed to report ready."
    supabase status -o json 2>&1 || true
    exit 1
  fi
  sleep 2
done

echo "Waiting for databases to be healthy..."
docker compose -f docker-compose.dev.yml exec -T redisdb redis-cli ping

echo "Waiting for ClickHouse..."
for i in $(seq 1 30); do
  if docker compose -f docker-compose.dev.yml exec -T clickhousedb wget -qO- http://127.0.0.1:8123/ping 2>/dev/null; then
    echo "ClickHouse is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ClickHouse failed to respond."
    exit 1
  fi
  sleep 2
done

# Auto-setup schema (both idempotent)
pnpm --filter=@lumen/db db:push
pnpm migrate:clickhouse

pnpm --filter=@lumen/db db:setup
pnpm --filter=@lumen/db db:seed || true

turbo dev