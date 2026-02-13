# Backend Deployment

## Environments

| Environment | Domain | Infrastructure | Access |
|-------------|--------|---------------|--------|
| Local | family.local.nself.org | Docker via nSelf CLI | Full access, seeded test users |
| Staging | family.staging.nself.org | Hetzner VPS 167.235.233.65 | HTTP basic auth, seeded users |
| Production | family.nself.org | Hetzner VPS 5.75.235.42 + Vercel | Demo mode (read-only), SSO |

## Service Stack

| Service | Required | Notes |
|---------|----------|-------|
| PostgreSQL | Yes | Primary database |
| Hasura | Yes | GraphQL engine |
| Auth | Yes | JWT authentication |
| Nginx | Yes | Reverse proxy, SSL |
| MinIO | Optional | Object storage (media) |
| Redis | Optional | Cache, sessions, pub/sub |
| Scheduler | Optional | Job scheduling |

## Deployment Workflow

### Local Development

```bash
cd backend
nself build     # Generate configs, SSL certs
nself start     # Start all services
nself status    # Verify health
nself urls      # List service URLs
```

### Staging (GitHub Actions)

Triggered automatically on push to main:

1. CI pipeline runs (lint, typecheck, test, build)
2. Frontend deploys to Vercel (staging project)
3. Backend deploys via SSH to Hetzner staging VPS
4. Post-deploy health check verification

### Production (GitHub Actions)

Manual dispatch with safety gates:

1. Input: version tag (e.g., v0.9) and DEPLOY confirmation
2. CI pipeline runs full test suite
3. Creates git tag
4. Frontend deploys to Vercel (production project)
5. Backend deploys via SSH to Hetzner production VPS
6. Post-deploy health checks
7. Automatic rollback if health checks fail

## Deployment Requirements

- Health checks per service (all must pass before traffic routed)
- Dependency startup ordering: PostgreSQL -> Hasura -> Auth -> API -> Nginx
- Migrations run before app containers start (`nself db migrate`)
- Rollback path documented and tested before every release
- Database backup taken before production deployment

## Environment Configuration

Configuration uses cascading .env files:

```
.env.dev        → Base development defaults
.env.staging    → Staging overrides
.env.prod       → Production overrides
.env            → Local overrides (gitignored)
```

Key environment variables:

- `PROJECT_NAME` — Container namespace prefix
- `DEMO_MODE` — Enable read-only demo mode (production only)
- `JWT_SECRET` — Token signing key
- `HASURA_GRAPHQL_ADMIN_SECRET` — Hasura admin access
- `POSTGRES_PASSWORD` — Database password
- `MINIO_ROOT_PASSWORD` — Object storage password

## Rollback Procedure

```bash
# 1. Identify previous working version
git tag -l 'v0.*' --sort=-version:refname

# 2. Check out previous version
git checkout v0.X

# 3. Rebuild and restart
cd backend && nself build && nself restart

# 4. Verify health
nself health
```

For automated rollback, the production GitHub Actions workflow checks health and rolls back to the previous tag if checks fail after 3 retries.
