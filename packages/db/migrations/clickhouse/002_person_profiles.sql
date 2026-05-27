CREATE TABLE IF NOT EXISTS $CLICKHOUSE_DB.person_profiles (
    person_id       String,
    project_id      String,
    is_identified   UInt8 DEFAULT 0,
    properties      String,
    first_seen_at   DateTime64(3),
    updated_at      DateTime64(3)
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (project_id, person_id);
