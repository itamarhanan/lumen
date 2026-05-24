#!/bin/bash
set -e

cleanup() {
  echo ""
  echo "Shutting down databases..."
  docker compose -f docker-compose.dev.yml down
  supabase stop --no-backup
  echo "Done."
}

# Trap SIGINT (Ctrl+C) and TERM to shut down services on exit
trap cleanup INT TERM

echo "Starting databases..."
docker compose -f docker-compose.dev.yml up -d redisdb clickhousedb

# Load OAuth secrets from gitignored local env (if present)
if [ -f supabase/.env.local ]; then
  set -a; source supabase/.env.local; set +a
fi

echo "Starting Supabase local instance..."
supabase start > /tmp/supabase-start.log 2>&1 || { echo "❌ Supabase failed to start. Logs:"; cat /tmp/supabase-start.log; exit 1; }

# Write Supabase keys to www/.env.local (gitignored, Next.js picks it up)
supabase status -o json 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
with open('apps/www/.env.local', 'w') as f:
    # Keys that change per supabase session
    f.write(f'SUPABASE_ANON_KEY={data[\"ANON_KEY\"]}\n')
    f.write(f'SUPABASE_SERVICE_ROLE_KEY={data[\"SERVICE_ROLE_KEY\"]}\n')
    # DB URLs — same as .env but kept in sync
    f.write(f'DATABASE_URL={data[\"DB_URL\"]}\n')
    f.write(f'DATABASE_URL_API={data[\"DB_URL\"]}\n')
    f.write(f'DATABASE_URL_PROCESSOR={data[\"DB_URL\"]}\n')
"

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

turbo dev