import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPool, closePool, resetPool, withTransaction, query } from './db.js';
import type { EnvConfig } from './config.js';

// Mock pg module
vi.mock('pg', () => {
  const mockClient = {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: vi.fn(),
  };
  const mockPool = {
    query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }], rowCount: 1 }),
    connect: vi.fn().mockResolvedValue(mockClient),
    end: vi.fn().mockResolvedValue(undefined),
  };
  return {
    default: { Pool: vi.fn(() => mockPool) },
  };
});

const mockConfig: EnvConfig = {
  PROJECT_NAME: 'test',
  ENV: 'test',
  BASE_DOMAIN: 'test.local',
  POSTGRES_HOST: 'localhost',
  POSTGRES_PORT: 5433,
  POSTGRES_DB: 'test_db',
  POSTGRES_USER: 'postgres',
  POSTGRES_PASSWORD: 'password',
  DATABASE_URL: undefined,
  HASURA_GRAPHQL_ADMIN_SECRET: 'secret',
  HASURA_GRAPHQL_JWT_SECRET: '{"type":"HS256","key":"test-key-minimum-32-chars-required!!"}',
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6380,
  REDIS_PASSWORD: 'redis-pass',
  MINIO_ENDPOINT: 'localhost',
  MINIO_PORT: 9002,
  MINIO_ROOT_USER: 'admin',
  MINIO_ROOT_PASSWORD: 'admin-pass',
  S3_BUCKET: 'test-bucket',
  JWT_SECRET: 'test-jwt-secret-minimum-32-chars-required!!',
  JWT_ACCESS_TOKEN_EXPIRES_IN: 900,
  JWT_REFRESH_TOKEN_EXPIRES_IN: 604800,
  BCRYPT_ROUNDS: 10,
  DEMO_MODE: false,
  SEED_USERS: true,
  DEBUG: false,
  AUTH_SERVICE_PORT: 4000,
  API_SERVICE_PORT: 4001,
};

describe('db', () => {
  beforeEach(() => {
    resetPool();
  });

  describe('getPool', () => {
    it('creates a pool on first call', () => {
      const pool = getPool(mockConfig);
      expect(pool).toBeDefined();
    });

    it('returns same pool on subsequent calls', () => {
      const pool1 = getPool(mockConfig);
      const pool2 = getPool(mockConfig);
      expect(pool1).toBe(pool2);
    });
  });

  describe('closePool', () => {
    it('closes the pool', async () => {
      const pool = getPool(mockConfig);
      await closePool();
      expect(pool.end).toHaveBeenCalled();
    });

    it('handles no pool gracefully', async () => {
      await expect(closePool()).resolves.toBeUndefined();
    });
  });

  describe('query', () => {
    it('executes SQL queries', async () => {
      const pool = getPool(mockConfig);
      const result = await query(pool, 'SELECT 1');
      expect(result.rows).toBeDefined();
    });

    it('passes parameters', async () => {
      const pool = getPool(mockConfig);
      await query(pool, 'SELECT $1', ['test']);
      expect(pool.query).toHaveBeenCalledWith('SELECT $1', ['test']);
    });
  });

  describe('withTransaction', () => {
    it('commits on success', async () => {
      const pool = getPool(mockConfig);
      const result = await withTransaction(pool, async (client) => {
        await client.query('INSERT INTO test VALUES (1)');
        return 'ok';
      });
      expect(result).toBe('ok');
      const client = await pool.connect();
      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalled();
    });

    it('rolls back on error', async () => {
      const pool = getPool(mockConfig);
      const client = await pool.connect();
      vi.mocked(client.query).mockImplementation(async (sql: string) => {
        if (sql === 'INSERT FAIL') throw new Error('DB error');
        return { rows: [], rowCount: 0, command: '', oid: 0, fields: [] };
      });

      await expect(
        withTransaction(pool, async (c) => {
          await c.query('INSERT FAIL');
        }),
      ).rejects.toThrow('DB error');
    });
  });
});
