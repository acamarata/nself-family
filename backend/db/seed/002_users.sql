-- Seed: Test Users (Local/Staging ONLY — never seed in production)
-- Password for all users: "password"
-- Hash generated with bcrypt cost factor 10

INSERT INTO public.users (id, email, password_hash, display_name, email_verified, is_active) VALUES
  ('u0000000-0000-0000-0000-000000000001', 'owner@nself.org',
   '$2b$10$rQEY6j9HlBQvRV1eFjXBXOGXHlRZ3EYFqFeKs5FZSMfG0wSCDHVGW',
   'Fatima Owner', true, true),
  ('u0000000-0000-0000-0000-000000000002', 'admin@nself.org',
   '$2b$10$rQEY6j9HlBQvRV1eFjXBXOGXHlRZ3EYFqFeKs5FZSMfG0wSCDHVGW',
   'Ahmad Admin', true, true),
  ('u0000000-0000-0000-0000-000000000003', 'helper@nself.org',
   '$2b$10$rQEY6j9HlBQvRV1eFjXBXOGXHlRZ3EYFqFeKs5FZSMfG0wSCDHVGW',
   'Khadijah Helper', true, true),
  ('u0000000-0000-0000-0000-000000000004', 'user@nself.org',
   '$2b$10$rQEY6j9HlBQvRV1eFjXBXOGXHlRZ3EYFqFeKs5FZSMfG0wSCDHVGW',
   'Yusuf User', true, true),
  -- Additional family members for realistic demo data
  ('u0000000-0000-0000-0000-000000000005', 'youth@nself.org',
   '$2b$10$rQEY6j9HlBQvRV1eFjXBXOGXHlRZ3EYFqFeKs5FZSMfG0wSCDHVGW',
   'Aisha Youth', true, true),
  ('u0000000-0000-0000-0000-000000000006', 'child@nself.org',
   '$2b$10$rQEY6j9HlBQvRV1eFjXBXOGXHlRZ3EYFqFeKs5FZSMfG0wSCDHVGW',
   'Ibrahim Child', true, true)
ON CONFLICT DO NOTHING;
