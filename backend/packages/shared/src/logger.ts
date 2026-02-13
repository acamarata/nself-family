import pino from 'pino';
import { type EnvConfig } from './config.js';

/**
 * Create a structured JSON logger instance.
 * @param config - Environment configuration
 * @param service - Service name for log context
 * @returns Pino logger instance
 */
export function createLogger(config: EnvConfig, service: string): pino.Logger {
  return pino({
    name: service,
    level: config.DEBUG ? 'debug' : 'info',
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      service,
      env: config.ENV,
      project: config.PROJECT_NAME,
    },
  });
}

export type Logger = pino.Logger;
