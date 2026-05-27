CREATE DATABASE IF NOT EXISTS $CLICKHOUSE_DB;

CREATE TABLE IF NOT EXISTS $CLICKHOUSE_DB.events (
    event_id UUID DEFAULT generateUUIDv4(),
    event_type LowCardinality(String),
    event_name String,
    properties String,
    person_id String,
    session_id String,
    project_id String,
    source LowCardinality(String),
    timestamp DateTime64(3) NOT NULL,
    inserted_at DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY (project_id, event_type, toStartOfHour(timestamp), event_id)
TTL toDate(timestamp) + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;
