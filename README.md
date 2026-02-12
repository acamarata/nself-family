# nself-family

Open-source monorepo for `ɳFamily`, built on `ɳSelf` backend foundations.

Project owner and maintainer: Aric Camarata ([github.com/acamarata](https://github.com/acamarata)).

## Scope

1. `backend/` — shared ɳSelf-based backend (identity, auth, tenancy, policy, APIs, jobs, storage)
2. `frontend/` — the ɳFamily application (code once, deploy everywhere)

## Frontend: Code Once, Deploy Everywhere

One shared Next.js codebase with platform-specific wrappers:

- **Web** — Next.js deployed directly
- **Desktop** — Tauri wrapping the web app
- **Mobile** — Capacitor/RN wrapping the web app
- **TV** — Platform-specific adapters for family features on TV (future)

Ecosystem integration points (ɳChat deep-links, ɳTV handoff) live in `frontend/src/integrations/`.

## Ecosystem Model

ɳFamily operates standalone or alongside other ɳSelf ecosystem apps sharing one backend:

1. `www.myfamily.com` → ɳFamily app (this repo)
2. `chat.myfamily.com` → ɳChat app (external: `nself-chat`)
3. `tv.myfamily.com` → ɳTV app (external: `nself-tv`)

## Backend Constraint

1. Backend architecture is ɳSelf CLI + ɳSelf plugins only.
2. No backend bypass pattern outside that stack.
3. Backend capability gaps must be planned explicitly as plugin work.

## Package Manager

`pnpm` is mandatory for all Node/TypeScript workspaces. No npm/yarn lockfiles.

## Private vs Public Docs

1. `.ai/` is private, gitignored — operator planning and control artifacts.
2. `.wiki/` is public, sanitized, wiki-ready.
3. Public artifacts must not contain private planning/process text.

## Release Path

1. Plan09 executes strict phased releases from `v0.1` to `v0.9`.
2. `v0.9` is the final phase release target.
3. `v1.0` is blocked until post-v0.9 hardening and go/no-go approval.

## Naming and Branding

1. Brand display names: `ɳSelf`, `ɳFamily`, `ɳChat`, `ɳTV`.
2. Technical names (ASCII only): `nself`, `nself-family`, `nself-chat`, `nself-tv`.

See `.wiki/45-Branding-and-Naming.md` for full policy.

## Root Structure Policy (Hard)

Root contains only: `.ai/`, `.github/`, `.wiki/`, `backend/`, `frontend/`, `README.md`, `.gitignore`.

AI agent symlinks are configured to point into `.ai/` — never real directories.

## Monorepo Layout

```text
nself-family/
├── .ai/                        # Unified AI agent directory (gitignored)
├── .github/
├── .wiki/
├── .gitignore
├── README.md
├── backend/
│   ├── apps/
│   ├── db/
│   ├── docs/
│   ├── hasura/
│   ├── infra/
│   ├── scripts/
│   └── services/
└── frontend/                   # ɳFamily app
    ├── src/                    # Shared source (code once)
    │   ├── app/                # Next.js App Router
    │   ├── components/
    │   ├── hooks/
    │   ├── lib/
    │   ├── utils/
    │   ├── types/
    │   ├── styles/
    │   └── integrations/       # ɳChat and ɳTV handoff contracts
    ├── platforms/              # Deploy everywhere
    │   ├── desktop/            # Tauri
    │   ├── mobile/             # Capacitor/RN
    │   └── tv/                 # TV adapters (future)
    ├── public/
    ├── tests/
    └── docs/
```

## Quick Start

1. Read `.wiki/Home.md`
2. Read `.wiki/TOC.md`
3. Read `.wiki/00-Getting-Started.md`
