import { createHash } from 'node:crypto';
import type { Pool } from '@nself-family/shared';

export interface UploadedFile {
  filename: string;
  mimetype: string;
  data: Buffer;
}

export interface MediaUploadResult {
  media_item_id: string;
  storage_path: string;
  checksum: string;
}

/**
 * Build the standard storage path for a media item.
 * Convention: /{env}/{family_id}/family/{content_type}/{content_id}/{artifact_type}/
 * @param env - Environment name
 * @param familyId - Family UUID
 * @param mediaId - Media item UUID
 * @param filename - Original filename
 * @returns Storage path string
 */
export function buildStoragePath(env: string, familyId: string, mediaId: string, filename: string): string {
  return `${env}/${familyId}/family/media/${mediaId}/${filename}`;
}

/**
 * Compute SHA-256 checksum of file data.
 * @param data - File buffer
 * @returns Hex-encoded SHA-256 hash
 */
export function computeChecksum(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Detect basic media dimensions from MIME type.
 * For images, returns approximate dimensions. Full extraction requires sharp.
 * @param mimetype - MIME type string
 * @returns Object indicating if it's an image or video
 */
export function classifyMedia(mimetype: string): { isImage: boolean; isVideo: boolean } {
  return {
    isImage: mimetype.startsWith('image/'),
    isVideo: mimetype.startsWith('video/'),
  };
}

/**
 * Create a media_items record in the database.
 * @param pool - Database pool
 * @param input - Media item input data
 * @returns Created media item ID
 */
export async function createMediaItem(
  pool: Pool,
  input: {
    family_id: string;
    uploaded_by: string;
    file_name: string;
    mime_type: string;
    file_size: number;
    storage_path: string;
    checksum_sha256: string;
    width?: number | null;
    height?: number | null;
    duration_ms?: number | null;
    metadata?: Record<string, unknown>;
  },
): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO public.media_items
       (family_id, uploaded_by, file_name, mime_type, file_size, storage_path, checksum_sha256,
        width, height, duration_ms, metadata, processing_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
     RETURNING id`,
    [
      input.family_id,
      input.uploaded_by,
      input.file_name,
      input.mime_type,
      input.file_size,
      input.storage_path,
      input.checksum_sha256,
      input.width ?? null,
      input.height ?? null,
      input.duration_ms ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
  return result.rows[0].id;
}

/**
 * Create a media_variants record (thumbnail, resized, etc.).
 * @param pool - Database pool
 * @param input - Variant input data
 * @returns Created variant ID
 */
export async function createMediaVariant(
  pool: Pool,
  input: {
    media_item_id: string;
    variant_type: string;
    storage_path: string;
    mime_type: string;
    file_size: number;
    width?: number | null;
    height?: number | null;
  },
): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO public.media_variants
       (media_item_id, variant_type, storage_path, mime_type, file_size, width, height)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      input.media_item_id,
      input.variant_type,
      input.storage_path,
      input.mime_type,
      input.file_size,
      input.width ?? null,
      input.height ?? null,
    ],
  );
  return result.rows[0].id;
}

/**
 * Update the processing status of a media item.
 * @param pool - Database pool
 * @param mediaItemId - Media item UUID
 * @param status - New status
 */
export async function updateMediaStatus(
  pool: Pool,
  mediaItemId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
): Promise<void> {
  await pool.query(
    "UPDATE public.media_items SET processing_status = $1::public.processing_status WHERE id = $2",
    [status, mediaItemId],
  );
}

/**
 * Check if a media item with the same checksum already exists (idempotency).
 * @param pool - Database pool
 * @param familyId - Family UUID
 * @param checksum - SHA-256 checksum
 * @returns Existing media item ID or null
 */
export async function findByChecksum(
  pool: Pool,
  familyId: string,
  checksum: string,
): Promise<string | null> {
  const result = await pool.query<{ id: string }>(
    `SELECT id FROM public.media_items
     WHERE family_id = $1 AND checksum_sha256 = $2 AND is_deleted = false
     LIMIT 1`,
    [familyId, checksum],
  );
  return result.rows[0]?.id ?? null;
}
