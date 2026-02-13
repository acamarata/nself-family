import type { FastifyInstance } from 'fastify';
import type { Pool, JwtPayload } from '@nself-family/shared';
import {
  buildStoragePath,
  computeChecksum,
  createMediaItem,
  findByChecksum,
  updateMediaStatus,
} from '../lib/media.js';
import { writeAuditEvent } from '../lib/audit.js';

/**
 * Media upload route. Accepts multipart file upload.
 * POST /api/media/upload
 * @param app - Fastify instance
 * @param pool - Database pool
 * @param env - Environment name
 */
export function uploadRoute(app: FastifyInstance, pool: Pool, env: string): void {
  app.post('/api/media/upload', async (request, reply) => {
    const user = request.user as JwtPayload;
    if (!user) {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const familyId = (request.headers['x-family-id'] as string) || null;
    if (!familyId) {
      return reply.code(400).send({
        error: { code: 'MISSING_FAMILY', message: 'X-Family-Id header is required' },
      });
    }

    // Verify user is a member of this family
    const memberCheck = await pool.query(
      `SELECT id FROM public.family_members
       WHERE family_id = $1 AND user_id = $2 AND lifecycle_state = 'active'`,
      [familyId, user.sub],
    );

    if (memberCheck.rows.length === 0) {
      return reply.code(403).send({
        error: { code: 'NOT_A_MEMBER', message: 'You are not a member of this family' },
      });
    }

    const data = await request.file();
    if (!data) {
      return reply.code(400).send({
        error: { code: 'NO_FILE', message: 'No file uploaded' },
      });
    }

    const buffer = await data.toBuffer();
    const checksum = computeChecksum(buffer);

    // Idempotency: check if file with same checksum already exists
    const existingId = await findByChecksum(pool, familyId, checksum);
    if (existingId) {
      return reply.code(200).send({
        data: { media_item_id: existingId, status: 'already_exists' },
      });
    }

    // Create media item record
    const mediaId = crypto.randomUUID();
    const storagePath = buildStoragePath(env, familyId, mediaId, data.filename);

    const mediaItemId = await createMediaItem(pool, {
      family_id: familyId,
      uploaded_by: user.sub,
      file_name: data.filename,
      mime_type: data.mimetype,
      file_size: buffer.length,
      storage_path: storagePath,
      checksum_sha256: checksum,
    });

    // TODO: Actually upload to MinIO/S3 (requires minio client)
    // For now, mark as completed
    await updateMediaStatus(pool, mediaItemId, 'completed');

    // Audit event
    await writeAuditEvent(pool, {
      family_id: familyId,
      event_type: 'media.uploaded',
      actor_id: user.sub,
      subject_id: mediaItemId,
      subject_type: 'media_item',
      new_state: { file_name: data.filename, mime_type: data.mimetype, file_size: buffer.length },
      ip_address: request.ip || null,
      user_agent: request.headers['user-agent'] || null,
    });

    return reply.code(201).send({
      data: {
        media_item_id: mediaItemId,
        storage_path: storagePath,
        checksum: checksum,
        status: 'completed',
      },
    });
  });
}
