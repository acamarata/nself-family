-- 013: Stream gateway, devices, and analytics
-- Phase 8 — Ecosystem

-- Stream sessions
CREATE TABLE stream_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  device_id UUID, -- nullable for web clients
  content_id TEXT NOT NULL,
  playback_url TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  evicted BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'
);

-- Device registration and trust
CREATE TABLE registered_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL, -- 'antbox', 'antserver', 'browser', 'mobile', 'desktop', 'tv'
  public_key TEXT,
  bootstrap_token TEXT,
  credential TEXT, -- issued after enrollment
  is_trusted BOOLEAN NOT NULL DEFAULT false,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  last_heartbeat_at TIMESTAMPTZ,
  health_metrics JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Device pairing codes (short-lived for TV pairing)
CREATE TABLE device_pairing_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  device_id UUID NOT NULL REFERENCES registered_devices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id), -- set when user confirms
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  session_token TEXT, -- issued after confirmation
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usage analytics
CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  metric_type TEXT NOT NULL, -- 'storage_bytes', 'stream_minutes', 'api_calls', 'device_count'
  value BIGINT NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quota configuration
CREATE TABLE quota_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE, -- NULL for global defaults
  metric_type TEXT NOT NULL,
  soft_limit BIGINT NOT NULL,
  hard_limit BIGINT NOT NULL,
  alert_threshold_pct INTEGER NOT NULL DEFAULT 80,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(family_id, metric_type)
);

-- Entitlement claims (TV policy mapping)
CREATE TABLE entitlement_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL, -- 'can_watch', 'can_record', 'parental_level', 'max_streams'
  claim_value TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'family_role', -- 'family_role', 'manual', 'subscription'
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(family_id, user_id, claim_type)
);

-- Indexes
CREATE INDEX idx_stream_sessions_user ON stream_sessions(user_id);
CREATE INDEX idx_stream_sessions_family ON stream_sessions(family_id);
CREATE INDEX idx_stream_sessions_active ON stream_sessions(ended_at) WHERE ended_at IS NULL;
CREATE INDEX idx_stream_sessions_heartbeat ON stream_sessions(last_heartbeat_at) WHERE ended_at IS NULL;
CREATE INDEX idx_registered_devices_family ON registered_devices(family_id);
CREATE INDEX idx_registered_devices_user ON registered_devices(user_id);
CREATE INDEX idx_device_pairing_codes_code ON device_pairing_codes(code);
CREATE INDEX idx_device_pairing_codes_expires ON device_pairing_codes(expires_at);
CREATE INDEX idx_usage_metrics_family ON usage_metrics(family_id, metric_type);
CREATE INDEX idx_usage_metrics_period ON usage_metrics(period_start, period_end);
CREATE INDEX idx_entitlement_claims_user ON entitlement_claims(family_id, user_id);

-- Auto-update triggers
CREATE TRIGGER set_registered_devices_updated_at
  BEFORE UPDATE ON registered_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_usage_metrics_updated_at
  BEFORE UPDATE ON usage_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_quota_limits_updated_at
  BEFORE UPDATE ON quota_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_entitlement_claims_updated_at
  BEFORE UPDATE ON entitlement_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
