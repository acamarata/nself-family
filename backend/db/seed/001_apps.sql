-- Seed: App Registry
-- Creates the ɳSelf ecosystem app entries for per-app RBAC

INSERT INTO public.apps (id, app_key, name, description) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'nfamily', 'ɳFamily', 'Family collaboration and life management platform'),
  ('a0000000-0000-0000-0000-000000000002', 'nchat', 'ɳChat', 'Real-time messaging and communication platform'),
  ('a0000000-0000-0000-0000-000000000003', 'ntv', 'ɳTV', 'Media streaming and entertainment platform')
ON CONFLICT (app_key) DO NOTHING;
