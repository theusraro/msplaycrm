-- Migration 002: Device Specific Configurations & Source Groups

CREATE TABLE IF NOT EXISTS source_groups (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS source_group_sources (
    group_id VARCHAR(64) NOT NULL REFERENCES source_groups(id) ON DELETE CASCADE,
    source_id VARCHAR(64) NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (group_id, source_id)
);

CREATE TABLE IF NOT EXISTS device_config (
    id VARCHAR(64) PRIMARY KEY,
    device_id VARCHAR(64) UNIQUE NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    config_version INTEGER NOT NULL DEFAULT 1,
    source_group_id VARCHAR(64) NULL,
    maintenance BOOLEAN NOT NULL DEFAULT FALSE,
    features JSONB NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_device_config_device_id ON device_config(device_id);
