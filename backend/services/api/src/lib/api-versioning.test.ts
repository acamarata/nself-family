import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  API_VERSIONS,
  CURRENT_API_VERSION,
  getVersions,
  resolveVersion,
  isDeprecated,
  isValidVersion,
  wrapResponse,
  generateEndpointCatalog,
  generateSDKTypes,
} from './api-versioning.js';

describe('api-versioning', () => {
  describe('API_VERSIONS', () => {
    it('includes v1 and v2', () => {
      expect(API_VERSIONS).toContain('v1');
      expect(API_VERSIONS).toContain('v2');
    });

    it('has v1 as current version', () => {
      expect(CURRENT_API_VERSION).toBe('v1');
    });
  });

  describe('getVersions', () => {
    it('returns metadata for all versions', () => {
      const versions = getVersions();
      expect(versions).toHaveLength(API_VERSIONS.length);
    });

    it('marks current version correctly', () => {
      const versions = getVersions();
      const current = versions.find((v) => v.version === CURRENT_API_VERSION);
      expect(current?.status).toBe('current');
    });

    it('does not include sunset_date for non-deprecated versions', () => {
      const versions = getVersions();
      const nonDeprecated = versions.filter((v) => v.status !== 'deprecated');
      nonDeprecated.forEach((v) => {
        expect(v.sunset_date).toBeUndefined();
      });
    });
  });

  describe('resolveVersion', () => {
    it('extracts version from URL path', () => {
      const request = { url: '/v1/users', headers: {} } as any;
      expect(resolveVersion(request)).toBe('v1');
    });

    it('extracts v2 from URL path', () => {
      const request = { url: '/v2/users', headers: {} } as any;
      expect(resolveVersion(request)).toBe('v2');
    });

    it('extracts version from Accept header', () => {
      const request = { url: '/users', headers: { accept: 'application/vnd.nself.v1+json' } } as any;
      expect(resolveVersion(request)).toBe('v1');
    });

    it('extracts version from X-API-Version header', () => {
      const request = { url: '/users', headers: { 'x-api-version': 'v2' } } as any;
      expect(resolveVersion(request)).toBe('v2');
    });

    it('defaults to current version when no version specified', () => {
      const request = { url: '/users', headers: {} } as any;
      expect(resolveVersion(request)).toBe(CURRENT_API_VERSION);
    });

    it('ignores invalid version in path', () => {
      const request = { url: '/v99/users', headers: {} } as any;
      expect(resolveVersion(request)).toBe(CURRENT_API_VERSION);
    });

    it('prefers URL path over header', () => {
      const request = { url: '/v1/users', headers: { 'x-api-version': 'v2' } } as any;
      expect(resolveVersion(request)).toBe('v1');
    });
  });

  describe('isDeprecated', () => {
    it('returns false for current version', () => {
      expect(isDeprecated('v1')).toBe(false);
    });

    it('returns false for supported version', () => {
      expect(isDeprecated('v2')).toBe(false);
    });
  });

  describe('isValidVersion', () => {
    it('validates known versions', () => {
      expect(isValidVersion('v1')).toBe(true);
      expect(isValidVersion('v2')).toBe(true);
    });

    it('rejects unknown versions', () => {
      expect(isValidVersion('v99')).toBe(false);
      expect(isValidVersion('')).toBe(false);
      expect(isValidVersion('invalid')).toBe(false);
    });
  });

  describe('wrapResponse', () => {
    it('wraps data with version metadata', () => {
      const data = { id: '1', name: 'Test' };
      const result = wrapResponse('v1', data);
      expect(result.api_version).toBe('v1');
      expect(result.data).toEqual(data);
    });

    it('does not add deprecated flag for current version', () => {
      const result = wrapResponse('v1', {});
      expect(result.deprecated).toBeUndefined();
    });

    it('handles null data', () => {
      const result = wrapResponse('v1', null);
      expect(result.data).toBeNull();
    });

    it('handles array data', () => {
      const result = wrapResponse('v1', [1, 2, 3]);
      expect(result.data).toEqual([1, 2, 3]);
    });
  });

  describe('generateEndpointCatalog', () => {
    it('returns endpoints grouped by version', () => {
      const catalog = generateEndpointCatalog();
      expect(catalog.v1).toBeDefined();
      expect(catalog.v2).toBeDefined();
    });

    it('includes auth endpoints in v1', () => {
      const catalog = generateEndpointCatalog();
      const paths = catalog.v1.map((e) => e.path);
      expect(paths).toContain('/auth/register');
      expect(paths).toContain('/auth/login');
      expect(paths).toContain('/auth/refresh');
      expect(paths).toContain('/auth/revoke');
    });

    it('includes health endpoints', () => {
      const catalog = generateEndpointCatalog();
      const paths = catalog.v1.map((e) => e.path);
      expect(paths).toContain('/health');
      expect(paths).toContain('/ready');
    });

    it('v2 has at least as many endpoints as v1', () => {
      const catalog = generateEndpointCatalog();
      expect(catalog.v2.length).toBeGreaterThanOrEqual(catalog.v1.length);
    });

    it('all endpoints have method, path, description', () => {
      const catalog = generateEndpointCatalog();
      for (const endpoints of Object.values(catalog)) {
        endpoints.forEach((endpoint) => {
          expect(endpoint.method).toBeTruthy();
          expect(endpoint.path).toBeTruthy();
          expect(endpoint.description).toBeTruthy();
        });
      }
    });
  });

  describe('generateSDKTypes', () => {
    it('generates TypeScript type definitions', () => {
      const types = generateSDKTypes();
      expect(types).toContain('export interface V1Client');
      expect(types).toContain('export interface V2Client');
    });

    it('includes auto-generated header', () => {
      const types = generateSDKTypes();
      expect(types).toContain('Auto-generated');
      expect(types).toContain('Do not edit manually');
    });

    it('includes method definitions', () => {
      const types = generateSDKTypes();
      expect(types).toContain('post_auth_register');
      expect(types).toContain('post_auth_login');
      expect(types).toContain('get_health');
    });

    it('includes JSDoc descriptions', () => {
      const types = generateSDKTypes();
      expect(types).toContain('/** Register a new user */');
      expect(types).toContain('/** Service health check */');
    });
  });
});
