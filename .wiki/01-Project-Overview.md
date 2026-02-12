# 01 - Project Overview

## Mission

Create an open-source, self-hostable family ecosystem with:

- private social + life archive features
- family-first messaging
- strong privacy, access control, and governance

## Why This Exists

Many families need one platform that combines:

- social memory (journals, photos, stories)
- practical coordination (chat, location, household workflows)
- long-term digital stewardship across generations

This project is designed to serve that full lifecycle.

## Product Surfaces

- `family`: life platform and private social graph
- `backend`: source-of-truth API/auth/data services
- `chat`: integration surface for the external `nself-chat` project
- `tv`: integration surface for the external `nself-tv` project

## Ecosystem Projects

1. `nself-family` (this repository): family app + shared backend + integrations.
2. `nself-chat` (external): standalone ɳChat product with white-label direction.
3. `nself-tv` (external): standalone ɳTV product (VOD/live/AntBox/AntServer stack).

## Non-Goals (Initial)

- public social network growth loops
- ad-supported monetization
- lock-in to proprietary cloud vendors

## Delivery Philosophy

- Documentation-first architecture.
- Implementation in iterative vertical slices.
- Reliability and operability treated as first-class requirements.
