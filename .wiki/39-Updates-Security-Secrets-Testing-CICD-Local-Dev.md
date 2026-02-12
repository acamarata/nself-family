# 39 - Updates, Security, Secrets, Testing, CI/CD, and Local Dev

## Objective

Consolidate operational engineering standards that prevent unsafe delivery.

## Automated Updates Strategy

### AntBox

- staged rollout channels: `candidate` then `stable`
- canary one device before fleet rollout
- rollback artifact retained for immediate downgrade

### Servers

- patch windows with maintenance policy
- pre-patch backup checkpoint
- post-patch health validation gates

## Security Model

- TLS for all public and private service traffic
- strict trust boundaries between control/data/edge planes
- least-privilege access for humans and services

## Secrets Management

- central secret store (or equivalent secure distribution)
- no secrets in code or static config commits
- key/token rotation schedules defined and tracked

## Testing Strategy

- unit tests for domain logic and policy evaluation
- integration tests for auth, media, and live workflows
- resilience/chaos tests for ingest, network loss, and restart behavior

## CI/CD Pipeline Requirements

- lint/type/test gates
- migration validation gates
- contract compatibility checks
- environment-scoped deployment approvals

## Local Development Environment

### Required Local Stack (Docker Compose Target)

- Postgres
- Hasura
- auth service (or mock)
- object storage emulator
- queue/cache service (if used)

### Local Dev Expectations

- one-command bootstrap
- seeded demo data
- deterministic teardown/reset
