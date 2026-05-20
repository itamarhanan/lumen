#!/bin/bash
set -e

cleanup() {
  echo ""
  echo "Shutting down databases..."
  docker compose -f docker-compose.dev.yml down
  supabase stop --no-backup
  echo "Done."
}

# Trap SIGINT (Ctrl+C) and EXIT
trap cleanup INT TERM EXIT

echo "Starting databases..."
docker compose -f docker-compose.dev.yml up -d redisdb clickhousedb

echo "Starting Supabase local instance..."
supabase start

# Export Supabase service keys for local dev
eval "$(supabase status -o json 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
out = f'export SUPABASE_URL={data[\"API_URL\"]}\n'
out += f'export SUPABASE_ANON_KEY={data[\"ANON_KEY\"]}\n'
out += f'export SUPABASE_SERVICE_ROLE_KEY={data[\"SERVICE_ROLE_KEY\"]}\n'
out += f'export DATABASE_URL={data[\"DB_URL\"]}\n'
out += f'export DATABASE_URL_API={data[\"DB_URL\"]}\n'
out += f'export DATABASE_URL_PROCESSOR={data[\"DB_URL\"]}\n'
print(out)
")"

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

echo "Databases ready. Starting apps..."
exec turbo dev