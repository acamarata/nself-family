/**
 * TV integration module — session handoff, deep-links, entitlements, telemetry.
 * Shell-side contracts for communication with nself-tv.
 */

export { TVSessionManager } from './session-handoff';
export { generateDeepLink, parseDeepLink } from './deep-links';
export { mapFamilyRoleToTVEntitlements, checkEntitlement } from './entitlements';
export { emitTelemetry, TelemetryEventType } from './telemetry';
export { useTVSession, useTVAdmission } from './hooks';
