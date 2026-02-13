# Operational Runbooks

Production and staging operational procedures for nFamily backend services.

## Runbook Index

| Runbook | Scenario | Priority |
|---------|----------|----------|
| [API Outage Triage](#api-outage-triage) | API service unreachable or returning errors | P0 |
| [Database Backup & Restore](#database-backup--restore) | Restore database from backup | P1 |
| [Object Storage Failure](#object-storage-failure) | MinIO/S3 storage unavailable | P1 |
| [Token Signing Key Rotation](#token-signing-key-rotation) | Rotate JWT signing keys | P2 |
| [Device Reprovisioning](#device-reprovisioning) | Re-enroll devices after key compromise | P2 |
| [Service Recovery](#service-recovery) | Restart individual services | P2 |
| [Migration Rollback](#migration-rollback) | Roll back a failed database migration | P1 |

---

## API Outage Triage

### Symptoms
- Health endpoint returns non-200
- Frontend shows connection errors
- Monitoring alerts fire

### Investigation Steps

```bash
# 1. Check service status
cd backend && nself status

# 2. Check service logs
nself logs api --tail 100
nself logs auth --tail 100

# 3. Check database connectivity
nself db console
# Then: SELECT 1;

# 4. Check resource usage
docker stats --no-stream

# 5. Check nginx routing
nself logs nginx --tail 50
```

### Resolution

| Root Cause | Action |
|------------|--------|
| Service crashed | `nself restart api` or `nself restart auth` |
| Database connection pool exhausted | `nself restart` (full restart) |
| Out of memory | Increase container limits in `.env`, then `nself build && nself restart` |
| Nginx misconfigured | `nself build` to regenerate, then `nself restart nginx` |
| DNS resolution failure | Check server DNS settings, verify domain records |

### Escalation
If service doesn't recover after restart: check `nself doctor` output, review recent changes, consider rollback.

---

## Database Backup & Restore

### Create Backup

```bash
# Automated backup
nself db backup

# Manual backup with timestamp
nself db dump > backup-$(date +%Y%m%d-%H%M%S).sql
```

### Restore from Backup

```bash
# 1. Stop services that use the database
nself stop api auth scheduler

# 2. Restore backup
nself db restore < backup-file.sql

# 3. Verify data integrity
nself db console
# Then: SELECT COUNT(*) FROM public.families;

# 4. Restart services
nself start
```

### Point-in-Time Restore

```bash
# PostgreSQL WAL-based recovery (if WAL archiving enabled)
# 1. Stop PostgreSQL
nself stop postgres

# 2. Replace data directory with base backup
# 3. Configure recovery.conf with target time
# 4. Start PostgreSQL to replay WAL
nself start postgres

# 5. Verify data integrity
nself health
```

---

## Object Storage Failure

### Symptoms
- Media uploads failing
- Images not loading
- Storage health check failing

### Investigation

```bash
# Check MinIO status
nself status minio
nself logs minio --tail 50

# Check disk space
df -h

# Verify MinIO console access
nself urls | grep minio
```

### Resolution

| Root Cause | Action |
|------------|--------|
| MinIO service down | `nself restart minio` |
| Disk full | Clean old media, expand storage |
| Bucket missing | Recreate via MinIO console or `mc mb` |
| Permission error | Check MinIO access/secret keys in `.env` |

---

## Token Signing Key Rotation

### When to Rotate
- Suspected key compromise
- Scheduled rotation (quarterly recommended)
- Personnel changes

### Procedure

```bash
# 1. Generate new key
openssl rand -base64 64

# 2. Update .env
# JWT_SECRET=<new-key>

# 3. Rebuild and restart auth service
nself build && nself restart auth

# Note: All existing tokens will be invalidated.
# Users will need to re-authenticate.
```

### Verification

```bash
# Test authentication flow
curl -X POST https://family.nself.org/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"test"}'
```

---

## Device Reprovisioning

### When Needed
- Device bootstrap token compromised
- Bulk device reset required
- Security incident

### Procedure

```bash
# 1. Revoke all device credentials for a family
nself db console
# Then: UPDATE public.registered_devices SET status = 'revoked' WHERE family_id = '<family-id>';

# 2. Users re-register devices through the app
# They'll see devices as "revoked" and can register new ones

# 3. For individual device revocation
# The app's device management page handles this
```

---

## Service Recovery

### Restart Individual Service

```bash
nself restart <service-name>
# e.g., nself restart api, nself restart auth, nself restart scheduler
```

### Full Stack Restart

```bash
nself stop && nself start
```

### Nuclear Option (Rebuild Everything)

```bash
nself stop
nself build
nself start
nself health
```

---

## Migration Rollback

### Roll Back Last Migration

```bash
# 1. Identify current migration
ls -la backend/db/migrations/

# 2. Apply down migration
nself db migrate down

# 3. Verify schema state
nself db console
# Then: \dt public.*
```

### Roll Back to Specific Version

```bash
# Apply down migrations in reverse order
# e.g., to roll back from migration 013 to 010:
nself db migrate down --to 010
```

---

## Production Deployment Checklist

### Pre-Deploy
- [ ] All tests passing (`pnpm test` in backend and frontend)
- [ ] No C-grade features in QA sweep
- [ ] Database backup taken (`nself db backup`)
- [ ] Release notes prepared
- [ ] Team notified of deployment window

### Deploy
- [ ] Tag release (`git tag v0.X`)
- [ ] Push tag (`git push origin v0.X`)
- [ ] Trigger production deployment workflow
- [ ] Monitor deployment progress

### Post-Deploy
- [ ] Health checks passing (`nself health`)
- [ ] Run smoke tests (login, create post, upload media)
- [ ] Monitor error rates for 15 minutes
- [ ] Verify no regression in key metrics
- [ ] Update status page if applicable

### Rollback Criteria
- Health check fails after 3 retries
- Error rate exceeds 5% in first 15 minutes
- Critical feature regression detected
- Data corruption detected
