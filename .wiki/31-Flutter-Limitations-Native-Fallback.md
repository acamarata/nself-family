# 31 - Flutter Limitations and Native Fallback Plan

## Objective

Avoid forcing Flutter where platform-native implementation is required for reliability or store compliance.

## Decision Framework

Use Flutter by default unless any of the following are true:

- platform media APIs required but unsupported by stable Flutter plugins
- remote-control/focus behavior on TV cannot meet UX requirements
- DRM/certification requirements mandate native SDKs
- critical playback metrics show persistent failures unique to Flutter layer

## Fallback Targets

- Android TV: native Android if Flutter focus/performance fails targets
- tvOS: native Swift/AVKit if plugin capability is insufficient
- Roku/webOS: native channel/app frameworks as first-class targets

## Dual-Track Strategy

- Keep shared domain contracts in language-neutral specs.
- Keep business rules server-side where possible.
- Keep per-platform UI/player implementations isolated.
