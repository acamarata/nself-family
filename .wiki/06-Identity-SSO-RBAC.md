# 06 - Identity, SSO, RBAC

## Identity Model

- One family is the core tenant boundary.
- Each user belongs to one family tenant by default.
- Role claims are embedded in auth context for policy checks.

## Roles (Initial)

- `OWNER` - full control, billing/deployment authority.
- `ADMIN` - operational/admin privileges.
- `ADULT_MEMBER` - full standard usage.
- `YOUTH_MEMBER` - policy-restricted usage.
- `CHILD_MEMBER` - stronger content and action restrictions.
- `DEVICE` - non-human actors (antbox/antserver workers).

## SSO Flows

### Browser and mobile login

1. Credential/OAuth login to auth service.
2. Issue JWT with family and role claims.
3. Use same token for family/chat/tv API access.

### Device code flow (TV apps)

1. TV app requests short-lived pairing code.
2. User confirms code in mobile/web session.
3. TV app receives constrained session token.

## Authorization Strategy

- enforce family tenant boundary at DB and API layers
- apply role and policy checks per endpoint
- optional relationship-aware checks (e.g., mahram-aware visibility)

## Audit Requirements

Track immutable audit entries for:

- account creation/deletion
- role elevation/demotion
- policy mode changes
- critical data export or deletion
- device registration and token issuance
