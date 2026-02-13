'use client';

import { useState } from 'react';
import type { Post } from '@/types';
import { useDeletePost } from '@/hooks/use-post-mutations';
import { useAuthStore } from '@/lib/auth-store';
import { PostEditor } from './post-editor';

interface PostCardProps {
  post: Post;
}

/**
 * Renders a single post in the feed.
 */
export function PostCard({ post }: PostCardProps) {
  const user = useAuthStore((s) => s.user);
  const deletePost = useDeletePost();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isAuthor = user?.id === post.author_id;
  const authorName = post.author?.display_name ?? 'Unknown';
  const timeAgo = formatTimeAgo(post.created_at);

  if (isEditing) {
    return <PostEditor post={post} onClose={() => setIsEditing(false)} />;
  }

  return (
    <article className="card" aria-label={`Post by ${authorName}`}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            {authorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{authorName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {timeAgo}
              {post.is_pinned && ' · Pinned'}
            </p>
          </div>
        </div>
        {isAuthor && (
          <div className="flex gap-1">
            <button
              onClick={() => setIsEditing(true)}
              className="rounded p-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
              aria-label="Edit post"
            >
              Edit
            </button>
            {showDeleteConfirm ? (
              <div className="flex gap-1">
                <button
                  onClick={() => deletePost.mutate(post.id)}
                  className="rounded p-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded p-1 text-xs text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded p-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-700"
                aria-label="Delete post"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      {post.title && (
        <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">{post.title}</h3>
      )}

      {/* Body */}
      {post.body && (
        <div className="mb-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{post.body}</div>
      )}

      {/* Media attachments */}
      {post.post_assets && post.post_assets.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {post.post_assets.map((asset) => (
            <div key={asset.id} className="overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-700">
              {asset.media_item?.mime_type?.startsWith('image/') ? (
                <div
                  className="flex h-40 items-center justify-center text-sm text-slate-400"
                  title={asset.media_item.file_name}
                >
                  {asset.media_item.processing_status === 'completed' ? (
                    <img
                      src={asset.media_item.storage_path}
                      alt={asset.caption ?? asset.media_item.file_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>Processing...</span>
                  )}
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-slate-400">
                  {asset.media_item?.file_name ?? 'Attachment'}
                </div>
              )}
              {asset.caption && (
                <p className="px-2 py-1 text-xs text-slate-500 dark:text-slate-400">{asset.caption}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer - visibility badge */}
      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-400">
          {post.visibility}
        </span>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-400">
          {post.post_type}
        </span>
      </div>
    </article>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
