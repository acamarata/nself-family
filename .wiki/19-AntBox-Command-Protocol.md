# 19 - AntBox Command Protocol

## Objective

Provide strict command schemas and lifecycle behavior for edge-device control.

## Envelope Schema

```json
{
  "protocol_version": "1.0",
  "message_id": "uuid",
  "sent_at": "RFC3339",
  "device_id": "uuid",
  "command": "SCAN_CHANNELS|START_EVENT|STOP_EVENT|HEALTH|UPDATE",
  "payload": {},
  "signature": "base64"
}
```

## Response Schema

```json
{
  "message_id": "uuid",
  "device_id": "uuid",
  "status": "ACK|NACK|ERROR",
  "error_code": "optional-string",
  "error_message": "optional-string",
  "result": {},
  "processed_at": "RFC3339"
}
```

## Commands

### `SCAN_CHANNELS`

Payload:

```json
{
  "scan_mode": "quick|full",
  "timeout_sec": 900
}
```

### `START_EVENT`

Payload:

```json
{
  "event_id": "uuid",
  "channel_ref": "market:virtual-channel",
  "start_mode": "immediate|scheduled",
  "scheduled_at": "RFC3339",
  "ingest_profile": "live_hd|live_full"
}
```

### `STOP_EVENT`

Payload:

```json
{
  "event_id": "uuid",
  "reason": "manual|schedule_end|failure_recovery"
}
```

### `HEALTH`

Payload:

```json
{
  "include_diagnostics": true
}
```

### `UPDATE`

Payload:

```json
{
  "target_version": "semver",
  "channel": "stable|candidate",
  "allow_reboot": true
}
```

## Idempotency Rules

- Duplicate `message_id` must return cached response.
- `START_EVENT` for already-running `event_id` returns `ACK` with current state.
- `STOP_EVENT` for non-running `event_id` returns `ACK` with noop result.
