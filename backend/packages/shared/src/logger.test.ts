import { describe, it, expect } from 'vitest';
import { createLogger } from './logger.js';
import type { EnvConfig } from './config.js';

const mockConfig = {
  PROJECT_NAME: 'test',
  ENV: 'test',
  DEBUG: false,
} as EnvConfig;

describe('logger', () => {
  it('creates a pino logger', () => {
    const logger = createLogger(mockConfig, 'test-service');
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.debug).toBeDefined();
  });

  it('sets level to debug when DEBUG is true', () => {
    const debugConfig = { ...mockConfig, DEBUG: true };
    const logger = createLogger(debugConfig, 'test-debug');
    expect(logger.level).toBe('debug');
  });

  it('sets level to info when DEBUG is false', () => {
    const logger = createLogger(mockConfig, 'test-info');
    expect(logger.level).toBe('info');
  });
});
