# tv

TV platform adapters for ɳFamily features on TV surfaces.

## Scope

This is NOT the full ɳTV product (that lives in `nself-tv` repo). This covers family-specific features that make sense on TV:

- Family photo slideshows and trip galleries
- Family video calls (Meet-style)
- Family calendar and event dashboards
- Family feed highlights

## Platform Targets

Matches the TV platforms from `nself-tv`:

```text
platforms/tv/
├── android/    # Android TV / Google TV (Leanback)
├── tvos/       # Apple TV (tvOS)
├── webos/      # LG (WebOS)
└── roku/       # Roku (BrightScript/SceneGraph)
```

## Approach

Each platform adapter wraps shared family logic from `../../src/` with TV-optimized UI:

- D-pad / remote-first navigation
- 10-foot UI design (large text, high contrast)
- Lean-back viewing modes for galleries and slideshows
- Platform-native media playback where required

## Status

Future phase. Will be planned when core web/desktop/mobile are stable.
