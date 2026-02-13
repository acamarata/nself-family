-- 011: Legacy vault, inheritance, and memorialization
-- Phase 7 — Continuity

-- Vault status enum
CREATE TYPE vault_status AS ENUM ('active', 'sealed', 'released');

-- Release condition types
CREATE TYPE release_condition AS ENUM ('manual', 'time_trigger', 'death_verification');

-- Account after-death preference
CREATE TYPE after_death_action AS ENUM ('memorialize', 'delete', 'transfer');

-- Memorialization state
CREATE TYPE memorial_state AS ENUM ('active', 'pending_memorial', 'memorialized');

-- Legacy vaults — secure containers for posthumous content
CREATE TABLE legacy_vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status vault_status NOT NULL DEFAULT 'active',
  sealed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  release_condition release_condition NOT NULL DEFAULT 'manual',
  release_trigger_at TIMESTAMPTZ, -- for time_trigger condition
  requires_reauth BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vault items — content stored within a vault
CREATE TABLE vault_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id UUID NOT NULL REFERENCES legacy_vaults(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'letter', 'document', 'media', 'message'
  title TEXT,
  content TEXT, -- encrypted text content
  media_id UUID REFERENCES media_items(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vault recipients — who receives vault contents on release
CREATE TABLE vault_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id UUID NOT NULL REFERENCES legacy_vaults(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT, -- personal message to recipient
  notified_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vault_id, user_id)
);

-- Inheritance scenarios — versioned, immutable snapshots
CREATE TABLE inheritance_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  input_snapshot JSONB NOT NULL, -- config at time of creation
  output_snapshot JSONB NOT NULL, -- computed result
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No updated_at — immutable by design
);

-- Prevent modification of inheritance scenarios (immutable)
CREATE OR REPLACE FUNCTION prevent_inheritance_scenario_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'inheritance_scenarios are immutable — INSERT only, no UPDATE or DELETE';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inheritance_scenario_immutable
  BEFORE UPDATE OR DELETE ON inheritance_scenarios
  FOR EACH ROW EXECUTE FUNCTION prevent_inheritance_scenario_modification();

-- Digital successor assignments
CREATE TABLE digital_successors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  successor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  after_death_action after_death_action NOT NULL DEFAULT 'memorialize',
  notes TEXT,
  confirmed_at TIMESTAMPTZ, -- successor accepted responsibility
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(family_id, owner_id) -- one successor per person per family
);

-- Memorial profiles
CREATE TABLE memorial_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  state memorial_state NOT NULL DEFAULT 'active',
  requested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  memorial_message TEXT,
  memorial_date DATE,
  requested_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_legacy_vaults_owner ON legacy_vaults(owner_id);
CREATE INDEX idx_legacy_vaults_family ON legacy_vaults(family_id);
CREATE INDEX idx_legacy_vaults_status ON legacy_vaults(status);
CREATE INDEX idx_vault_items_vault ON vault_items(vault_id);
CREATE INDEX idx_vault_recipients_vault ON vault_recipients(vault_id);
CREATE INDEX idx_vault_recipients_user ON vault_recipients(user_id);
CREATE INDEX idx_inheritance_scenarios_owner ON inheritance_scenarios(owner_id);
CREATE INDEX idx_digital_successors_owner ON digital_successors(owner_id);
CREATE INDEX idx_memorial_profiles_user ON memorial_profiles(user_id);
CREATE INDEX idx_memorial_profiles_state ON memorial_profiles(state);

-- Auto-update updated_at triggers
CREATE TRIGGER set_legacy_vaults_updated_at
  BEFORE UPDATE ON legacy_vaults
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_vault_items_updated_at
  BEFORE UPDATE ON vault_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_digital_successors_updated_at
  BEFORE UPDATE ON digital_successors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_memorial_profiles_updated_at
  BEFORE UPDATE ON memorial_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
