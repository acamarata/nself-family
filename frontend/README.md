# frontend

The `ɳFamily` application. Code once, deploy everywhere.

## Architecture

One shared Next.js codebase in `src/` with platform-specific wrappers in `platforms/`.

| Surface | Tech                       | Path                                      |
| ------- | -------------------------- | ----------------------------------------- |
| Web     | Next.js                    | `src/` (direct deploy)                    |
| Desktop | Tauri                      | `platforms/desktop/` wraps `src/`         |
| Mobile  | Capacitor or React Native  | `platforms/mobile/` wraps `src/`          |
| TV      | Platform-specific (future) | `platforms/tv/` for family features on TV |

## Structure

```text
frontend/
├── src/                    # Shared source (the "code once" layer)
│   ├── app/                # Next.js App Router
│   ├── components/         # React components
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Service clients, auth, state
│   ├── utils/              # Pure utility functions
│   ├── types/              # TypeScript type definitions
│   ├── styles/             # Global styles and theme
│   └── integrations/       # Ecosystem integration points
│       ├── chat/           # ɳChat deep-link and handoff contracts
│       └── tv/             # ɳTV deep-link and handoff contracts
├── platforms/              # Platform-specific wrappers
│   ├── desktop/            # Tauri config, native bridges
│   ├── mobile/             # Capacitor/RN config, native modules
│   └── tv/                 # TV adapters (future)
├── public/                 # Static assets
├── tests/                  # Test suites
└── docs/                   # Frontend documentation
    ├── architecture/
    ├── platforms/
    └── product/
```

## Design Principles

1. **Shared source first** — all UI, logic, hooks, and utils live in `src/`. Platform wrappers only add native bridges.
2. **Web is the primary target** — Next.js app deploys directly. Desktop and mobile wrap the same code.
3. **Integration, not embedding** — chat and TV features are handled via deep-links and handoff contracts to their upstream repos, not by embedding their runtimes.
4. **SaaS-ready** — architecture supports standalone use, side-by-side ecosystem deployment, or multi-tenant SaaS.

## Ecosystem Integration

This app integrates with the broader ɳSelf ecosystem:

- `src/integrations/chat/` — contracts for deep-linking to ɳChat (`nself-chat` repo)
- `src/integrations/tv/` — contracts for deep-linking to ɳTV (`nself-tv` repo)

These are handoff contracts, not runtime code. The actual chat and TV apps live in their own repos.

## Package Manager

`pnpm` is mandatory. Lockfile is `pnpm-lock.yaml`. No npm/yarn lockfiles.
