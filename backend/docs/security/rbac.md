# Backend RBAC and Security

## Role Hierarchy

| Role | Level | Description |
|------|-------|-------------|
| OWNER | 1 | Family creator, full control, can delete family |
| ADMIN | 2 | Manages members, settings, content moderation |
| ADULT_MEMBER | 3 | Full content access, can create/edit own content |
| YOUTH_MEMBER | 4 | Limited access, adults_only content hidden |
| CHILD_MEMBER | 5 | Read-only on approved content, no chat |
| DEVICE | 6 | Headless devices (TV, display), read-only stream access |

## Permission Matrix

| Action | OWNER | ADMIN | ADULT | YOUTH | CHILD | DEVICE |
|--------|-------|-------|-------|-------|-------|--------|
| Create post | Y | Y | Y | Y | N | N |
| Edit own post | Y | Y | Y | Y | N | N |
| Delete any post | Y | Y | N | N | N | N |
| View adults_only | Y | Y | Y | N | N | N |
| Manage members | Y | Y | N | N | N | N |
| Change roles | Y | N | N | N | N | N |
| Upload media | Y | Y | Y | Y | N | N |
| Delete any media | Y | Y | N | N | N | N |
| Create conversation | Y | Y | Y | Y | N | N |
| Send message | Y | Y | Y | Y | N | N |
| View vault | Y | Y | Y | N | N | N |
| Create vault | Y | Y | Y | N | N | N |
| Seal vault | Y | Y | Y | N | N | N |
| Create event | Y | Y | Y | Y | N | N |
| Manage recipes | Y | Y | Y | Y | N | N |
| View location | Y | Y | Y | N | N | N |
| Share location | Y | Y | Y | Y | N | N |
| Manage devices | Y | Y | N | N | N | N |
| View audit log | Y | Y | N | N | N | N |
| Export family data | Y | N | N | N | N | N |
| Delete family data | Y | N | N | N | N | N |
| Family settings | Y | Y | N | N | N | N |
| Delete family | Y | N | N | N | N | N |

## Per-App RBAC (Monorepo Mode)

Users can have different roles in different apps via `user_app_roles`:

```
user_app_roles(user_id, app_id, role, permissions)
```

Example: A user might be ADMIN in nChat but ADULT_MEMBER in nFamily.

Each app checks its own RBAC context, not a global user role.

## Authorization Gates

Three-layer authorization check on every request:

1. **Family boundary check** — User must be a member of the family (via family_members table)
2. **Role check** — User's role must have permission for the action
3. **Policy check** (optional) — Visibility policies, relationship constraints, Islamic mode rules

## Authentication Flow

```
Client → POST /auth/login → Auth Service → JWT (access + refresh)
Client → GraphQL/API request with Bearer token → Hasura/API → Validates JWT claims
```

JWT claims include:
- `sub` — user ID
- `iat` / `exp` — issued/expiry timestamps
- `x-hasura-user-id` — for Hasura permissions
- `x-hasura-allowed-roles` — role list
- `x-hasura-default-role` — default role

## Security Hardening

- **Token lifecycle**: Access tokens (15 min), refresh tokens (7 days)
- **Key rotation**: JWT signing key rotation with grace window for in-flight tokens
- **Refresh revocation**: Refresh tokens can be individually revoked
- **Audit logging**: All privileged operations logged immutably
- **Rate limiting**: Login attempts rate-limited per IP
- **Password hashing**: bcrypt with configurable rounds
- **SQL injection prevention**: All queries parameterized (no string interpolation)
- **Multi-tenant isolation**: Every query scoped by family_id
- **Demo mode**: Mutations blocked at API, Hasura, and storage layers when DEMO_MODE=true
