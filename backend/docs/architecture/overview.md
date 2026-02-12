# Backend Architecture Overview

## Service Boundaries

- `auth`: login, refresh, claims, device-code pairing.
- `orchestrator`: cross-service workflows and long-running actions.
- `stream-gateway`: stream session admission and limits.
- `scheduler`: live-event and recurring job scheduling.
- `jobs`: asynchronous workers for media and maintenance tasks.

## Data Plane

- Postgres as primary data and policy context source.
- Hasura exposes GraphQL with role and family-scoped filters.
- Service APIs provide non-CRUD operations and policy enforcement.

## Control Plane

- orchestration of scheduled jobs
- device registration and trust establishment
- incident and retry paths for long-running tasks

## Cross-Cutting Requirements

- trace identifiers across requests and jobs
- idempotent workflow steps
- strict audit events for privileged actions
