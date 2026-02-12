# 40 - Ecosystem Apps and Shared Backend

## Purpose

Define how `nself-family`, `nself-chat`, and `nself-tv` operate as independent apps that can share one backend ecosystem.

## Repository Roles

1. `nself-family` (`/Users/admin/Sites/nself-family`)
- owns family product, shared backend, and ecosystem integration surfaces.
2. `nself-chat` (`/Users/admin/Sites/nself-chat`)
- owns standalone ɳChat product and roadmap.
3. `nself-tv` (`/Users/admin/Sites/nself-tv`)
- owns standalone ɳTV product, including VOD/live/AntBox/AntServer roadmap.

## Shared Backend Model

1. Single backend stack can support all three apps.
2. Identity/auth/session can be shared across app surfaces.
3. Data model must remain namespaced and policy-scoped by domain.
4. Family-level policy controls still apply to integrated app access.

## Domain Routing Pattern

1. `www.myfamily.com` -> ɳFamily app
2. `chat.myfamily.com` -> ɳChat app
3. `tv.myfamily.com` -> ɳTV app

## Integration Boundaries in `nself-family`

1. `/frontend/chat` is integration-facing, not the canonical ɳChat source-of-truth implementation.
2. `/frontend/tv` is integration-facing, not the canonical ɳTV source-of-truth implementation.
3. TV live and AntBox/AntServer implementation planning is owned by `nself-tv`.

## Operational Expectations

1. Shared backend contracts must stay versioned and documented.
2. Cross-app SSO/session behavior must be deterministic.
3. Tenant/family boundaries must remain enforced across all app integrations.
4. Release cadence can be independent per app, but backend contract changes require compatibility checks.
