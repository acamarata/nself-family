# backend

Demo and self-hostable `nSelf` CLI generated backend stack for the `nself-family` example app ecosystem.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker and Docker Compose

### Initial Setup

```bash
# From repository root
./backend/scripts/bootstrap.sh
```

This will:
1. Install dependencies with pnpm
2. Start Docker services (PostgreSQL, Hasura, MinIO, Redis, MailHog)
3. Copy .env.example to .env if needed
4. Display service URLs and next steps

### Development

```bash
# Run backend services (from backend/)
pnpm dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type check
pnpm typecheck
```

### Reset Environment

```bash
# From repository root
./backend/scripts/reset.sh
```

This will:
1. Stop and remove all Docker containers
2. Delete node_modules and .env files
3. Clean up all development data

After reset, run `./backend/scripts/bootstrap.sh` to set up again.

### Service Ports

- Auth: `http://localhost:3001`
- Orchestrator: `http://localhost:3002`
- Scheduler: `http://localhost:3003`
- Jobs: `http://localhost:3004`
- Stream Gateway: `http://localhost:3005`
- Hasura Console: `http://localhost:8080`
- MinIO Console: `http://localhost:9001` (minioadmin/minioadmin)
- MailHog UI: `http://localhost:8025`

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
