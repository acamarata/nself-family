# 04 - Environment Strategy

## Environment Matrix

| Environment | Purpose | Infra Shape | Data Policy |
|---|---|---|---|
| local | fast iteration and prototyping | local containers + ɳSelf CLI | synthetic/dev-only data |
| staging | integration validation | cloud-like stack with isolated resources | masked or generated data |
| production | end-user runtime | Hetzner VPS + Hetzner Object Storage + Vercel + CDN | real family data |

## Local

### Goals

- deterministic onboarding for contributors
- ability to run app slices in isolation
- rapid feedback with local logs and seeded fixtures

### Requirements

- ɳSelf CLI available
- local Postgres/Hasura stack
- mock object storage endpoint for development
- optional local FFmpeg tooling for media pipeline prototyping

## Staging

### Goals

- validate migrations and contract compatibility
- execute integration tests for auth/media/live flows
- catch operational regressions before production

### Requirements

- production-like domain and TLS setup
- staging object storage bucket
- synthetic but realistic sample media set
- alerting for service failures

## Production

### Goals

- stable family-facing availability
- secure data handling
- predictable scaling and cost

### Baseline Topology

- backend API/data services on Hetzner VPS
- media files on Hetzner Object Storage
- web frontends deployed via Vercel
- CDN and edge protections in front of media/API

## Environment Promotion Rules

1. All schema changes tested in local and staging.
2. Migration rollback documented before production apply.
3. Feature flags for high-risk features (live ingest, ad-skip logic).
4. Incident rollback strategy documented before release.
