# 16 - Hetzner Sizing Plan (Exact Baseline)

## Objective

Provide concrete sizing defaults so implementations do not under-provision or over-complicate early deployments.

## Deployment Profiles

### Profile A - Starter Family

- Backend/API/DB VPS: 4 vCPU, 8 GB RAM, 160 GB NVMe, 1 Gbps
- Media/AntServer VPS: 8 vCPU, 16 GB RAM, 240 GB NVMe, 1 Gbps
- Object storage: 1 TB bucket baseline

### Profile B - Recommended Default

- Backend/API VPS: 4 vCPU, 8 GB RAM, 160 GB NVMe
- DB dedicated VPS: 4 vCPU, 16 GB RAM, 240 GB NVMe
- Media/AntServer VPS: 8 vCPU, 16 GB RAM, 320 GB NVMe
- Object storage: 2 TB baseline

### Profile C - Heavy Live + Archive

- Backend/API VPS: 8 vCPU, 16 GB RAM, 240 GB NVMe
- DB VPS: 8 vCPU, 32 GB RAM, 320 GB NVMe
- AntServer live VPS: 8 vCPU, 16 GB RAM, 240 GB NVMe
- VOD worker VPS: 16 vCPU, 32 GB RAM, 480 GB NVMe
- Object storage: 4 TB+ baseline

## Service Placement Matrix

| Service | Profile A | Profile B | Profile C |
|---|---|---|---|
| Postgres | shared with backend | dedicated | dedicated |
| Hasura/API | shared backend | shared backend | dedicated API tier |
| Scheduler/Orchestrator | backend VPS | backend VPS | backend VPS |
| AntServer ingest | media VPS | media VPS | dedicated live VPS |
| VOD workers | media VPS | media VPS | dedicated worker VPS |

## Split Triggers

Split AntServer, VODServer, and FamServer when any condition is true for 7-day rolling window:

- API p95 latency > 400 ms during live events
- DB CPU > 70% sustained for > 20 min daily
- Media queue delay > 30 min for standard jobs
- Live ingest packet-loss recovery events > 3 per event on average

## Storage Allocation Rules

- Keep only rolling hot live buffer on VPS local disk.
- Treat object storage as source of truth for media artifacts.
- Use lifecycle policies for derivative assets and stale intermediates.
