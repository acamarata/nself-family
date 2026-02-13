import { describe, it, expect, vi } from 'vitest';
import { createAuthMiddleware } from './authenticate.js';
import { signAccessToken } from '../lib/jwt.js';

const TEST_SECRET = 'test-jwt-secret-minimum-32-chars-required!!';

describe('authenticate middleware', () => {
  const authenticate = createAuthMiddleware(TEST_SECRET);

  const createMockReply = () => {
    const reply: any = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
    return reply;
  };

  it('rejects missing Authorization header', async () => {
    const request: any = { headers: {} };
    const reply = createMockReply();
    await authenticate(request, reply);
    expect(reply.code).toHaveBeenCalledWith(401);
  });

  it('rejects non-Bearer header', async () => {
    const request: any = { headers: { authorization: 'Basic abc' } };
    const reply = createMockReply();
    await authenticate(request, reply);
    expect(reply.code).toHaveBeenCalledWith(401);
  });

  it('rejects invalid token', async () => {
    const request: any = { headers: { authorization: 'Bearer invalid-token' } };
    const reply = createMockReply();
    await authenticate(request, reply);
    expect(reply.code).toHaveBeenCalledWith(401);
  });

  it('accepts valid token and sets request.user', async () => {
    const token = signAccessToken('user-1', 'test@test.com', 'sess-1', TEST_SECRET, 900);
    const request: any = { headers: { authorization: `Bearer ${token}` } };
    const reply = createMockReply();
    await authenticate(request, reply);
    expect(request.user).toBeDefined();
    expect(request.user.sub).toBe('user-1');
    expect(request.user.email).toBe('test@test.com');
  });
});
