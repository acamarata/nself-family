# Backend API Contracts

## Contract Principles

- explicit versioning for breaking changes
- role-aware contract behavior documented per endpoint
- deterministic error shapes

## Contract Surfaces

- GraphQL schema (Hasura + custom actions)
- service APIs for auth, stream admission, and orchestration
- webhooks/events for async completion states

## Required Contract Docs per Endpoint

- request shape
- response shape
- auth and role requirements
- side effects (DB writes, queued jobs, audit events)
- failure and retry semantics
