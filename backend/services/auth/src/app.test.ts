import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { buildApp } from './app.js';
import type { FastifyInstance } from 'fastify';

// Mock pool and logger for integration-style tests
const mockPool = {
  query: vi.fn(),
} as any;

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  child: vi.fn().mockReturnThis(),
  level: 'info',
} as any;

const TEST_SECRET = 'test-jwt-secret-minimum-32-chars-required!!';

describe('Auth App', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({
      pool: mockPool,
      logger: mockLogger,
      jwtSecret: TEST_SECRET,
      accessTokenExpiry: 900,
      refreshTokenExpiry: 604800,
      isDemoMode: false,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health endpoints', () => {
    it('GET /health returns ok', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('ok');
      expect(body.service).toBe('auth');
    });

    it('GET /ready checks database', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      const res = await app.inject({ method: 'GET', url: '/ready' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('ready');
    });

    it('GET /ready returns not_ready on db error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('DB down'));
      const res = await app.inject({ method: 'GET', url: '/ready' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('not_ready');
    });
  });

  describe('POST /auth/register', () => {
    it('rejects invalid email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'not-email', password: 'password123' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects short password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'test@example.com', password: 'short' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 409 for duplicate email', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'exists' }] }); // existing check
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'existing@example.com', password: 'password123' },
      });
      expect(res.statusCode).toBe(409);
    });

    it('creates user and returns tokens', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // no existing user
        .mockResolvedValueOnce({ rows: [{ id: 'new-user', email: 'new@example.com' }] }) // insert user
        .mockResolvedValueOnce({ rows: [] }) // create session
        .mockResolvedValueOnce({ rows: [{ id: 'token-1' }] }) // store refresh token
        .mockResolvedValueOnce({ rows: [] }); // update last_login_at

      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'new@example.com', password: 'password123', display_name: 'Test' },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.user.email).toBe('new@example.com');
      expect(body.data.tokens.access_token).toBeDefined();
      expect(body.data.tokens.refresh_token).toBeDefined();
      expect(body.data.tokens.token_type).toBe('Bearer');
    });
  });

  describe('POST /auth/login', () => {
    it('rejects invalid credentials', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // user not found
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'nobody@example.com', password: 'password' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('rejects disabled accounts', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'u1', email: 'disabled@x.com', password_hash: 'hash', is_active: false }],
      });
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'disabled@x.com', password: 'password' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rejects missing refresh_token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('detects token reuse', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ family_chain: 'family-1' }] }) // reuse check
        .mockResolvedValueOnce({ rows: [] }); // revoke family
      const res = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: { refresh_token: 'reused-token' },
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('TOKEN_REUSE');
    });
  });

  describe('Protected routes require auth', () => {
    it('GET /auth/me returns 401 without token', async () => {
      const res = await app.inject({ method: 'GET', url: '/auth/me' });
      expect(res.statusCode).toBe(401);
    });

    it('POST /auth/logout returns 401 without token', async () => {
      const res = await app.inject({ method: 'POST', url: '/auth/logout' });
      expect(res.statusCode).toBe(401);
    });

    it('POST /auth/revoke returns 401 without token', async () => {
      const res = await app.inject({ method: 'POST', url: '/auth/revoke' });
      expect(res.statusCode).toBe(401);
    });
  });
});

describe('Auth App (Demo Mode)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({
      pool: mockPool,
      logger: mockLogger,
      jwtSecret: TEST_SECRET,
      accessTokenExpiry: 900,
      refreshTokenExpiry: 604800,
      isDemoMode: true,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks registration in demo mode', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'demo@example.com', password: 'password123' },
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('DEMO_MODE');
  });

  it('allows login in demo mode', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] }); // user not found (but route is allowed)
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'test@example.com', password: 'password' },
    });
    // 401 because user doesn't exist, but NOT 403 (demo mode doesn't block login)
    expect(res.statusCode).toBe(401);
  });
});
