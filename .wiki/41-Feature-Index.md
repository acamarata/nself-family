# 41 - Feature Index

## Purpose

Provide one public index of major capability groups and owning scope.

## Family Product (In Repo)

1. Identity-aware family shell and profile lifecycle.
2. Feed, journals, albums, and policy-aware sharing.
3. Governance, consent, privacy, and optional policy extensions.
4. Family operations and long-term continuity workflows.

## Chat Integration (In Repo, Integration Shell)

1. Shared-auth handoff into upstream `nself-chat`.
2. Family-policy context bridge for chat access.
3. Deep-link and navigation integration.
4. Compatibility contracts and integration tests.

## TV Integration (In Repo, Integration Shell)

1. Shared-auth handoff into upstream `nself-tv`.
2. Entitlement and policy-claim bridge.
3. TV domain routing and wrapper entry points.
4. Cross-repo compatibility contracts and tests.

## Shared Backend (In Repo)

1. `ɳSelf` CLI + plugin-only backend architecture.
2. Auth/session/tenancy and policy contracts.
3. Data contracts, migration governance, and observability.
4. Security and operational runbooks.

## Externalized Ecosystem Scope (Out of Repo Runtime Ownership)

1. Full standalone `nself-chat` runtime behavior.
2. Full standalone `nself-tv` runtime behavior.
3. AntBox/AntServer implementation and live ingest internals.
