import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@nself-family/shared';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

/**
 * Fastify preHandler that validates JWT from Authorization header.
 * @param jwtSecret - JWT signing secret
 * @returns Fastify preHandler function
 */
export function createAuthMiddleware(jwtSecret: string) {
  return async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      reply.code(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' },
      });
      return;
    }

    const token = authHeader.slice(7);

    try {
      const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
      if (typeof decoded === 'string') {
        reply.code(401).send({ error: { code: 'INVALID_TOKEN', message: 'Invalid token format' } });
        return;
      }
      request.user = decoded as JwtPayload;
    } catch {
      reply.code(401).send({
        error: { code: 'TOKEN_EXPIRED', message: 'Access token is invalid or expired' },
      });
    }
  };
}
