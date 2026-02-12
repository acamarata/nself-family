# 09 - Live Sports (NFL-first)

## Scope

NFL is the first-class live sports target. The architecture remains extensible for other leagues.

## Major Components

- `tv-antbox` captures OTA broadcasts and performs edge encoding.
- `tv-antserver` receives ingest, coordinates schedules, and manages recording lifecycle.
- `tv` clients consume live streams and archived recordings.

## Live Flow

1. Scheduler creates event from sports API and channel mapping.
2. AntServer instructs AntBox to tune and start ingest.
3. Stream is packaged for live playback.
4. Recording is retained and post-processed.
5. Final asset is indexed in TV library.

## Event Metadata

Store at minimum:

- league, season, week
- teams and venue
- kickoff and expected end
- channel and market mapping
- status transitions (scheduled/live/final/failed)

## Ad Handling and Skip Roadmap

- v1: marker-only approach with optional user-initiated skip
- v2: confidence-based auto-skip modes
- v3: model-assisted segment classification for higher precision

## Failure Modes

- tuner unavailable
- ingest transport interruption
- insufficient edge compute
- scheduler drift or bad EPG data

Every failure mode requires:

- user-visible status
- operator-facing logs and runbook links
- automatic retry policy where safe
