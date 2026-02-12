# 27 - Object Storage Layout Convention

## Objective

Make all object paths deterministic and audit-friendly.

## Bucket Strategy

- `nf-media-raw`
- `nf-media-encoded`
- `nf-media-metadata`
- `nf-media-backups`

## Path Convention

`/{env}/{family_id}/{domain}/{content_type}/{content_id}/{artifact_type}/...`

Examples:

- `/prod/fam_123/tv/live-event/evt_456/raw/source.ts`
- `/prod/fam_123/tv/media/m_789/hls/master.m3u8`
- `/prod/fam_123/tv/media/m_789/hls/r720/segment_00001.ts`
- `/prod/fam_123/tv/media/m_789/trickplay/trickplay.vtt`

## Metadata Sidecars

- JSON sidecar per media asset includes profile versions and checksums.
- Maintain SHA256 checksums for critical artifacts.

## Lifecycle Rules

- raw intermediates can expire after retention threshold
- encoded and metadata artifacts retained per family policy
- legal/administrative hold flags override lifecycle deletes
