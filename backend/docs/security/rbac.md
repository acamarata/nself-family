# Backend RBAC and Security Notes

## Role Baseline

- OWNER
- ADMIN
- ADULT_MEMBER
- YOUTH_MEMBER
- CHILD_MEMBER
- DEVICE

## Authorization Gates

- family boundary check first
- role check second
- relationship/policy check third (optional modes)

## Security Hardening Targets

- signing key rotation and grace window
- short-lived access tokens
- refresh token revocation support
- immutable audit logs for privileged operations
