# 11 - Operations and Runbooks

## Operational Domains

- platform health monitoring
- backup and restore validation
- media ingest/transcoding lifecycle
- device fleet status (antbox nodes)
- deployment and rollback

## Required Dashboards

- API latency and error rates
- job queue depth and failure counts
- live ingest uptime and reconnect rate
- storage growth and egress usage
- auth anomalies and security events

## Critical Runbooks

1. API outage triage
2. Database backup restore drill
3. Object storage access failure
4. Live ingest failure (game in progress)
5. Transcode queue saturation
6. Token signing key rotation
7. Device reprovisioning (antbox replacement)

## SLO Suggestions

- API availability target
- media playback start-time target
- live ingest continuity target
- mean-time-to-recovery target

SLO thresholds should be tuned per family deployment size.
