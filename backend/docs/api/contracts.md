# Backend API Contracts

## Contract Principles

- Explicit versioning for breaking changes (URL path, Accept header, or X-API-Version header)
- Role-aware contract behavior documented per endpoint
- Deterministic error shapes: `{ error: string, code: string, details?: object }`
- All responses wrapped: `{ api_version: "v1", data: T, deprecated?: boolean }`

## API Versions

| Version | Status | Notes |
|---------|--------|-------|
| v1 | Current | Initial release |
| v2 | Supported | Enhanced validation on registration |

Version resolution order: URL path `/v1/...` > Accept header `application/vnd.nself.v1+json` > `X-API-Version` header > default (v1).

Deprecated versions include `Deprecation: true` and `Sunset` response headers.

## Contract Surfaces

### Auth Service (port 4000)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | None | Register new user account |
| POST | /auth/login | None | Authenticate and receive JWT tokens |
| POST | /auth/refresh | Refresh token | Refresh access token |
| POST | /auth/revoke | Access token | Revoke refresh token |
| POST | /auth/logout | Access token | End session and revoke tokens |
| GET | /auth/me | Access token | Get current user profile |
| GET | /health | None | Service health check |
| GET | /ready | None | Service readiness check |

#### POST /auth/register

```json
// Request
{ "email": "user@example.com", "password": "min-8-chars", "display_name": "User" }

// Response 201
{ "api_version": "v1", "data": { "user": { "id": "uuid", "email": "..." }, "access_token": "jwt", "refresh_token": "jwt" } }

// Error 400
{ "error": "Email already registered", "code": "AUTH_EMAIL_EXISTS" }
```

#### POST /auth/login

```json
// Request
{ "email": "user@example.com", "password": "..." }

// Response 200
{ "api_version": "v1", "data": { "user": { "id": "uuid", "email": "..." }, "access_token": "jwt", "refresh_token": "jwt" } }

// Error 401
{ "error": "Invalid credentials", "code": "AUTH_INVALID_CREDENTIALS" }
```

#### POST /auth/refresh

```json
// Request
{ "refresh_token": "jwt" }

// Response 200
{ "api_version": "v1", "data": { "access_token": "jwt", "refresh_token": "jwt" } }
```

#### GET /auth/me

```json
// Response 200
{ "api_version": "v1", "data": { "id": "uuid", "email": "...", "display_name": "...", "avatar_url": "..." } }
```

### API Service (port 3001)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /media/upload | Access token | Upload media file (multipart) |
| POST | /audit/events | Access token (admin) | Query audit events |
| GET | /api/versions | None | List API versions |
| POST | /export/family/:id | Access token (owner) | Export family data (GDPR) |
| POST | /import/family | Access token | Import family data |
| DELETE | /family/:id/data | Access token (owner) | Delete all family data |
| GET | /family/:id/integrity | Access token (admin) | Verify data integrity |
| GET | /health | None | Service health check |

### GraphQL (Hasura — port 8080)

All GraphQL operations go through Hasura with role-based permissions.

**Key Queries:**
- `families` — List user's families
- `posts` — Family feed with visibility filtering
- `media_items` — Family media library
- `relationships` — Family tree data
- `conversations` — Chat conversations
- `messages` — Chat messages
- `events` — Calendar events
- `trips` — Family trips
- `recipes` — Recipe collection
- `legacy_vaults` — Digital vaults
- `search_index` — Full-text search
- `audit_events` — Audit log (admin only)

**Key Mutations:**
- `insert_posts_one` — Create post
- `update_posts_by_pk` — Edit post
- `insert_media_items_one` — Register media
- `insert_relationships_one` — Add relationship
- `insert_conversations_one` — Create conversation
- `insert_messages_one` — Send message
- `insert_events_one` — Create event

### Webhooks / Events

| Event | Trigger | Consumer |
|-------|---------|----------|
| `user.registered` | New user signup | Notification service |
| `post.created` | New post in family | Feed indexing, notifications |
| `media.uploaded` | New media file | Media processing pipeline |
| `message.sent` | New chat message | Push notifications |
| `vault.sealed` | Vault sealed by owner | Audit log |

## Error Shape

All errors follow this consistent shape:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "details": {}
}
```

Common error codes:
- `AUTH_INVALID_CREDENTIALS` — Login failed
- `AUTH_EMAIL_EXISTS` — Registration duplicate
- `AUTH_TOKEN_EXPIRED` — JWT expired
- `AUTH_UNAUTHORIZED` — Missing or invalid token
- `RBAC_FORBIDDEN` — Insufficient role/permissions
- `TENANT_NOT_FOUND` — Family not found or no access
- `VALIDATION_ERROR` — Request body validation failed
- `RATE_LIMITED` — Too many requests
