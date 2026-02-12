# 20 - OTA Channel Scan Implementation Spec

## Objective

Specify deterministic OTA scanning behavior and storage of signal quality metrics.

## Scan Tools

- Primary: `hdhomerun_config` scan APIs
- Validation: optional ffprobe probe on tuned stream

## Scan Modes

### Quick Scan

- intended for daily health verification
- scans known frequency set for configured market
- target completion: <= 5 minutes

### Full Scan

- complete channel discovery
- includes newly available multiplexes
- target completion: <= 20 minutes

## Output JSON Schema

```json
{
  "scan_id": "uuid",
  "device_id": "uuid",
  "started_at": "RFC3339",
  "completed_at": "RFC3339",
  "market": "string",
  "channels": [
    {
      "physical_channel": "string",
      "virtual_channel": "string",
      "callsign": "string",
      "program_id": "string",
      "signal_strength_pct": 0,
      "signal_quality_pct": 0,
      "symbol_quality_pct": 0,
      "stream_detected": true,
      "status": "ok|weak|failed"
    }
  ]
}
```

## Storage Requirements

- Persist raw scan payload for auditability.
- Persist normalized channel table for scheduling.
- Track last-seen timestamps per channel.

## Scheduling

- Quick scan: daily off-peak.
- Full scan: weekly off-peak and on-demand.
