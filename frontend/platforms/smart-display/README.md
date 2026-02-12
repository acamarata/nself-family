# smart-display

Smart display platform adapters for Google Nest Hub, Amazon Echo Show, and Meta Portal.

## Overview

Smart displays are 7-15" touchscreen devices optimized for glanceable information and voice interaction. They run web apps (Nest Hub, Echo Show) or Android (Portal).

## Platforms

### google-nest/
Google Nest Hub (7") and Nest Hub Max (10")
- Tech: PWA optimized for Cast platform
- Voice: Google Assistant integration
- Features: Ambient mode (photo frame), video calls

### echo-show/
Amazon Echo Show 5/8/10/15
- Tech: PWA with Alexa Web API
- Voice: Alexa skill integration
- Features: Drop-in calls, kitchen mode

### portal/
Meta Portal and Portal+
- Tech: Android app with WebView
- Features: Smart camera, Messenger integration

## Shared Features

All smart display apps should support:
- **Ambient mode** — photo frame when idle
- **Voice commands** — "show family photos", "show calendar"
- **Video calls** — family video chat
- **Glanceable info** — weather, events, reminders
- **Touch optimized** — large touch targets

## Development

```bash
# Build for Google Nest Hub
cd platforms/smart-display/google-nest
pnpm build

# Build for Echo Show
cd platforms/smart-display/echo-show
pnpm build

# Build for Portal
cd platforms/smart-display/portal
pnpm build
```

## Design Guidelines

- **Large text** — minimum 18pt for body, 24pt for headings
- **High contrast** — displays often in bright rooms
- **Simple navigation** — 2-3 taps maximum to any feature
- **Landscape-first** — displays are usually landscape orientation
- **Always-on UI** — show clock, weather, next event

## Performance Targets

| Metric | Target |
| ------ | ------ |
| Launch time | <800ms |
| Interaction response | <50ms |
| Memory usage | <80MB |
| Ambient mode FPS | 30fps |
