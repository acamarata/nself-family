import { describe, it, expect } from 'vitest';
import { createAuthServer, ErrorResponseSchema } from './index.js';

describe('Auth Service', () => {
  describe('createAuthServer', () => {
    it('should create a Fastify server instance', async () => {
      const server = createAuthServer();
      expect(server).toBeDefined();
      expect(typeof server.listen).toBe('function');
      await server.ready();
      await server.close();
    });

    it('should respond with 501 on POST /auth/register', async () => {
      const server = createAuthServer();
      const response = await server.inject({
        method: 'POST',
        url: '/auth/register',
      });

      expect(response.statusCode).toBe(501);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('NOT_IMPLEMENTED');
      expect(body.message).toContain('Registration');
    });

    it('should respond with 501 on POST /auth/login', async () => {
      const server = createAuthServer();
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
      });

      expect(response.statusCode).toBe(501);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('NOT_IMPLEMENTED');
      expect(body.message).toContain('Login');
    });

    it('should respond with 501 on POST /auth/refresh', async () => {
      const server = createAuthServer();
      const response = await server.inject({
        method: 'POST',
        url: '/auth/refresh',
      });

      expect(response.statusCode).toBe(501);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('NOT_IMPLEMENTED');
      expect(body.message).toContain('refresh');
    });

    it('should respond with 501 on POST /auth/revoke', async () => {
      const server = createAuthServer();
      const response = await server.inject({
        method: 'POST',
        url: '/auth/revoke',
      });

      expect(response.statusCode).toBe(501);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('NOT_IMPLEMENTED');
      expect(body.message).toContain('revocation');
    });

    it('should respond with 501 on POST /auth/logout', async () => {
      const server = createAuthServer();
      const response = await server.inject({
        method: 'POST',
        url: '/auth/logout',
      });

      expect(response.statusCode).toBe(501);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('NOT_IMPLEMENTED');
      expect(body.message).toContain('Logout');
    });
  });

  describe('ErrorResponseSchema', () => {
    it('should validate a valid error response', () => {
      const validError = {
        code: 'TEST_ERROR',
        message: 'Test error message',
      };
      const result = ErrorResponseSchema.safeParse(validError);
      expect(result.success).toBe(true);
    });

    it('should validate error response with details', () => {
      const validError = {
        code: 'TEST_ERROR',
        message: 'Test error message',
        details: { field: 'value' },
      };
      const result = ErrorResponseSchema.safeParse(validError);
      expect(result.success).toBe(true);
    });

    it('should reject invalid error response', () => {
      const invalidError = {
        code: 123, // should be string
        message: 'Test error message',
      };
      const result = ErrorResponseSchema.safeParse(invalidError);
      expect(result.success).toBe(false);
    });
  });
});
