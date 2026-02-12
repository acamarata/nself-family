# tv-ui

TV-optimized UI components for 10-foot viewing and d-pad/remote navigation.

## Design Constraints

- **10-foot viewing distance** — text must be large (2.5-4x normal size)
- **D-pad navigation** — focus management is critical
- **High contrast** — many TVs have poor color accuracy
- **Limited input** — no hover, no right-click, no keyboard shortcuts
- **Safe zones** — content must stay within TV-safe area (90% of screen)

## Components

### TVButton
Large, focusable button with prominent focus ring.

```typescript
<TVButton onFocus={handleFocus} onSelect={handleSelect}>
  Watch Photos
</TVButton>
```

### TVGrid
Grid layout optimized for d-pad navigation (4-direction movement).

```typescript
<TVGrid cols={3} focusable>
  <TVCard>Photos</TVCard>
  <TVCard>Trips</TVCard>
  <TVCard>Recipes</TVCard>
</TVGrid>
```

### TVCard
Content card with large imagery and readable text.

```typescript
<TVCard
  image="/photo.jpg"
  title="Summer Trip 2025"
  subtitle="24 photos"
  onSelect={openTrip}
/>
```

## Focus Management

Use `useTVFocus` hook for managing focus state:

```typescript
import { useTVFocus } from '@/variants/shared/useFocusManagement'

const { focusedId, setFocus } = useTVFocus({
  initialFocusId: 'first-item',
  onDirectionKey: (direction) => {
    // Handle up/down/left/right
  }
})
```

## Accessibility

- All interactive elements must be focusable
- Focus order must be logical (left-to-right, top-to-bottom)
- Selected state must be visually distinct from focused state
- Audio feedback on navigation (via platform audio APIs)

## Testing

Test with actual TV remote or d-pad emulator. Keyboard arrow keys are acceptable for development but don't capture the full experience.
