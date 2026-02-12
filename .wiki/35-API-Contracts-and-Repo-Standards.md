# 35 - API Contract Documentation and Repo Standardization

## Objective

Eliminate contract drift and folder-level ambiguity.

## API Domains

- auth and session APIs
- family content APIs
- chat messaging APIs
- tv catalog/playback APIs
- antbox/antserver control APIs

## Contract Documentation Template

Each endpoint or GraphQL operation must define:

- purpose
- input schema
- output schema
- auth scope
- rate limits
- error codes
- idempotency behavior

## Repo Standards

- top-level app isolation preserved
- shared contracts versioned and centrally referenced
- all generated artifacts excluded or explicitly managed
- all runtime configs templated by environment
