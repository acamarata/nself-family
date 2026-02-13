import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import type { JwtPayload } from '@nself-family/shared';

/**
 * Sign a JWT access token.
 * @param userId - User's UUID
 * @param email - User's email
 * @param sessionId - Session UUID
 * @param secret - JWT signing secret
 * @param expiresIn - Token lifetime in seconds
 * @returns Signed JWT string
 */
export function signAccessToken(
  userId: string,
  email: string,
  sessionId: string,
  secret: string,
  expiresIn: number,
): string {
  const payload = {
    sub: userId,
    email,
    session_id: sessionId,
    'https://hasura.io/jwt/claims': {
      'x-hasura-allowed-roles': ['user', 'admin', 'anonymous'],
      'x-hasura-default-role': 'user',
      'x-hasura-user-id': userId,
    },
  };

  return jwt.sign(payload, secret, {
    expiresIn,
    algorithm: 'HS256',
    jwtid: randomUUID(),
  });
}

/**
 * Verify and decode a JWT access token.
 * @param token - JWT string to verify
 * @param secret - JWT signing secret
 * @returns Decoded payload
 * @throws JsonWebTokenError if token is invalid
 */
export function verifyAccessToken(token: string, secret: string): JwtPayload {
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  return decoded as JwtPayload;
}

/**
 * Generate a cryptographically random opaque refresh token.
 * @returns Random token string (64 hex chars)
 */
export function generateRefreshToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Decode a JWT without verification (for inspecting expired tokens).
 * @param token - JWT string
 * @returns Decoded payload or null if malformed
 */
export function decodeToken(token: string): JwtPayload | null {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === 'string') return null;
  return decoded as JwtPayload;
}
