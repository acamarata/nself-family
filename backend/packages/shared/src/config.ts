import { z } from 'zod';

/**
 * Environment configuration schema with Zod validation.
 * All backend services load config through this module.
 */
const envSchema = z.object({
  // Core
  PROJECT_NAME: z.string().default('nself-family'),
  ENV: z.enum(['dev', 'staging', 'prod', 'test']).default('dev'),
  BASE_DOMAIN: z.string().default('local.nself.org'),

  // PostgreSQL
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().default(5433),
  POSTGRES_DB: z.string().default('nself_family_dev'),
  POSTGRES_USER: z.string().default('postgres'),
  POSTGRES_PASSWORD: z.string().default('nself_family_dev_secure_password_32chars'),
  DATABASE_URL: z.string().optional(),

  // Hasura
  HASURA_GRAPHQL_ADMIN_SECRET: z.string().default('dev-secret-change-in-production'),
  HASURA_GRAPHQL_JWT_SECRET: z.string().default('{"type":"HS256","key":"dev-jwt-secret-min-32-chars-required!!"}'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6380),
  REDIS_PASSWORD: z.string().default('nself_family_redis_dev_password'),

  // MinIO
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9002),
  MINIO_ROOT_USER: z.string().default('minioadmin'),
  MINIO_ROOT_PASSWORD: z.string().default('minioadmin_dev'),
  S3_BUCKET: z.string().default('nself-family-dev'),

  // Auth
  JWT_SECRET: z.string().default('dev-jwt-secret-min-32-chars-required!!'),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.coerce.number().default(900), // 15 minutes
  JWT_REFRESH_TOKEN_EXPIRES_IN: z.coerce.number().default(604800), // 7 days
  BCRYPT_ROUNDS: z.coerce.number().default(10),

  // Features
  DEMO_MODE: z.coerce.boolean().default(false),
  SEED_USERS: z.coerce.boolean().default(true),
  DEBUG: z.coerce.boolean().default(false),

  // Service ports
  AUTH_SERVICE_PORT: z.coerce.number().default(4000),
  API_SERVICE_PORT: z.coerce.number().default(4001),
});

export type EnvConfig = z.infer<typeof envSchema>;

let _config: EnvConfig | null = null;

/**
 * Load and validate environment configuration.
 * Caches the result after first call.
 * @returns Validated environment configuration
 */
export function loadConfig(): EnvConfig {
  if (_config) return _config;
  _config = envSchema.parse(process.env);
  return _config;
}

/**
 * Get the database connection URL.
 * Prefers DATABASE_URL env var, falls back to constructing from components.
 * @param config - Environment configuration
 * @returns PostgreSQL connection URL
 */
export function getDatabaseUrl(config: EnvConfig): string {
  if (config.DATABASE_URL) return config.DATABASE_URL;
  return `postgresql://${config.POSTGRES_USER}:${config.POSTGRES_PASSWORD}@${config.POSTGRES_HOST}:${config.POSTGRES_PORT}/${config.POSTGRES_DB}`;
}

/**
 * Extract JWT secret key from Hasura JWT secret config.
 * @param config - Environment configuration
 * @returns JWT signing key string
 */
export function getJwtSecret(config: EnvConfig): string {
  return config.JWT_SECRET;
}

/**
 * Reset cached config (for testing).
 */
export function resetConfig(): void {
  _config = null;
}
