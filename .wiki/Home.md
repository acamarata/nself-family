# ɳFamily Wiki Home

Welcome to the public documentation for **ɳFamily** — a free and open-source family application and reference implementation for the ɳSelf CLI ecosystem.

**Project Owner:** Aric Camarata ([github.com/acamarata](https://github.com/acamarata))
**License:** Personal Use (free) — Commercial license available
**Demo:** [family.nself.org](https://family.nself.org) (read-only exploration)

## What Is This?

This is a **production-ready reference implementation** demonstrating what you can build using only the ɳSelf CLI as your backend. It's designed to be:

- **Cloned and run** — Complete, working application out of the box
- **Customized** — White-label ready for your family/community
- **Educational** — Learn the "ɳSelf way" of building modern apps
- **Production-grade** — Real features, not toy examples

This wiki is the canonical public documentation for building, operating, and customizing the ɳFamily application:

- shared backend platform (`backend`)
- family application (`frontend`)
- ɳChat integration contracts (`frontend/src/integrations/chat`)
- ɳTV integration contracts (`frontend/src/integrations/tv`)

## Start Here

1. [TOC](TOC.md)
2. [Getting Started](00-Getting-Started.md)
3. [Project Overview](01-Project-Overview.md)
4. [Architecture Reference](03-Architecture-Reference.md)
5. [Setup and Configuration](42-Setup-and-Configuration.md)
6. [Feature Index](41-Feature-Index.md)
7. [Releases Index](43-Releases-Index.md)

## Architecture Principles

1. **Backend:** 100% ɳSelf CLI + plugins — no exceptions, no shortcuts
2. **Frontend:** Code once, deploy everywhere (web, desktop, mobile, TV)
3. **Dual-mode:** Runs standalone OR in monorepo with shared backend
4. **Open-source:** Free to use, customize, and deploy
5. **Reference implementation:** The canonical example of ɳSelf architecture

## Scope Boundary

1. `frontend/src/integrations/chat` and `frontend/src/integrations/tv` are integration contracts in this repo
2. Standalone runtime implementation is owned by external `nself-chat` and `nself-tv` repositories
3. Backend architecture follows `ɳSelf` CLI + plugin model religiously and exclusively

## App Entry Points

1. Backend: `../backend/README.md`
2. Frontend: `../frontend/README.md`
3. External `nself-chat` project root: `/Users/admin/Sites/nself-chat`
4. External `nself-tv` project root: `/Users/admin/Sites/nself-tv`

---

## Project Resources

- [Changelog](CHANGELOG.md) — Version history and release notes
- [Contributing](CONTRIBUTING.md) — How to contribute to this project
- [Development Guide](DEVELOPMENT.md) — Setup and development workflow
- [License](LICENSE.md) — Licensing terms and conditions
