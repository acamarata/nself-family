# 07 - Data Model Blueprint

## Core Entities

- `families`
- `users`
- `relationships`
- `posts`
- `post_assets`
- `media_items`
- `media_variants`
- `live_events`
- `stream_sessions`
- `device_registrations`
- `audit_events`

## Family and User Concepts

`families` is the tenant root. All product data includes `family_id` unless explicitly global system metadata.

`users` includes role, lifecycle state, and profile fields needed by policy engines.

`relationships` supports family-graph features and optional cultural policy logic.

## Content Surfaces

### Family content

- journals, posts, albums, documents
- visibility policy references
- optional guardianship or inheritance tags

### TV content

- VOD items, episodes, sports recordings
- manifest pointers, runtime metadata, transcoding status
- optional ad-marker metadata and trickplay assets

## Live and Device Model

- AntBox and AntServer represented as trusted devices/services.
- Device registration and heartbeat states tracked.
- Live events map schedule -> ingest -> archive lifecycle.

## Schema Evolution Rules

1. All migrations are forward-only and reversible where practical.
2. Destructive migrations require explicit data retention strategy.
3. Every migration must include compatibility notes for clients.
