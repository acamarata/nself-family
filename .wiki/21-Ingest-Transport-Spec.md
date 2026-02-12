# 21 - Ingest Transport Spec (SRT vs RTMP vs HLS Push)

## Objective

Pick and document one primary transport with explicit fallback and reconnect logic.

## Decision

- Primary ingest transport: SRT
- Fallback transport: RTMP
- HLS push: not primary for live ingest control path

## Why SRT Primary

- better resilience for lossy uplinks
- built-in retransmission and latency tuning
- suitable for edge-to-cloud contribution links

## Baseline SRT Settings

- mode: caller (AntBox) -> listener (AntServer)
- latency: 120-200 ms baseline (tunable)
- encryption: enabled with pre-shared passphrase or keying model

## RTMP Fallback Conditions

Use RTMP only when:

- SRT client/server incompatibility is detected
- network policy blocks SRT transport
- controlled temporary fallback during incident response

## Reconnection Logic

1. Immediate reconnect attempt (1 second delay).
2. Exponential backoff up to 30 seconds.
3. Keepalive health signal every 5 seconds while disconnected.
4. Mark event degraded after 90 seconds disconnected.

## Retry State Machine

- `connected`
- `degraded`
- `reconnecting`
- `failed`

Transition to `failed` only after operator threshold and fallback exhaustion.
