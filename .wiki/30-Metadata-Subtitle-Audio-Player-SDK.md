# 30 - Metadata, Subtitle/Audio Handling, and Player SDK Decisions

## Objective

Define deterministic metadata ingestion and playback stack decisions.

## Metadata Ingestion Flow

1. Parse filename and embedded media tags.
2. Query metadata providers (TMDB/TVDB/other configured source).
3. Normalize fields to internal schema.
4. Cache posters/backdrops into object storage.
5. Persist provider IDs and refresh metadata schedule.

## Poster Caching Rules

- Cache all referenced poster/backdrop assets locally.
- Track source URL and retrieval timestamp.
- Refresh only on schedule or explicit invalidation.

## Refresh Schedule

- static catalog items: weekly refresh
- active/ongoing series: daily refresh
- sports metadata: event-driven refresh + final score reconciliation

## Subtitle Handling

- extract subtitles from source when available
- normalize to WebVTT where possible
- preserve original subtitle file as source artifact

## Audio Track Handling

- detect and index language + codec for each track
- preserve default track flags
- expose selectable tracks in client metadata

## Player SDK Decisions

### Web

- Primary: HLS.js over MSE
- Fallback: native HLS when browser supports robustly

### Android/Mobile

- Primary: ExoPlayer for Android, AVPlayer for Apple
- Flutter wrapper acceptable where capability parity is validated

### TV Platforms

- Use platform-native players where required for stability and certification constraints
