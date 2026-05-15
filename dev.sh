#!/bin/bash
set -e

cleanup() {
  echo ""
  echo "Shutting down databases..."
  docker compose -f docker-compose.dev.yml down
  echo "Done."
}

# Trap SIGINT (Ctrl+C) and EXIT
trap cleanup INT TERM EXIT

echo "Starting databases..."
docker compose -f docker-compose.dev.yml up -d

echo "Waiting for databases to be healthy..."
docker compose -f docker-compose.dev.yml exec -T postgresdb pg_isready -U lumen
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