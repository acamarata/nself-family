# mobile

Mobile wrapper for the ɳFamily web app.

Packages the shared Next.js source (`../../src/`) as a native mobile application for iOS and Android.

## Approach

- Primary: Capacitor (wraps web app with native shell)
- Fallback: React Native (if Capacitor cannot meet requirements)
- Flutter: only if absolutely necessary for specific platform features

## Decision criteria

Use Capacitor when:
- The web UI works well on mobile with responsive design
- Only basic native APIs are needed (camera, push, biometrics)

Escalate to React Native when:
- Performance-critical UI requires native rendering
- Platform-specific UX patterns can't be achieved with web views

## Native features

- Push notifications (APNs, FCM)
- Biometric auth (Face ID, fingerprint)
- Camera and photo library access
- Location services
- Share sheet integration
