# 24 - Commercial Detection Pipeline Spec

## Objective

Define ad-marker generation for live assist and post-process accuracy.

## Tooling

- Primary tool: Comskip (batch and near-live modes)
- Supplemental heuristics: logo-presence and silence/black-frame markers

## Modes

### Live Assist Mode

- Runs in rolling batches against growing recording.
- Marks low-confidence and high-confidence ad ranges.
- Exposes marker stream for optional skip prompt.

### Post-Process Mode

- Runs full-file analysis after event finalization.
- Produces canonical marker output used for archive edits.

## Marker Schema

```json
{
  "event_id": "uuid",
  "analysis_mode": "live|post",
  "markers": [
    {
      "start_ms": 0,
      "end_ms": 0,
      "confidence": 0.0,
      "source": "comskip|heuristic|merged"
    }
  ],
  "generated_at": "RFC3339"
}
```

## EDL Compatibility

Also emit EDL-compatible output for editing pipeline tools.

## Thresholds (Initial)

- Auto-skip eligible confidence: >= 0.90
- Prompt-only confidence band: 0.70-0.89
- Ignore below 0.70
