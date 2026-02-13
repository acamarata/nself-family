import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostCard } from './post-card';
import type { Post } from '@/types';

// Mock auth store
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: vi.fn((selector) => {
    const state = { user: { id: 'u1' }, logout: vi.fn() };
    return selector(state);
  }),
}));

// Mock hooks
vi.mock('@/hooks/use-post-mutations', () => ({
  useDeletePost: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdatePost: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const mockPost: Post = {
  id: 'p1',
  family_id: 'f1',
  author_id: 'u1',
  post_type: 'text',
  title: 'Test Title',
  body: 'Test body content',
  visibility: 'family',
  metadata: {},
  is_pinned: false,
  is_deleted: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  author: { id: 'u1', display_name: 'Test Author', avatar_url: null },
  post_assets: [],
};

describe('PostCard', () => {
  it('renders post title and body', () => {
    render(<PostCard post={mockPost} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test body content')).toBeInTheDocument();
  });

  it('renders author name', () => {
    render(<PostCard post={mockPost} />);
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('shows pinned indicator', () => {
    const pinnedPost = { ...mockPost, is_pinned: true };
    render(<PostCard post={pinnedPost} />);
    expect(screen.getByText(/Pinned/)).toBeInTheDocument();
  });

  it('shows visibility badge', () => {
    render(<PostCard post={mockPost} />);
    expect(screen.getByText('family')).toBeInTheDocument();
  });

  it('shows post type badge', () => {
    render(<PostCard post={mockPost} />);
    expect(screen.getByText('text')).toBeInTheDocument();
  });

  it('renders edit/delete buttons for author', () => {
    render(<PostCard post={mockPost} />);
    expect(screen.getByLabelText('Edit post')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete post')).toBeInTheDocument();
  });

  it('hides edit/delete for non-author', () => {
    const otherPost = { ...mockPost, author_id: 'u2' };
    render(<PostCard post={otherPost} />);
    expect(screen.queryByLabelText('Edit post')).not.toBeInTheDocument();
  });

  it('renders media attachments', () => {
    const postWithMedia: Post = {
      ...mockPost,
      post_assets: [{
        id: 'a1',
        post_id: 'p1',
        media_item_id: 'm1',
        sort_order: 0,
        caption: 'Photo caption',
        created_at: new Date().toISOString(),
        media_item: {
          id: 'm1',
          family_id: 'f1',
          uploaded_by: 'u1',
          file_name: 'photo.jpg',
          mime_type: 'image/jpeg',
          file_size: 1024,
          storage_path: '/path/photo.jpg',
          checksum_sha256: 'abc',
          width: 800,
          height: 600,
          duration_ms: null,
          metadata: {},
          processing_status: 'completed',
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      }],
    };
    render(<PostCard post={postWithMedia} />);
    expect(screen.getByText('Photo caption')).toBeInTheDocument();
  });
});
