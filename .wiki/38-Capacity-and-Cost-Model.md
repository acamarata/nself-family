# 38 - Capacity Planning and Storage/Cost Model

## Objective

Give planning tables for streams, tuners, compute, and storage growth.

## Capacity Table (Planning Baseline)

| Component | Baseline Capacity Assumption |
|---|---|
| AntBox tuners | 4 concurrent channel captures per device |
| AntBox live encodes | 2-4 stable live outputs depending on profile |
| AntServer live ingest VPS | 4-8 concurrent event streams (profile dependent) |
| VOD worker VPS | 4-10 parallel transcode jobs (profile dependent) |

## Stream Capacity Guardrails

- Keep 20% headroom during peak windows.
- Trigger scaling actions before sustained > 80% utilization.

## Storage Growth Model

Approximate storage growth:

`monthly_growth_gb = (hours_recorded * gb_per_hour_encoded) + user_upload_gb`

Track by class:

- raw live captures
- encoded ladders
- thumbnails/subtitles/metadata

## Cost Model Inputs

- object storage total GB
- egress TB
- VPS count and sizing profile
- CDN feature tier

## Forecast Checklist

- monthly forecast and actual variance report
- quarterly retention policy review
- alert when 80% storage quota reached
