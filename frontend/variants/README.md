# variants

Platform-specific UI component variants that adapt the shared `src/` components for different form factors and interaction models.

## Purpose

While `src/` contains the core components (Button, Card, Modal, etc.), `variants/` contains platform-optimized versions that adapt for:
- **TV** — 10-foot UI with d-pad navigation
- **Smart Displays** — Compact layouts for 7-10" touchscreens with voice integration
- **Shared** — Utilities and hooks used across variants

## Structure

```
variants/
├── tv-ui/              # TV-optimized components (10-foot UI)
│   ├── TVButton.tsx
│   ├── TVGrid.tsx
│   ├── TVCard.tsx
│   └── index.ts
├── display-ui/         # Smart display components (compact, voice-aware)
│   ├── DisplayCard.tsx
│   ├── DisplayButton.tsx
│   ├── VoiceIndicator.tsx
│   └── index.ts
└── shared/             # Shared variant utilities
    ├── useFocusManagement.ts
    ├── useVoiceCommands.ts
    └── index.ts
```

## Usage

### In Platform Code

```typescript
// platforms/tv/android/App.tsx
import { TVButton, TVGrid } from '@/variants/tv-ui'

export default function TVApp() {
  return (
    <TVGrid>
      <TVButton onFocus={handleFocus}>Photos</TVButton>
      <TVButton onFocus={handleFocus}>Trips</TVButton>
    </TVGrid>
  )
}
```

### In Smart Display Code

```typescript
// platforms/smart-display/google-nest/App.tsx
import { DisplayCard, VoiceIndicator } from '@/variants/display-ui'

export default function NestApp() {
  return (
    <>
      <VoiceIndicator listening={isListening} />
      <DisplayCard title="Family Photos" onTap={openPhotos} />
    </>
  )
}
```

## Design Principles

1. **Variants extend, not replace** — Use composition to add platform-specific behavior
2. **Accessibility first** — All variants must be keyboard/voice/screen-reader accessible
3. **Performance** — Variants should be as lightweight as their base components
4. **Consistency** — Similar visual language across platforms, adapted for context

## When to Create a Variant

Create a variant when:
- Platform interaction model is fundamentally different (d-pad vs touch vs voice)
- Layout constraints differ significantly (10-foot vs 7-inch)
- Performance requirements mandate different implementation

Don't create a variant for:
- Minor styling differences (use props or theme instead)
- Single-use components (keep in platform directory)
