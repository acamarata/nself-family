# 14 - Contributing Workflow

## Contribution Principles

- architecture-aware changes only
- documentation updated with every behavioral change
- no silent breaking changes

## Branch and PR Practices

- one clear objective per change
- include migration notes when schema changes
- include rollout and rollback notes for operational changes

## Documentation Contract

Every meaningful code change should update:

- affected app `README.md` if onboarding changes
- affected wiki pages under `/.wiki/` if architecture/contract changes
- root docs if cross-app behavior changes

## Review Checklist

1. Security and policy implications reviewed.
2. Data model changes are backward-compatible or clearly versioned.
3. Operational impact and monitoring requirements identified.
4. Tests and validation strategy documented.
