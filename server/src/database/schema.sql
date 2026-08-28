-- MSPLAY PostgreSQL Schema — Phase 3 Remote Management

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'expired'
    expires_at TIMESTAMP NULL,
    max_devices INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    avatar VARCHAR(255) DEFAULT '',
    color VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE SET NULL,
    device_uuid VARCHAR(128) UNIQUE NOT NULL,
    device_name VARCHAR(128) NOT NULL DEFAULT 'Dispositivo MSPLAY',
    device_type VARCHAR(32) NOT NULL DEFAULT 'desktop', -- 'android_tv', 'google_tv', 'tv_box', 'android_mobile', 'android_tablet', 'web', 'desktop'
    platform VARCHAR(64) DEFAULT 'Unknown',
    app_version VARCHAR(32) NOT NULL DEFAULT '3.0.0',
    last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'deactivated'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(64) NULL REFERENCES devices(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_config (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'global',
    config_version INTEGER NOT NULL DEFAULT 1,
    maintenance BOOLEAN NOT NULL DEFAULT FALSE,
    features JSONB NOT NULL DEFAULT '{"tv": true, "movies": true, "series": true}',
    minimum_app_version VARCHAR(32) NOT NULL DEFAULT '2.0.0',
    latest_app_version VARCHAR(32) NOT NULL DEFAULT '3.0.0',
    default_source_group VARCHAR(64) NOT NULL DEFAULT 'default',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sources (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'mock_catalog',
    endpoint VARCHAR(255) NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS source_groups (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    actor VARCHAR(128) NOT NULL,
    action VARCHAR(128) NOT NULL,
    target VARCHAR(128) NOT NULL,
    metadata JSONB NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed Development Data
INSERT INTO users (id, username, password_hash, status, max_devices)
VALUES ('user_dev_01', 'teste', '$scrypt$N=16384,r=8,p=1$SALT$HASH', 'active', 3)
ON CONFLICT (username) DO NOTHING;

INSERT INTO app_config (id, config_version, maintenance, features)
VALUES ('global', 1, FALSE, '{"tv": true, "movies": true, "series": true}')
ON CONFLICT (id) DO NOTHING;
