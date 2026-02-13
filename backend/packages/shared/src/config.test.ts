import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, getDatabaseUrl, getJwtSecret, resetConfig } from './config.js';

describe('config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetConfig();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetConfig();
  });

  describe('loadConfig', () => {
    it('loads default config when no env vars set', () => {
      const config = loadConfig();
      expect(config.PROJECT_NAME).toBe('nself-family');
      expect(config.ENV).toBe('dev');
      expect(config.POSTGRES_PORT).toBe(5433);
      expect(config.DEMO_MODE).toBe(false);
    });

    it('respects environment variable overrides', () => {
      process.env.PROJECT_NAME = 'test-project';
      process.env.ENV = 'test';
      process.env.POSTGRES_PORT = '5555';
      process.env.DEMO_MODE = 'true';

      const config = loadConfig();
      expect(config.PROJECT_NAME).toBe('test-project');
      expect(config.ENV).toBe('test');
      expect(config.POSTGRES_PORT).toBe(5555);
      expect(config.DEMO_MODE).toBe(true);
    });

    it('caches config after first call', () => {
      const config1 = loadConfig();
      process.env.PROJECT_NAME = 'changed';
      const config2 = loadConfig();
      expect(config1).toBe(config2);
      expect(config2.PROJECT_NAME).toBe('nself-family');
    });

    it('resets cache with resetConfig', () => {
      loadConfig();
      resetConfig();
      process.env.PROJECT_NAME = 'after-reset';
      const config = loadConfig();
      expect(config.PROJECT_NAME).toBe('after-reset');
    });
  });

  describe('getDatabaseUrl', () => {
    it('uses DATABASE_URL if set', () => {
      const config = loadConfig();
      const configWithUrl = { ...config, DATABASE_URL: 'postgresql://custom:pass@host:1234/db' };
      expect(getDatabaseUrl(configWithUrl)).toBe('postgresql://custom:pass@host:1234/db');
    });

    it('constructs URL from components when DATABASE_URL not set', () => {
      const config = loadConfig();
      const url = getDatabaseUrl(config);
      expect(url).toContain('postgresql://');
      expect(url).toContain('postgres');
      expect(url).toContain('5433');
      expect(url).toContain('nself_family_dev');
    });
  });

  describe('getJwtSecret', () => {
    it('returns the JWT secret', () => {
      const config = loadConfig();
      expect(getJwtSecret(config)).toBe(config.JWT_SECRET);
    });
  });
});
