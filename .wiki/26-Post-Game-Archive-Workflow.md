# 26 - Post-Game Archive Workflow

## Objective

Define immutable order of operations from live event completion to final library availability.

## Canonical Order

1. Finalize raw recording artifact.
2. Run post-process ad detection.
3. Produce cut timeline (ads removed or marker-only variant).
4. Encode archive renditions.
5. Generate subtitles/trickplay assets.
6. Upload all artifacts to object storage.
7. Commit DB metadata transaction.
8. Publish availability event to clients.

## Transaction Rules

- DB publish state must remain `processing` until upload succeeds.
- Never expose partial media sets as `ready`.
- On failure, preserve retryable workflow state.

## Idempotency

- Event archive pipeline keyed by `event_id` + `pipeline_version`.
- Re-runs must not duplicate media entries.
