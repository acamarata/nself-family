# 36 - Observability, Health Checks, and Systemd Definitions

## Objective

Define logs/metrics/alerts and daemon reliability behavior as first-class requirements.

## Observability Baseline

### Logs

- structured JSON logs
- request/session/event identifiers
- ingestion pipeline stage markers

### Metrics

- API latency and error rates
- ingest continuity and reconnect counts
- transcode queue depth and job duration
- device heartbeat freshness

### Alerts

- live event start failure
- ingest disconnection > threshold
- DB backup failure
- auth anomaly burst

## Health Checks and Watchdogs

- FFmpeg crash recovery via supervised restart
- tuner loss detection and retune attempts
- network loss detection and reconnect backoff

## Systemd Requirements

Every daemon unit must define at minimum:

- `Restart=always`
- bounded restart delay
- dedicated service user
- explicit dependency ordering
- health watchdog or equivalent liveness check
