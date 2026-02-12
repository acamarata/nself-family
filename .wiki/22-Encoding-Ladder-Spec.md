# 22 - Encoding Ladder Specification

## Objective

Define deterministic encoding presets for live and VOD to avoid inconsistent media outputs.

## Codec Baseline

- Video: H.264 (AVC) baseline for compatibility
- Audio: AAC-LC stereo baseline
- Subtitle: WebVTT sidecar where available

## VOD Ladder (Default)

| Rendition | Resolution | Video Bitrate | Audio Bitrate | Target Use |
|---|---|---:|---:|---|
| r240 | 426x240 | 350 kbps | 64 kbps | low bandwidth |
| r360 | 640x360 | 700 kbps | 96 kbps | mobile constrained |
| r480 | 854x480 | 1200 kbps | 128 kbps | mobile standard |
| r720 | 1280x720 | 2800 kbps | 128 kbps | hd baseline |
| r1080 | 1920x1080 | 5000 kbps | 192 kbps | full hd |
| r2160 (optional) | 3840x2160 | 12000 kbps | 192 kbps | 4k capable |

## Live Ladder (Default)

| Rendition | Resolution | Video Bitrate | Audio Bitrate |
|---|---|---:|---:|
| l480 | 854x480 | 1200 kbps | 128 kbps |
| l720 | 1280x720 | 2800 kbps | 128 kbps |
| l1080 | 1920x1080 | 5000 kbps | 192 kbps |

## Segment and GOP Rules

- Segment duration: 4 seconds
- GOP length: 2 seconds
- Keyframe alignment: strict across renditions
- Scene-cut handling: constrained to preserve ABR switching stability

## Packaging

- HLS master + variant playlists
- consistent naming by rendition id
- include codecs and bandwidth attributes in manifest
