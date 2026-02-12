# 23 - Live DVR Buffer Design

## Objective

Define live time-shift behavior, buffer limits, and rollover handling.

## Buffer Window Defaults

- Standard live event: 6-hour rolling buffer
- Extended event mode: 10-hour rolling buffer
- Emergency minimum mode: 2-hour rolling buffer

## Disk Allocation Formula

`required_gb = (sum_bitrates_mbps / 8) * buffer_hours * 3600 / 1024`

Apply 35% safety margin for filesystem overhead and transient retry segments.

## Rollover Behavior

- Ring-buffer semantics by segment age.
- Always retain newest segments.
- Evict oldest segments once cap is reached.

## Playback Constraints

- Users may seek anywhere within retained window.
- Seek outside retained window returns bounded error and jump-to-earliest action.

## Recording Interaction

- DVR buffer is not the final archive artifact.
- Archive pipeline extracts and re-encodes finalized event assets.
