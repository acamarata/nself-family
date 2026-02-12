# 33 - Auth and SSO Design Across Services

## Objective

Define one token and session model for family, chat, tv, antbox, and antserver integrations.

## Token Types

- Access token (JWT)
- Refresh token (opaque, revocable)
- Device pairing token (short-lived)
- Service token (machine-to-machine)

## JWT Claims Baseline

- `sub` (user/device id)
- `family_id`
- `role`
- `permissions` (optional scoped list)
- `session_id`
- `iat` / `exp`

## Expiry Policy

- Access token: 10-30 minutes
- Refresh token: 7-30 days (rotating)
- Device pairing token: 5-10 minutes

## Refresh Policy

- rotate refresh token on every successful refresh
- revoke token chain on suspicious behavior
- enforce inactivity expiration policy

## SSO Behavior

- One identity session used across family/chat/tv.
- TV devices primarily use device-code flow.
- Services use scoped machine tokens only.
