# Backend Architecture Overview

## System Architecture

```
                    ┌─────────────┐
                    │   Nginx     │  SSL termination, routing
                    │  (reverse   │  *.local.nself.org
                    │   proxy)    │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  Auth    │    │   API    │    │  Hasura  │
    │ Service  │    │ Service  │    │ GraphQL  │
    │ :4000    │    │ :3001    │    │ :8080    │
    └────┬─────┘    └────┬─────┘    └────┬─────┘
         │               │               │
         └───────────────┼───────────────┘
                         ▼
                  ┌──────────────┐
                  │  PostgreSQL  │  Primary data store
                  │   :5432      │
                  └──────────────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        ┌─────────┐ ┌────────┐ ┌────────┐
        │  MinIO  │ │ Redis  │ │Scheduler│
        │ Storage │ │ Cache  │ │ + Jobs  │
        │ :9000   │ │ :6379  │ │         │
        └─────────┘ └────────┘ └─────────┘
```

## Service Boundaries

| Service | Port | Purpose |
|---------|------|---------|
| auth | 4000 | Login, registration, JWT tokens, device-code pairing |
| api | 3001 | Non-CRUD operations: media upload, audit queries, data export/import |
| hasura | 8080 | GraphQL engine with role-based row-level security |
| scheduler | — | Recurring job scheduling and live-event triggers |
| stream-gateway | — | Stream session admission, device-to-family binding |
| nginx | 80/443 | SSL termination, reverse proxy, frontend routing |

## Data Plane

- **PostgreSQL** is the primary data and policy context source (13 migrations, 30+ tables)
- **Hasura** exposes GraphQL with role and family-scoped row-level filters
- **MinIO** provides S3-compatible object storage for media files
- **Redis** handles caching, session storage, and pub/sub for real-time features
- Service APIs provide non-CRUD operations (media processing, data export, audit queries)

## Control Plane

- Orchestration of scheduled jobs (reminders, weekly digest, vault release checks)
- Device registration and trust establishment (pairing codes, bootstrap tokens)
- Media processing pipeline (thumbnail generation, variant creation)
- Search index maintenance (full-text search updates on content changes)

## Multi-Tenant Architecture

Every family is a tenant. Isolation is enforced at multiple layers:

1. **Database**: All family-scoped tables include `family_id` with foreign key constraint
2. **Hasura**: Row-level security rules filter by family membership
3. **API**: Every query includes `family_id` parameter (parameterized, not interpolated)
4. **Storage**: Media organized by family_id paths in MinIO

## Cross-Cutting Concerns

- **Trace IDs**: Request correlation across services and jobs
- **Idempotency**: Workflow steps designed for safe retry
- **Audit trail**: Immutable audit_events table for privileged operations
- **Health checks**: Every service exposes /health and /ready endpoints
- **API versioning**: v1/v2 with deprecation sunset headers
- **Data portability**: GDPR-compliant export, import, and deletion
