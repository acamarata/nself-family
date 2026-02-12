# 18 - Device Identity and Registration Protocol

## Objective

Define one trusted enrollment model for edge devices and server services.

## Identity Model

- Device ID: immutable UUIDv4
- Keypair: Ed25519 (device-generated)
- Cert mode: optional mTLS certificate signed by platform CA
- Network mode: optional WireGuard tunnel for control + telemetry channels

## Enrollment Sequence

1. Device generates keypair locally.
2. Device submits enrollment request with public key + bootstrap token.
3. Server validates bootstrap token and expected device metadata.
4. Server issues signed certificate or long-lived device credential.
5. Device confirms enrollment by signed nonce challenge.

## Handshake Requirements

- Mutual challenge-response before command acceptance.
- Clock-skew tolerance: <= 60 seconds.
- Replay protection via nonce cache (5 minute TTL).

## Transport Options

### Option A: mTLS Primary

- control channel and telemetry over mTLS
- certificate rotation every 90 days

### Option B: WireGuard + Token

- WireGuard tunnel establishes network trust
- token-based app auth inside tunnel
- rotate tunnel keys on 90-day cadence

## Revocation and Rotation

- Immediate revocation list enforced on control plane.
- Device must re-enroll after key compromise.
- Rotation must be zero-downtime where possible.
