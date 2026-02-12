# 32 - Family Privacy and Mahram Rules Engine Spec

## Objective

Define policy-safe visibility controls with optional culturally aware constraints.

## Policy Modes

- `standard`: role and explicit audience lists
- `islamic_mode`: includes mahram-aware visibility constraints

## Core Permission Model

A content item access decision is based on:

1. tenant/family boundary
2. role permissions
3. explicit audience allow/deny lists
4. policy mode rules (if enabled)

## Relationship Data Requirements

- relation type
- lineage references where needed
- gender fields where policy requires
- guardian/admin overrides

## Mahram-Aware Evaluation (Optional Mode)

- Evaluate allowed viewers from relationship graph rules.
- Apply conservative deny on ambiguous relationship data.
- Require explicit admin confirmation for overrides.

## Inheritance Logic Storage

- store inheritance scenarios as versioned records
- preserve calculation input snapshot and output snapshot
- never overwrite historical scenarios in place

## Audit Requirements

- policy mode toggles
- override actions
- relationship edits affecting policy outcomes
