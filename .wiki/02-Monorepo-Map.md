# 02 - Monorepo Map

## Top-Level Tree

```text
.
├── .github/
├── .wiki/
├── backend/
├── frontend/
│   ├── family/
│   ├── chat/
│   └── tv/
├── README.md
└── .gitignore
```

## Repository Conventions

- Root allowlist is strict: automation, public wiki, app domains, and minimal root files.
- Public docs live under `/.wiki/`.
- Planning/temp artifacts belong under private control planes only.

## App Ownership Boundaries

### backend

- auth, tenant/family model, RBAC claims
- GraphQL + service APIs
- orchestration and long-running workflows
- unified data contract for all clients

### chat

- integration shell in `frontend/chat` for upstream `nself-chat`
- family-role and tenancy-aware chat embedding
- ecosystem routing (`chat.<domain>`) and SSO integration points

### family

- implemented in `frontend/family`
- social feed, journals, albums, family tree
- optional Islamic mode policy surfaces
- end-of-life and stewardship workflows

### tv

- integration shell in `frontend/tv` for upstream `nself-tv`
- family-aware navigation, permissions, and embedding points
- ecosystem routing (`tv.<domain>`) and shared identity integration

## Implementation Sequencing Suggestion

1. `backend`
2. `frontend/family`
3. `frontend/chat`
4. `frontend/tv`

This sequence favors foundational contracts before external-app integration.
