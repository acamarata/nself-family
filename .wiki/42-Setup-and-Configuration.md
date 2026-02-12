# 42 - Setup and Configuration

## Purpose

Define setup/configuration expectations for local, staging, and production use.

## Local Setup

1. Install and configure `ɳSelf` CLI.
2. Configure local `.env` files (never commit secrets).
3. Start backend dependencies using approved local runtime contracts.
4. Validate app shells (`family`, `chat`, `tv`) against local integration routes.

## Configuration Domains

1. Identity/session settings.
2. Tenant/policy defaults.
3. Storage/media configuration.
4. Domain routing for `www/chat/tv` subdomains.
5. Observability and alerting thresholds.

## Environment Modes

1. Local: fast iteration and deterministic fixtures.
2. Staging: production-like integration validation.
3. Production: hardened networking, storage, and operational controls.

## Security and Secrets

1. Keep secrets out of source control.
2. Rotate credentials and signing material on schedule.
3. Validate policy boundary behavior after config changes.

## Related Docs

1. [Environment Strategy](04-Environment-Strategy.md)
2. [Deployment: Hetzner + Vercel](05-Deployment-Hetzner-Vercel.md)
3. [Security and Privacy](10-Security-Privacy.md)
4. [Operations and Runbooks](11-Operations-Runbooks.md)
