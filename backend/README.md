# backend

Demo and self-hostable `nSelf` CLI generated backend stack for the `nself-family` example app ecosystem.

## Getting Started

### Prerequisites

- [ɳSelf CLI](https://github.com/acamarata/nself) installed
- Docker Desktop running

### Quick Start (3 Commands)

```bash
# From this directory (backend/)
nself build    # Generate docker-compose.yml and SSL certificates
nself start    # Start all services
```

**That's it!** The ɳSelf CLI handles everything:

- PostgreSQL, Hasura, Redis, MinIO (S3-compatible storage)
- SSL certificates and local DNS (*.local.nself.org)
- Health checks and service orchestration
- Auto-configuration from .env files

**What's running?** Check with:

```bash
nself status    # Service health
nself urls      # Access URLs
```

### Development

```bash
# View service status
nself status

# View logs
nself logs
nself logs postgres    # Specific service
nself logs -f          # Follow logs

# Restart services
nself restart

# Stop services
nself stop

# Complete teardown
nself destroy
```

### Frontend Development

```bash
# List configured frontend apps
nself dev frontend list

# Add a new frontend app
nself dev frontend add myapp --port 3000

# Get environment variables for frontend
nself dev frontend env myapp
```

### Service Access

**Local Domains (with SSL):**

- [https://api.local.nself.org](https://api.local.nself.org) — GraphQL API
- [https://auth.local.nself.org](https://auth.local.nself.org) — Auth service
- [https://storage.local.nself.org](https://storage.local.nself.org) — MinIO storage

**Direct Access (localhost):**

- Auth: `http://localhost:3001`
- Orchestrator: `http://localhost:3002`
- Scheduler: `http://localhost:3003`
- Jobs: `http://localhost:3004`
- Stream Gateway: `http://localhost:3005`
- Hasura Console: `http://localhost:8080`
- MinIO Console: `http://localhost:9001` (minioadmin/minioadmin)
- MailHog UI: `http://localhost:8025`

### Testing

```bash
# Run unit tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type check
pnpm typecheck
```

### Configuration

Configuration uses **environment file cascade**:

| File | Purpose | Committed |
|------|---------|-----------|
| `.env.dev` | Development defaults (always loaded) | ✅ Yes |
| `.env.staging` | Staging overrides (ENV=staging) | ✅ Yes |
| `.env.prod` | Production overrides (ENV=prod) | ✅ Yes |
| `.env` | Local machine overrides (highest priority) | ❌ No (gitignored) |

**Loading order**: `.env.dev` → `.env.staging` → `.env.prod` → `.env` (later files override earlier)

**Current environment**: Check with `echo $ENV` or look in `.env`

**Key variables** (from `.env.dev`):

```bash
# Core Project
PROJECT_NAME=nself-family
BASE_DOMAIN=local.nself.org
ENV=dev

# Services
POSTGRES_ENABLED=true
HASURA_ENABLED=true
STORAGE_ENABLED=true
REDIS_ENABLED=true

# Database
POSTGRES_DB=nself_family_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_dev_password

# GraphQL
HASURA_GRAPHQL_ADMIN_SECRET=dev-secret-change-in-production
HASURA_GRAPHQL_JWT_SECRET='{"type":"HS256","key":"dev-jwt-secret-min-32-chars-required"}'

# Frontend App
FRONTEND_APP_1_ROUTE=family.local.nself.org
FRONTEND_APP_1_PORT=3000
```

**Local overrides**: Edit `.env` (not `.env.dev`) for machine-specific changes

## Hard Architecture Constraint

1. Backend architecture is 100 percent `ɳSelf` CLI + `ɳSelf` plugins.
2. No backend bypass pattern is allowed outside that stack.
3. Any backend capability gap must be captured as explicit plugin planning work before implementation.

## Responsibilities

- family-tenant auth and identity services
- GraphQL/API access layer and contract enforcement
- database schema and migrations
- orchestration for jobs and platform workflows
- security policies and auditability

## Recommended Tech Direction

- `ɳSelf` CLI as environment/bootstrap and runtime control plane
- `ɳSelf` plugin modules for backend capabilities (not ad-hoc standalone sidecar services)
- Postgres + Hasura in `ɳSelf` stack for source-of-truth data and policy enforcement
- Redis (optional) for queue and transient orchestration state via plugin contracts
- Fully self-hostable OSS baseline suitable for cloning into other family/community deployments

## Folder Map

```text
backend/
├── apps/
├── db/
│   ├── migrations/
│   ├── schemas/
│   └── seed/
├── services/
│   ├── auth/
│   ├── orchestrator/
│   ├── stream-gateway/
│   ├── scheduler/
│   └── jobs/
├── hasura/
│   ├── metadata/
│   ├── migrations/
│   └── seeds/
├── infra/
│   ├── compose/
│   ├── docker/
│   ├── terraform/
│   ├── ansible/
│   └── k8s/
├── scripts/
```

Note: legacy `services/` paths are treated as plugin-module implementation paths until a dedicated `plugins/` path is introduced.

## Implementation Priorities

1. Plugin-first auth token model and claim strategy.
2. Tenant/family boundaries and RBAC enforcement.
3. Core schema migrations for users, content, media, events.
4. GraphQL contract and plugin-backed service endpoints.
5. Audit trail and security-critical operation logging.
6. Plugin gap register maintenance for missing `ɳSelf` capabilities.

## Environment Expectations

- local dev via `ɳSelf` CLI + local service dependencies
- staging mirror for migration and integration validation
- production on Hetzner VPS with hardened networking

## Node Tooling Default

1. If backend-adjacent Node/TypeScript tooling is introduced (for example generators, SDK tooling, dev scripts), default package manager is `pnpm`.
2. Do not introduce `npm`/`yarn` lockfiles unless an explicit exception is approved and documented.

## Documentation

- `/Users/admin/Sites/nself-family/.wiki/03-Architecture-Reference.md`
- `/Users/admin/Sites/nself-family/.wiki/35-API-Contracts-and-Repo-Standards.md`
- `/Users/admin/Sites/nself-family/.wiki/34-Database-ERD-and-Schema-Plan.md`
- `/Users/admin/Sites/nself-family/.wiki/10-Security-Privacy.md`
- `/Users/admin/Sites/nself-family/.wiki/05-Deployment-Hetzner-Vercel.md`
- `/Users/admin/Sites/nself-family/.wiki/11-Operations-Runbooks.md`
