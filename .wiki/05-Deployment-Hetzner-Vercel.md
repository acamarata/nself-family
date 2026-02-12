# 05 - Deployment: Hetzner + Vercel

## Production Baseline

This project's reference production deployment is:

- Frontend web apps: Vercel
- Backend compute: Hetzner Cloud VPS
- Object storage: Hetzner Object Storage (S3-compatible)
- CDN and edge TLS/WAF: Cloudflare (or equivalent)

## DNS Strategy

Example white-label domain map:

- `www.<family-domain>` -> family web frontend
- `chat.<family-domain>` -> chat web frontend
- `tv.<family-domain>` -> tv web frontend
- `api.<family-domain>` -> backend gateway
- `media.<family-domain>` -> media origin/CDN domain
- `ingest.<family-domain>` -> antserver ingest endpoints

## Compute Split (Reference)

### Option A (starter)

- single Hetzner VPS hosts API + Hasura + workers
- separate service processes for antserver and media jobs

### Option B (recommended growth)

- VPS #1: API/auth/GraphQL/data services
- VPS #2: ingest/transcode/live workloads
- object storage for persistent media artifacts

## Storage Buckets (Suggested)

- `family-media-raw`
- `family-media-encoded`
- `family-media-thumbnails`
- `family-media-subtitles`
- `family-backups`

## Network and Security Controls

- default deny inbound except required ports
- private network links between backend services
- TLS certificates on all public endpoints
- signed URLs for private media access
- log and alert on repeated auth failures

## Frontend Deploy Strategy

- separate Vercel projects for `family`, `chat`, and `tv` web surfaces
- environment variables managed per target environment
- staged rollout via preview deployments

## Operational Checklist

1. Verify DB backup cron and restore drill status.
2. Verify object storage lifecycle rules.
3. Validate token signing and expiration policy.
4. Validate CDN cache rules for manifests/segments.
5. Validate incident contact and on-call docs.
