# 15 - System Architecture: Control Plane and Data Plane

## Objective

Define one canonical architecture reference to prevent ambiguity between orchestration/control responsibilities and user/media data movement.

## Canonical Diagram

```mermaid
flowchart LR
  subgraph CP["Control Plane"]
    C1["Admin UI"]
    C2["Backend Orchestrator"]
    C3["Scheduler Service"]
    C4["Device Registry"]
    C5["Policy Engine"]
  end

  subgraph DP["Data Plane"]
    D1["Family/Chat/TV Clients"]
    D2["API/GraphQL Gateway"]
    D3["PostgreSQL"]
    D4["Object Storage"]
    D5["CDN Edge"]
    D6["Live Ingest Origin"]
  end

  subgraph EDGE["Edge Plane"]
    E1["AntBox Daemon"]
    E2["HDHomeRun Tuners"]
    E3["Local Buffer"]
  end

  C1 --> C2
  C2 --> C3
  C2 --> C4
  C2 --> C5

  C3 --> E1
  C4 --> E1
  C5 --> D2

  E2 --> E1
  E1 --> E3
  E1 --> D6

  D1 --> D2
  D2 --> D3
  D2 --> D4
  D6 --> D4
  D4 --> D5
  D1 --> D5
```

## Responsibility Boundaries

### Control Plane

- Owns scheduling, policy decisions, enrollment, and command dispatch.
- Must never be bypassed for privileged operations.
- All control actions emit audit events.

### Data Plane

- Owns content reads/writes, playback traffic, metadata, and user interactions.
- Must enforce policy decisions from control plane.
- Must remain resilient during control-plane partial outages.

### Edge Plane

- Owns tuner interaction and capture/encode execution.
- Receives signed commands only.
- Must fail-safe and report telemetry continuously.

## Failure Isolation Rules

1. Control-plane outages must not immediately terminate already-running playback sessions.
2. Data-plane outages must not corrupt scheduler state.
3. Edge-plane outages must be isolated to affected devices/events.
