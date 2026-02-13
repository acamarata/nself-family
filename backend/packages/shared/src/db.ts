import pg from 'pg';
import { type EnvConfig, getDatabaseUrl } from './config.js';

const { Pool } = pg;
export type { Pool, PoolClient } from 'pg';

let _pool: pg.Pool | null = null;

/**
 * Get or create the PostgreSQL connection pool.
 * @param config - Environment configuration
 * @returns PostgreSQL Pool instance
 */
export function getPool(config: EnvConfig): pg.Pool {
  if (_pool) return _pool;
  _pool = new Pool({
    connectionString: getDatabaseUrl(config),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  return _pool;
}

/**
 * Close the connection pool. Call during graceful shutdown.
 */
export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

/**
 * Execute a query against the database.
 * @param pool - PostgreSQL Pool instance
 * @param text - SQL query text
 * @param params - Query parameters
 * @returns Query result
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  pool: pg.Pool,
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

/**
 * Execute a function within a database transaction.
 * Automatically commits on success, rolls back on error.
 * @param pool - PostgreSQL Pool instance
 * @param fn - Async function to execute within the transaction
 * @returns Result of the transaction function
 */
export async function withTransaction<T>(
  pool: pg.Pool,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Reset pool reference (for testing).
 */
export function resetPool(): void {
  _pool = null;
}
