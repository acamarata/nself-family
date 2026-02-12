# desktop

Tauri wrapper for the ɳFamily web app.

Packages the shared Next.js source (`../../src/`) as a native desktop application for macOS, Windows, and Linux.

## Approach

- Tauri v2 (Rust-based, lightweight)
- Wraps the same web UI — no separate desktop codebase
- Native bridges for OS-level features (file system, notifications, system tray)
- Auto-update support via Tauri updater

## When to use native bridges

Only when a web API is insufficient:
- File system access beyond browser sandbox
- System tray and native notifications
- OS-level keyboard shortcuts
- Hardware access (camera, mic permissions)
