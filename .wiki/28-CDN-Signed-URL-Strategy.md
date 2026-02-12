# 28 - CDN Strategy: Cache, Signed URLs, and Purge

## Objective

Define cache and access rules to balance security, playback reliability, and cost.

## Cache Policy

### HLS Master/Variant Manifests

- Cache TTL: 5-15 seconds for live, 60-300 seconds for VOD
- Must-revalidate enabled

### Media Segments

- Live segments: short TTL (30-120 seconds)
- VOD segments: long TTL (1-30 days)

### Metadata and Images

- TTL: 1-30 days depending on update frequency

## Signed URL Policy

- Issue signed URLs from backend stream gateway.
- VOD URL TTL: 10-30 minutes.
- Live URL TTL: 2-5 minutes, auto-refresh by session heartbeat.

## Purge Logic

- Purge on metadata corrections and manifest rebuilds.
- Use path-based purge by content_id.
- Maintain purge audit logs.

## Abuse Controls

- rate limit token issuance
- bind token claims to user/session context
- detect token replay anomalies
