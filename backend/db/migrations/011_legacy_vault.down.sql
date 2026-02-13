-- Reverse 011: Legacy vault, inheritance, and memorialization

DROP TRIGGER IF EXISTS set_memorial_profiles_updated_at ON memorial_profiles;
DROP TRIGGER IF EXISTS set_digital_successors_updated_at ON digital_successors;
DROP TRIGGER IF EXISTS set_vault_items_updated_at ON vault_items;
DROP TRIGGER IF EXISTS set_legacy_vaults_updated_at ON legacy_vaults;
DROP TRIGGER IF EXISTS trg_inheritance_scenario_immutable ON inheritance_scenarios;
DROP FUNCTION IF EXISTS prevent_inheritance_scenario_modification();

DROP TABLE IF EXISTS memorial_profiles;
DROP TABLE IF EXISTS digital_successors;
DROP TABLE IF EXISTS inheritance_scenarios;
DROP TABLE IF EXISTS vault_recipients;
DROP TABLE IF EXISTS vault_items;
DROP TABLE IF EXISTS legacy_vaults;

DROP TYPE IF EXISTS memorial_state;
DROP TYPE IF EXISTS after_death_action;
DROP TYPE IF EXISTS release_condition;
DROP TYPE IF EXISTS vault_status;
