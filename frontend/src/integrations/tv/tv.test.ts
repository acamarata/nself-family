import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TVSessionManager } from './session-handoff';
import { generateDeepLink, parseDeepLink, isDeepLinkValid } from './deep-links';
import { mapFamilyRoleToTVEntitlements, checkEntitlement } from './entitlements';
import { emitTelemetry, getTelemetryBuffer, clearTelemetryBuffer, TelemetryEventType, translateTVError } from './telemetry';

// Mock localStorage
const storage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete storage[key]; }),
});

describe('TV integration', () => {
  beforeEach(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
    vi.clearAllMocks();
    clearTelemetryBuffer();
  });

  describe('TVSessionManager', () => {
    it('starts with no session', () => {
      const manager = new TVSessionManager();
      expect(manager.getSession()).toBeNull();
      expect(manager.isValid()).toBe(false);
    });

    it('creates a session via handoff', async () => {
      const manager = new TVSessionManager();
      const result = await manager.handoff({
        family_jwt: 'jwt-token',
        family_id: 'family-1',
        user_id: 'user-1',
      });
      expect(result.success).toBe(true);
      expect(result.session).toBeTruthy();
      expect(result.session!.family_id).toBe('family-1');
    });

    it('reports valid session', async () => {
      const manager = new TVSessionManager();
      await manager.handoff({ family_jwt: '', family_id: 'f1', user_id: 'u1' });
      expect(manager.isValid()).toBe(true);
    });

    it('ends a session', async () => {
      const manager = new TVSessionManager();
      await manager.handoff({ family_jwt: '', family_id: 'f1', user_id: 'u1' });
      manager.endSession();
      expect(manager.getSession()).toBeNull();
    });

    it('returns contract version', () => {
      const manager = new TVSessionManager();
      expect(manager.getVersion()).toBe(1);
    });
  });

  describe('deep-links', () => {
    it('generates a deep-link URL', () => {
      const link = generateDeepLink({
        action: 'watch',
        content_id: 'video-123',
        family_id: 'family-1',
        user_id: 'user-1',
        entitlements: ['can_watch', 'can_record'],
      });
      expect(link).toContain('nself-tv://handoff');
      expect(link).toContain('action=watch');
      expect(link).toContain('content_id=video-123');
      expect(link).toContain('entitlements=can_watch%2Ccan_record');
    });

    it('parses a valid deep-link', () => {
      const url = generateDeepLink({
        action: 'watch', family_id: 'f1', user_id: 'u1',
      });
      const parsed = parseDeepLink(url);
      expect(parsed).not.toBeNull();
      expect(parsed!.action).toBe('watch');
      expect(parsed!.family_id).toBe('f1');
    });

    it('returns null for invalid scheme', () => {
      expect(parseDeepLink('https://example.com')).toBeNull();
    });

    it('returns null for expired link', () => {
      const expired = 'nself-tv://handoff?action=watch&family_id=f1&user_id=u1&expires_at=2020-01-01T00:00:00Z';
      expect(parseDeepLink(expired)).toBeNull();
    });

    it('returns null for missing required params', () => {
      expect(parseDeepLink('nself-tv://handoff?action=watch')).toBeNull();
    });

    it('validates deep-link expiry', () => {
      const link = {
        scheme: 'nself-tv', action: 'watch', family_id: 'f1', user_id: 'u1',
        timestamp: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60000).toISOString(),
      };
      expect(isDeepLinkValid(link)).toBe(true);
    });
  });

  describe('entitlements', () => {
    it('maps OWNER role with full entitlements', () => {
      const claims = mapFamilyRoleToTVEntitlements('OWNER');
      expect(checkEntitlement(claims, 'can_watch')).toBe(true);
      expect(checkEntitlement(claims, 'can_record')).toBe(true);
      expect(checkEntitlement(claims, 'can_manage_devices')).toBe(true);
    });

    it('maps CHILD_MEMBER with restricted entitlements', () => {
      const claims = mapFamilyRoleToTVEntitlements('CHILD_MEMBER');
      expect(checkEntitlement(claims, 'can_watch')).toBe(true);
      expect(checkEntitlement(claims, 'can_record')).toBe(false);
      expect(checkEntitlement(claims, 'can_manage_devices')).toBe(false);
    });

    it('checks specific claim value', () => {
      const claims = mapFamilyRoleToTVEntitlements('ADULT_MEMBER');
      expect(checkEntitlement(claims, 'max_streams', '3')).toBe(true);
      expect(checkEntitlement(claims, 'max_streams', '5')).toBe(false);
    });

    it('returns base entitlements for unknown role', () => {
      const claims = mapFamilyRoleToTVEntitlements('UNKNOWN');
      expect(claims).toHaveLength(1);
      expect(claims[0].claim_type).toBe('can_watch');
    });
  });

  describe('telemetry', () => {
    it('emits telemetry events', () => {
      emitTelemetry(TelemetryEventType.SESSION_START, { content_id: 'v1' });
      const buffer = getTelemetryBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].type).toBe('tv.session.start');
    });

    it('clears telemetry buffer', () => {
      emitTelemetry(TelemetryEventType.SESSION_START);
      emitTelemetry(TelemetryEventType.SESSION_END);
      clearTelemetryBuffer();
      expect(getTelemetryBuffer()).toHaveLength(0);
    });

    it('translates known error codes', () => {
      expect(translateTVError('NOT_ENTITLED')).toContain('permission');
      expect(translateTVError('SESSION_EXPIRED')).toContain('expired');
      expect(translateTVError('PARENTAL_RESTRICTED')).toContain('parental');
    });

    it('provides fallback for unknown errors', () => {
      const msg = translateTVError('UNKNOWN_CODE');
      expect(msg).toContain('UNKNOWN_CODE');
      expect(msg).toContain('unexpected');
    });
  });
});
