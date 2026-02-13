'use client';

import { useState, useRef, type FormEvent } from 'react';
import type { PostType, VisibilityLevel } from '@/types';
import { useCreatePost, useLinkPostAsset } from '@/hooks/use-post-mutations';
import { useMediaUpload } from '@/hooks/use-media-upload';
import { MediaUploadZone } from './media-upload-zone';

interface PostComposerProps {
  familyId: string;
}

/**
 * Composer component for creating new posts with optional media attachments.
 */
export function PostComposer({ familyId }: PostComposerProps) {
  const createPost = useCreatePost();
  const linkAsset = useLinkPostAsset();
  const { upload, isUploading, progress } = useMediaUpload();

  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [postType, setPostType] = useState<PostType>('text');
  const [visibility, setVisibility] = useState<VisibilityLevel>('family');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  function reset() {
    setTitle('');
    setBody('');
    setPostType('text');
    setVisibility('family');
    setPendingFiles([]);
    setIsExpanded(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() && !title.trim() && pendingFiles.length === 0) return;

    const effectiveType = pendingFiles.length > 0 ? 'photo' : postType;

    const post = await createPost.mutateAsync({
      family_id: familyId,
      post_type: effectiveType,
      title: title || undefined,
      body: body || undefined,
      visibility,
    });

    // Upload and link media
    for (let i = 0; i < pendingFiles.length; i++) {
      const result = await upload(pendingFiles[i], familyId);
      if (result) {
        await linkAsset.mutateAsync({
          post_id: post.id,
          media_item_id: result.id,
          sort_order: i,
        });
      }
    }

    reset();
  }

  function handleFilesSelected(files: File[]) {
    setPendingFiles((prev) => [...prev, ...files]);
    if (!isExpanded) setIsExpanded(true);
  }

  function removeFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="card w-full cursor-text text-left text-sm text-slate-400"
      >
        What&apos;s happening in your family?
      </button>
    );
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
        placeholder="Share with your family..."
        rows={4}
        autoFocus
      />

      {/* File previews */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pendingFiles.map((file, i) => (
            <div key={i} className="relative rounded-lg bg-slate-100 p-2 text-xs dark:bg-slate-700">
              <span className="text-slate-600 dark:text-slate-300">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="ml-2 text-red-400 hover:text-red-600"
                aria-label={`Remove ${file.name}`}
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <MediaUploadZone onFilesSelected={handleFilesSelected} />

      {isUploading && (
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
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
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={reset} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={createPost.isPending || isUploading}
            className="btn-primary"
          >
            {createPost.isPending ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </form>
  );
}
