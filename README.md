# nself-family

**Free and Open-Source Software (FOSS)** — A complete reference implementation of a family application built exclusively with the ɳSelf CLI backend.

Project owner and maintainer: Aric Camarata ([github.com/acamarata](https://github.com/acamarata)).

## Philosophy & Purpose

This repository serves as a **real-world, production-ready example** of what you can build using the ɳSelf CLI as your backend. It demonstrates best practices, architecture patterns, and the "ɳSelf way" of building modern applications.

**Clone. Run. Customize. Done.** — This is a complete working application you can:
- Clone and run as-is for your family
- White-label and customize for your community
- Use as a reference for your own ɳSelf-powered apps
- Contribute improvements back to the community

**Public Demo:** [family.nself.org](https://family.nself.org) (demo mode — read-only exploration)

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

## Backend: The ɳSelf Way (Hard Constraint)

This repository **religiously and exclusively** uses the ɳSelf CLI for all backend functionality. This is non-negotiable and by design — we're demonstrating the ɳSelf architecture pattern.

**Rules:**
1. Backend architecture is 100% ɳSelf CLI + ɳSelf plugins
2. No ad-hoc services, no bypass patterns, no exceptions
3. Any backend capability gap must be planned as explicit plugin work
4. The `/backend` folder is a **complete reference implementation** others can clone

**Why?** To prove you can build real, production-grade applications using only the ɳSelf stack. No shortcuts, no compromises.

## Flexible Architecture

This app is designed to run in **two modes**:

### Standalone Mode
Clone this repo, run it, done. Everything self-contained:
```bash
git clone https://github.com/acamarata/nself-family.git
cd nself-family
./backend/scripts/bootstrap.sh
```

### Monorepo Mode
Multiple apps (ɳFamily, ɳChat, ɳTV) sharing one backend:
```
monorepo/
├── backend/          # Shared ɳSelf backend
├── nself-family/     # This app
├── nself-chat/       # Chat app
└── nself-tv/         # TV app
```

All ɳSelf apps must support both patterns. The backend is flexible, apps are modular.

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

### Run It Yourself
```bash
git clone https://github.com/acamarata/nself-family.git
cd nself-family
./backend/scripts/bootstrap.sh
cd backend && pnpm dev       # Terminal 1
cd frontend && pnpm dev      # Terminal 2 (when ready)
```

Visit `http://localhost:3000` (when frontend is implemented in Phase 3+)

### Explore the Demo
Visit **[family.nself.org](https://family.nself.org)** to try the app in demo mode (read-only).

### Customize It
1. Fork this repository
2. Update branding in `.wiki/45-Branding-and-Naming.md`
3. Configure features in `backend/.env`
4. Deploy following `.wiki/05-Deployment-Hetzner-Vercel.md`

### Learn More
1. Read `.wiki/Home.md` — Start here
2. Read `.wiki/TOC.md` — Full documentation index
3. Read `.wiki/00-Getting-Started.md` — Setup guide
4. Read `.wiki/03-Architecture-Reference.md` — How it works
