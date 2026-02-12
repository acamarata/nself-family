# 25 - Trickplay Thumbnail Generation Spec

## Objective

Standardize thumbnail preview generation across VOD and archived live assets.

## Generation Rules

- Capture interval: every 5 seconds
- Base thumbnail size: 320x180
- Sprite grid: 10 columns x 10 rows (100 thumbs per sprite)
- Multi-sprite support for long assets

## Naming Convention

- `sprite-0001.jpg`, `sprite-0002.jpg`, ...
- `trickplay.vtt` for cue mapping

## VTT Cue Format

Each cue maps timestamp ranges to sprite + coordinates.

Example coordinate format:

`#xywh=x,y,width,height`

## Storage Rules

- Store trickplay assets with encoded media set.
- Version by encoding profile revision.

## Client Behavior

- Load VTT lazily on first seek gesture.
- Fail gracefully when trickplay assets are absent.
