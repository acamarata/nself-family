# 08 - Media Pipeline

## Pipeline Stages

1. Ingest
2. Validate
3. Transcode
4. Package (HLS)
5. Generate metadata assets
6. Store and index
7. Publish availability

## Ingest Sources

- user uploads (family or tv app)
- AntServer live recording outputs
- curated imports (future)

## Encoding Strategy (Reference)

- baseline codec: H.264 + AAC
- adaptive renditions from low to high quality
- generate aligned keyframes for smooth ABR switching

## Packaging

- HLS master playlist + variant playlists
- segment strategy optimized for device compatibility
- optional LL-HLS investigation for future low-latency profiles

## Metadata and UX Assets

- posters/backdrops
- subtitles extraction and normalization
- trickplay thumbnails and seek maps
- content category and parental/policy tags

## Reliability Requirements

- resumable job queue
- idempotent processing steps
- per-stage retries with dead-letter queue strategy
- full job traceability for support and debugging
