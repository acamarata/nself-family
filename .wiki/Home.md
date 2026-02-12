# ɳFamily Wiki Home

Welcome to the public architecture and operations wiki for `nself-family`.

Project owner and maintainer: Aric Camarata ([github.com/acamarata](https://github.com/acamarata)).

This wiki is the canonical public source for how to build and operate the `ɳFamily` repository and its ecosystem integration model:

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

## Scope Boundary

1. `frontend/src/integrations/chat` and `frontend/src/integrations/tv` are integration contracts in this repo.
2. Standalone runtime implementation is owned by external `nself-chat` and `nself-tv` repositories.
3. Backend architecture in this repo follows `ɳSelf` CLI + plugin model.

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
