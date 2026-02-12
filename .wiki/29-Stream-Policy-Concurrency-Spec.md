# 29 - User Stream Policy and Session Concurrency Model

## Objective

Specify exact counting and eviction semantics for concurrent streams.

## Policy Dimensions

- per-user concurrent stream limit
- per-family global stream limit
- per-content concurrent stream limit (optional)
- per-device constraints (optional)

## Session Counting Rules

A session is counted active when:

- playback starts and admission granted
- heartbeat is present within last 45 seconds

A session is not counted active when:

- explicit stop signal received
- heartbeat timeout exceeded
- session revoked by policy/admin action

## Eviction Rules

Default eviction order when limit exceeded:

1. oldest idle session
2. oldest paused session
3. oldest low-priority session
4. deny new session if none eligible

## Admission Workflow

1. validate auth and policy scope
2. evaluate user and family counters
3. allocate session token
4. return signed playback access
