# 12 - White-Label Guide

## White-Label Goals

Enable any family to deploy this stack with minimal code changes.

## Configuration Dimensions

- branding (name, logos, palette)
- domain and subdomain mapping
- role defaults and policy templates
- feature toggles by family preference
- localization and timezone defaults

## Tenant Bootstrap Inputs

- family display name
- primary admin account details
- desired domain/subdomain map
- preferred policy mode (standard or culturally constrained)
- storage and retention profile

## White-Label Safety Principles

- no hardcoded family identifiers
- no hardcoded domains
- no environment-specific assumptions in app logic
- all sensitive defaults must be explicit and reviewable

## Packaging Recommendation

Define a repeatable setup bundle:

- environment variable templates
- bootstrap SQL and seeds
- deployment templates (VPS + web)
- post-deploy validation checklist
