# Backend Deployment Notes

## Deployment Targets

- staging: isolated cloud resources
- production: Hetzner VPS

## Baseline Services

- Postgres
- Hasura
- auth service
- orchestrator service
- scheduler and worker services

## Deployment Requirements

- health checks per service
- dependency startup ordering
- migration gating before app rollout
- rollback path documented before every release
