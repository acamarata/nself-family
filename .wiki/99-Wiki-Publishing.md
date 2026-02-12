# 99 - Wiki Publishing

## Goal

Keep `/.wiki` as public source of truth and publish to GitHub Wiki format when needed.

## Publishing Principles

1. `/.wiki` content is public-safe and human-facing.
2. Private control-plane content is never synced.
3. Keep `Home.md`, `_Sidebar.md`, and stable page names for predictable wiki navigation.

## Suggested Process

1. Validate docs structure and links.
2. Build wiki sync payload from `/.wiki` only.
3. Push to wiki repository using CI credentials when available.

## Sync Expectations

1. Preserve internal links.
2. Preserve navigation order.
3. Validate no orphan pages after sync.
4. Verify no private planning/process text appears in synced pages.

## CI Scaffolding

1. `docs-qa` workflow validates required wiki pages and link integrity.
2. `wiki-sync` workflow runs on manual dispatch and pushes docs to GitHub Wiki if credentials are configured.

## Quality Gate Before Publish

1. All links resolve.
2. TOC references valid files.
3. Home and Sidebar include newly added pages.
4. Release index and release template remain linked.
