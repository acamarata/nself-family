# display-ui

Smart display UI components for 7-10" touchscreens with voice integration.

## Design Constraints

- **Small screen** — 7" (Nest Hub) to 10" (Nest Hub Max, Echo Show 10)
- **Touch-first** — large touch targets (minimum 44×44pt)
- **Voice-aware** — show voice feedback, support voice commands
- **Glanceable** — information must be scannable at a glance
- **Ambient mode** — seamless transition to photo frame when idle

## Components

### DisplayCard
Compact card optimized for small touchscreens.

```typescript
<DisplayCard
  image="/photo.jpg"
  title="Family Photos"
  subtitle="124 photos"
  onTap={openPhotos}
/>
```

### DisplayButton
Large touch target with clear visual feedback.

```typescript
<DisplayButton onTap={handleTap}>
  Show Calendar
</DisplayButton>
```

### VoiceIndicator
Shows when device is listening for voice commands.

```typescript
<VoiceIndicator
  listening={isListening}
  command={recognizedCommand}
/>
```

### AmbientDisplay
Photo frame mode with Ken Burns effect and metadata overlay.

```typescript
<AmbientDisplay
  photos={familyPhotos}
  interval={10000}  // 10 seconds per photo
  showMetadata={true}
/>
```

## Voice Integration

Use `useVoiceCommands` hook:

```typescript
import { useVoiceCommands } from '@/variants/shared/useVoiceCommands'

const { listening, command } = useVoiceCommands({
  onCommand: (cmd) => {
    if (cmd === 'show family photos') {
      navigate('/photos')
    }
  }
})
```

## Ambient Mode

Smart displays should automatically enter ambient mode (photo frame) after 60 seconds of inactivity:

```typescript
import { useIdleTimer } from '@/variants/shared/useIdleTimer'

const { isIdle } = useIdleTimer({ timeout: 60_000 })

return isIdle ? <AmbientDisplay /> : <MainContent />
```

## Platform-Specific Notes

### Google Nest Hub
- 7" (1024×600) or 10" (1280×800) display
- Voice: "Hey Google, show family photos"
- Built-in photo frame feature

### Amazon Echo Show
- 5" to 15" displays
- Voice: "Alexa, show family updates"
- Drop-in feature for instant video calls

### Meta Portal
- 10" or 14" display
- Smart camera follows person during calls
- Messenger integration
