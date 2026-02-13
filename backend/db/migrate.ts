/**
 * Database migration runner.
 * Reads SQL migration files from db/migrations/ and executes them in order.
 * Tracks applied migrations in a _migrations table.
 *
 * Usage:
 *   npx tsx db/migrate.ts up      # Apply all pending migrations
 *   npx tsx db/migrate.ts down     # Rollback last migration
 *   npx tsx db/migrate.ts seed     # Run seed files
 *   npx tsx db/migrate.ts reset    # Rollback all + re-apply all + seed
 *   npx tsx db/migrate.ts status   # Show migration status
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import pg from 'pg';

const { Pool } = pg;

const MIGRATIONS_DIR = join(import.meta.dirname ?? '.', 'migrations');
const SEEDS_DIR = join(import.meta.dirname ?? '.', 'seed');

/**
 * Build database URL from environment variables.
 * @returns PostgreSQL connection URL
 */
function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.POSTGRES_HOST ?? 'localhost';
  const port = process.env.POSTGRES_PORT ?? '5433';
  const db = process.env.POSTGRES_DB ?? 'nself_family_dev';
  const user = process.env.POSTGRES_USER ?? 'postgres';
  const password = process.env.POSTGRES_PASSWORD ?? 'nself_family_dev_secure_password_32chars';
  return `postgresql://${user}:${password}@${host}:${port}/${db}`;
}

/**
 * Ensure the _migrations tracking table exists.
 * @param pool - PostgreSQL Pool
 */
async function ensureMigrationsTable(pool: pg.Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public._migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

/**
 * Get list of already-applied migrations.
 * @param pool - PostgreSQL Pool
 * @returns Array of applied migration names
 */
async function getAppliedMigrations(pool: pg.Pool): Promise<string[]> {
  const result = await pool.query<{ name: string }>(
    'SELECT name FROM public._migrations ORDER BY id ASC',
  );
  return result.rows.map((r) => r.name);
}

/**
 * Get sorted list of migration files from the migrations directory.
 * @param direction - 'up' or 'down'
 * @returns Sorted array of { name, path } objects
 */
async function getMigrationFiles(
  direction: 'up' | 'down',
): Promise<Array<{ name: string; path: string }>> {
  const files = await readdir(MIGRATIONS_DIR);
  const suffix = `.${direction}.sql`;
  return files
    .filter((f) => f.endsWith(suffix))
    .sort()
    .map((f) => ({
      name: f.replace(suffix, ''),
      path: join(MIGRATIONS_DIR, f),
    }));
}

/**
 * Get sorted list of seed files.
 * @returns Sorted array of file paths
 */
async function getSeedFiles(): Promise<string[]> {
  const files = await readdir(SEEDS_DIR);
  return files
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => join(SEEDS_DIR, f));
}

/**
 * Apply all pending up-migrations.
 * @param pool - PostgreSQL Pool
 */
async function migrateUp(pool: pg.Pool): Promise<void> {
  await ensureMigrationsTable(pool);
  const applied = await getAppliedMigrations(pool);
  const migrations = await getMigrationFiles('up');
  const pending = migrations.filter((m) => !applied.includes(m.name));

  if (pending.length === 0) {
    console.log('No pending migrations.');
    return;
  }

  for (const migration of pending) {
    const sql = await readFile(migration.path, 'utf-8');
    console.log(`Applying: ${migration.name}`);
    await pool.query(sql);
    await pool.query('INSERT INTO public._migrations (name) VALUES ($1)', [migration.name]);
    console.log(`  Applied: ${migration.name}`);
  }

  console.log(`${pending.length} migration(s) applied.`);
}

/**
 * Rollback the last applied migration.
 * @param pool - PostgreSQL Pool
 */
async function migrateDown(pool: pg.Pool): Promise<void> {
  await ensureMigrationsTable(pool);
  const applied = await getAppliedMigrations(pool);

  if (applied.length === 0) {
    console.log('No migrations to rollback.');
    return;
  }

  const lastName = applied[applied.length - 1];
  const downFiles = await getMigrationFiles('down');
  const downFile = downFiles.find((f) => f.name === lastName);

  if (!downFile) {
    console.error(`No down migration found for: ${lastName}`);
    process.exit(1);
  }

  const sql = await readFile(downFile.path, 'utf-8');
  console.log(`Rolling back: ${lastName}`);
  await pool.query(sql);
  await pool.query('DELETE FROM public._migrations WHERE name = $1', [lastName]);
  console.log(`  Rolled back: ${lastName}`);
}

/**
 * Run all seed files.
 * @param pool - PostgreSQL Pool
 */
async function seed(pool: pg.Pool): Promise<void> {
  const seedFiles = await getSeedFiles();

  if (seedFiles.length === 0) {
    console.log('No seed files found.');
    return;
  }

  for (const file of seedFiles) {
    const sql = await readFile(file, 'utf-8');
    console.log(`Seeding: ${basename(file)}`);
    await pool.query(sql);
  }

  console.log(`${seedFiles.length} seed file(s) executed.`);
}

/**
 * Show migration status.
 * @param pool - PostgreSQL Pool
 */
async function status(pool: pg.Pool): Promise<void> {
  await ensureMigrationsTable(pool);
  const applied = await getAppliedMigrations(pool);
  const migrations = await getMigrationFiles('up');

  console.log('Migration Status:');
  for (const m of migrations) {
    const isApplied = applied.includes(m.name);
    console.log(`  ${isApplied ? '[x]' : '[ ]'} ${m.name}`);
  }
  console.log(`\n${applied.length}/${migrations.length} applied.`);
}

/**
 * Reset: rollback all, re-apply all, then seed.
 * @param pool - PostgreSQL Pool
 */
async function reset(pool: pg.Pool): Promise<void> {
  await ensureMigrationsTable(pool);
  const applied = await getAppliedMigrations(pool);

  // Rollback all in reverse order
  for (let i = applied.length - 1; i >= 0; i--) {
    const name = applied[i];
    const downFiles = await getMigrationFiles('down');
    const downFile = downFiles.find((f) => f.name === name);
    if (downFile) {
      const sql = await readFile(downFile.path, 'utf-8');
      console.log(`Rolling back: ${name}`);
      await pool.query(sql);
      await pool.query('DELETE FROM public._migrations WHERE name = $1', [name]);
    }
  }

  // Re-apply all
  await migrateUp(pool);

  // Seed
  await seed(pool);
}

// Main
const command = process.argv[2];
if (!command || !['up', 'down', 'seed', 'reset', 'status'].includes(command)) {
  console.log('Usage: npx tsx db/migrate.ts <up|down|seed|reset|status>');
  process.exit(1);
}

const pool = new Pool({ connectionString: getDatabaseUrl() });

try {
  switch (command) {
    case 'up':
      await migrateUp(pool);
      break;
    case 'down':
      await migrateDown(pool);
      break;
    case 'seed':
      await seed(pool);
      break;
    case 'reset':
      await reset(pool);
      break;
    case 'status':
      await status(pool);
      break;
  }
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  await pool.end();
}
