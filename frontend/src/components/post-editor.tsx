'use client';

import { useState, type FormEvent } from 'react';
import type { Post, PostType, VisibilityLevel } from '@/types';
import { useUpdatePost } from '@/hooks/use-post-mutations';

interface PostEditorProps {
  post: Post;
  onClose: () => void;
}

/**
 * Inline editor for an existing post.
 */
export function PostEditor({ post, onClose }: PostEditorProps) {
  const updatePost = useUpdatePost();
  const [title, setTitle] = useState(post.title ?? '');
  const [body, setBody] = useState(post.body ?? '');
  const [visibility, setVisibility] = useState<VisibilityLevel>(post.visibility);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await updatePost.mutateAsync({
      id: post.id,
      title: title || undefined,
      body: body || undefined,
      visibility,
    });
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="input"
        placeholder="Title (optional)"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="input min-h-[100px] resize-y"
        placeholder="What's on your mind?"
        rows={4}
      />
      <div className="flex items-center justify-between">
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as VisibilityLevel)}
          className="input w-auto"
          aria-label="Post visibility"
        >
          <option value="family">Family</option>
          <option value="adults_only">Adults only</option>
          <option value="private">Private</option>
          <option value="public">Public</option>
        </select>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={updatePost.isPending} className="btn-primary">
            {updatePost.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  );
}
