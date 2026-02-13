import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildStoragePath, computeChecksum, classifyMedia, createMediaItem, createMediaVariant, updateMediaStatus, findByChecksum } from './media.js';

const mockPool = {
  query: vi.fn().mockResolvedValue({ rows: [{ id: 'media-1' }], rowCount: 1 }),
} as any;

describe('media', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildStoragePath', () => {
    it('builds correct path format', () => {
      const path = buildStoragePath('dev', 'family-1', 'media-1', 'photo.jpg');
      expect(path).toBe('dev/family-1/family/media/media-1/photo.jpg');
    });
  });

  describe('computeChecksum', () => {
    it('produces consistent SHA-256', () => {
      const data = Buffer.from('test data');
      const hash1 = computeChecksum(data);
      const hash2 = computeChecksum(data);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('differs for different data', () => {
      const hash1 = computeChecksum(Buffer.from('data-1'));
      const hash2 = computeChecksum(Buffer.from('data-2'));
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('classifyMedia', () => {
    it('identifies images', () => {
      expect(classifyMedia('image/jpeg')).toEqual({ isImage: true, isVideo: false });
      expect(classifyMedia('image/png')).toEqual({ isImage: true, isVideo: false });
    });

    it('identifies videos', () => {
      expect(classifyMedia('video/mp4')).toEqual({ isImage: false, isVideo: true });
    });

    it('handles other types', () => {
      expect(classifyMedia('application/pdf')).toEqual({ isImage: false, isVideo: false });
    });
  });

  describe('createMediaItem', () => {
    it('inserts a media item', async () => {
      const id = await createMediaItem(mockPool, {
        family_id: 'f1',
        uploaded_by: 'u1',
        file_name: 'test.jpg',
        mime_type: 'image/jpeg',
        file_size: 1024,
        storage_path: '/path/test.jpg',
        checksum_sha256: 'abc123',
      });
      expect(id).toBe('media-1');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO public.media_items'),
        expect.arrayContaining(['f1', 'u1', 'test.jpg']),
      );
    });
  });

  describe('createMediaVariant', () => {
    it('inserts a media variant', async () => {
      const id = await createMediaVariant(mockPool, {
        media_item_id: 'm1',
        variant_type: 'thumbnail',
        storage_path: '/path/thumb.jpg',
        mime_type: 'image/jpeg',
        file_size: 256,
        width: 150,
        height: 150,
      });
      expect(id).toBe('media-1');
    });
  });

  describe('updateMediaStatus', () => {
    it('updates processing status', async () => {
      await updateMediaStatus(mockPool, 'media-1', 'completed');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE public.media_items SET processing_status'),
        ['completed', 'media-1'],
      );
    });
  });

  describe('findByChecksum', () => {
    it('returns ID when found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'existing-1' }] });
      const id = await findByChecksum(mockPool, 'family-1', 'abc123');
      expect(id).toBe('existing-1');
    });

    it('returns null when not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      const id = await findByChecksum(mockPool, 'family-1', 'not-found');
      expect(id).toBeNull();
    });
  });
});
