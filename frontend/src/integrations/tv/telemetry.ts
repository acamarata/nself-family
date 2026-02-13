/**
 * TV integration telemetry — event emission and error translation.
 */

export enum TelemetryEventType {
  SESSION_START = 'tv.session.start',
  SESSION_END = 'tv.session.end',
  HANDOFF_INITIATED = 'tv.handoff.initiated',
  HANDOFF_COMPLETED = 'tv.handoff.completed',
  HANDOFF_FAILED = 'tv.handoff.failed',
  PLAYBACK_STARTED = 'tv.playback.started',
  PLAYBACK_ERROR = 'tv.playback.error',
  ADMISSION_DENIED = 'tv.admission.denied',
  DEVICE_PAIRED = 'tv.device.paired',
  DEVICE_UNPAIRED = 'tv.device.unpaired',
}

export interface TelemetryEvent {
  type: TelemetryEventType;
  timestamp: string;
  family_id?: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
  latency_ms?: number;
}

const telemetryBuffer: TelemetryEvent[] = [];
const MAX_BUFFER_SIZE = 100;

/**
 * Emit a telemetry event.
 * @param type - Event type
 * @param metadata - Event metadata
 */
export function emitTelemetry(type: TelemetryEventType, metadata?: Record<string, unknown>): void {
  const event: TelemetryEvent = {
    type,
    timestamp: new Date().toISOString(),
    metadata,
  };

  telemetryBuffer.push(event);

  // Keep buffer bounded
  if (telemetryBuffer.length > MAX_BUFFER_SIZE) {
    telemetryBuffer.splice(0, telemetryBuffer.length - MAX_BUFFER_SIZE);
  }
}

/**
 * Get buffered telemetry events.
 * @returns Array of telemetry events
 */
export function getTelemetryBuffer(): TelemetryEvent[] {
  return [...telemetryBuffer];
}

/**
 * Clear the telemetry buffer.
 */
export function clearTelemetryBuffer(): void {
  telemetryBuffer.length = 0;
}

/**
 * TV error code to user-friendly message mapping.
 */
const TV_ERROR_MESSAGES: Record<string, string> = {
  'STREAM_LIMIT_USER': 'You have reached the maximum number of simultaneous streams.',
  'STREAM_LIMIT_FAMILY': 'Your family has reached the maximum number of simultaneous streams.',
  'NOT_ENTITLED': 'You do not have permission to access this content.',
  'SESSION_EXPIRED': 'Your TV session has expired. Please reconnect.',
  'DEVICE_NOT_TRUSTED': 'This device is not authorized. Please pair it first.',
  'CONTENT_UNAVAILABLE': 'This content is currently unavailable.',
  'PARENTAL_RESTRICTED': 'This content is restricted by parental controls.',
  'NETWORK_ERROR': 'Unable to connect to the TV service. Check your network.',
  'HANDOFF_TIMEOUT': 'TV session handoff timed out. Please try again.',
};

/**
 * Translate a TV error code to a user-friendly message.
 * @param errorCode - TV error code
 * @returns User-friendly error message
 */
export function translateTVError(errorCode: string): string {
  return TV_ERROR_MESSAGES[errorCode] ?? `An unexpected error occurred (${errorCode}). Please try again.`;
}
