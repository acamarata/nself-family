# 34 - Database Schema and ER Diagram

## Objective

Provide one canonical ERD reference for all services and clients.

## ER Diagram (Canonical Draft)

```mermaid
erDiagram
  FAMILIES ||--o{ USERS : has
  USERS ||--o{ RELATIONSHIPS : links
  FAMILIES ||--o{ POSTS : owns
  POSTS ||--o{ POST_ASSETS : includes
  FAMILIES ||--o{ MEDIA_ITEMS : owns
  MEDIA_ITEMS ||--o{ MEDIA_VARIANTS : has
  FAMILIES ||--o{ LIVE_EVENTS : schedules
  LIVE_EVENTS ||--o{ EVENT_MARKERS : produces
  USERS ||--o{ STREAM_SESSIONS : opens
  MEDIA_ITEMS ||--o{ STREAM_SESSIONS : streams
  FAMILIES ||--o{ DEVICES : registers
  DEVICES ||--o{ DEVICE_HEARTBEATS : emits
  FAMILIES ||--o{ AUDIT_EVENTS : records
  USERS ||--o{ INHERITANCE_SCENARIOS : owns
```

## Table Contract Notes

- All family-scoped tables must include `family_id`.
- Critical mutable entities require `updated_at` and actor attribution.
- Soft-delete policy must be explicit per table.

## Migration Standards

- forward migration and rollback note required
- seed data isolated from schema migration
- avoid irreversible destructive ops without backup checkpoint
