# Backend Schema Plan

## Core Tables

- families
- users
- relationships
- posts
- media_items
- media_variants
- live_events
- stream_sessions
- audit_events
- devices

## Migration Policy

- all changes via migration files
- no direct production schema edits
- destructive changes gated by explicit approval and backup

## Index and Performance Baseline

- family_id indexes on tenant-scoped tables
- created_at indexes for feed and event timelines
- composite indexes for high-frequency lookup patterns
