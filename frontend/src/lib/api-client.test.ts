import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGraphQLClient, authFetch, ApiError, AUTH_URL } from './api-client';

describe('api-client', () => {
  describe('createGraphQLClient', () => {
    it('creates a client without token', () => {
      const client = createGraphQLClient();
      expect(client).toBeDefined();
    });

    it('creates a client with token', () => {
      const client = createGraphQLClient('test-token');
      expect(client).toBeDefined();
    });
  });

  describe('authFetch', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('makes a GET request', async () => {
      const mockResponse = { data: { id: '1' } };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authFetch('/test');
      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        `${AUTH_URL}/test`,
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('makes a POST request with body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'ok' }),
      });

      await authFetch('/auth/login', {
        method: 'POST',
        body: { email: 'test@test.com', password: 'pass' },
      });

      expect(fetch).toHaveBeenCalledWith(
        `${AUTH_URL}/auth/login`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@test.com', password: 'pass' }),
        }),
      );
    });

    it('includes auth header when token provided', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await authFetch('/auth/me', { token: 'my-token' });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer my-token' }),
        }),
      );
    });

    it('throws ApiError on non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: 'Unauthorized', code: 'AUTH_ERROR' } }),
      });

      await expect(authFetch('/test')).rejects.toThrow(ApiError);
      try {
        await authFetch('/test');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(401);
      }
    });
  });

  describe('ApiError', () => {
    it('stores status and code', () => {
      const err = new ApiError(404, 'Not found', 'NOT_FOUND');
      expect(err.status).toBe(404);
      expect(err.message).toBe('Not found');
      expect(err.code).toBe('NOT_FOUND');
      expect(err.name).toBe('ApiError');
    });
  });
});
