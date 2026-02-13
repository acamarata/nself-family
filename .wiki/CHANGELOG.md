# Changelog

All notable repository-level changes are documented here.

## v0.9 — Release Candidate (2026-02-13)

Phase 9: Hardening, CI/CD, white-label, and final QA.

### Added

- CI/CD pipeline: GitHub Actions for lint, typecheck, test, build, staging deploy, production deploy with auto-rollback
- API versioning system: URL path, Accept header, X-API-Version header resolution with deprecation sunset headers
- SDK type generation from endpoint catalog
- Data portability: GDPR-compliant family data export (JSON), import with UUID remapping, deletion in FK-safe order, integrity verification
- Multi-tenant isolation hardening: 62 adversarial tests covering cross-tenant data leaks, SQL injection, privilege escalation
- Integration and contract test suite: 115 tests covering all backend flows across all phases
- White-label configuration: environment-driven branding, domain mapping, feature flags, locale settings
- Operational runbooks: API outage triage, database backup/restore, storage failure, key rotation, device reprovisioning, migration rollback
- Release readiness documentation and production deployment checklist
- Desktop app (Tauri v2) and mobile app (Capacitor) platform wrappers

### Changed

- Backend docs upgraded from skeletal templates to comprehensive implementation docs (API contracts, schema plan with field-level detail, RBAC permission matrix, architecture diagrams, deployment procedures)
- Fixed Zod v4 compatibility: `z.record(z.string(), z.unknown())` for all record schemas (single-arg form has a bug in v4.3.6)
- Fixed `useGraphQL` hook destructuring across vault, search, devices, and TV hooks
- Fixed `useFamilyMembers` call in chat page (missing required argument)

### Test Coverage

- Backend: 521 tests across 29 files (all passing)
- Frontend: 240 tests across 21 files (all passing)
- Total: 761 tests across 50 files

## v0.8 — Ecosystem (2026-02-13)

Phase 8: TV integration, devices, desktop, and mobile platforms.

## v0.7 — Continuity (2026-02-13)

Phase 7: Legacy vault, inheritance, search, and offline support.

## v0.6 — Chat (2026-02-13)

Phase 6: Chat integration, messaging, and notifications.

## v0.5 — Life (2026-02-13)

Phase 5: Calendar, trips, location sharing, and recipes.

## v0.4 — Social (2026-02-13)

Phase 4: Albums, visibility policies, Islamic mode, and genealogy.

## v0.3 — Family MVP (2026-02-13)

Phase 3: App shell, feed, posts, and relationships.

## v0.2 — Core Data (2026-02-13)

Phase 2: Content schema, Hasura RBAC, media pipeline, and audit logging.

## v0.1 — Foundation (2026-02-11)

Phase 1: Backend bootstrap, auth service, database schema, Docker Compose, tests.

## Pre-release

1. Root structure policy locked to private control planes, app roots (`backend`, `frontend`), automation (`.github`), and public wiki (`.wiki`).
2. Public wiki source moved from `/docs` to `/.wiki`.
3. Planning and execution controls were hardened for Plan09 governance (`v0.1` -> `v0.9`) with strict CR/QA evidence requirements.
