-- Reverse 013: Stream gateway, devices, and analytics

DROP TRIGGER IF EXISTS set_entitlement_claims_updated_at ON entitlement_claims;
DROP TRIGGER IF EXISTS set_quota_limits_updated_at ON quota_limits;
DROP TRIGGER IF EXISTS set_usage_metrics_updated_at ON usage_metrics;
DROP TRIGGER IF EXISTS set_registered_devices_updated_at ON registered_devices;

DROP TABLE IF EXISTS entitlement_claims;
DROP TABLE IF EXISTS quota_limits;
DROP TABLE IF EXISTS usage_metrics;
DROP TABLE IF EXISTS device_pairing_codes;
DROP TABLE IF EXISTS registered_devices;
DROP TABLE IF EXISTS stream_sessions;
