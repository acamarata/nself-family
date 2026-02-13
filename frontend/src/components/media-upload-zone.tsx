'use client';

import { useRef, useState, useCallback, type DragEvent } from 'react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface MediaUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
}

/**
 * Drag-and-drop + file picker zone for media uploads.
 */
export function MediaUploadZone({ onFilesSelected }: MediaUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = useCallback((files: FileList | File[]): File[] => {
    const valid: File[] = [];
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`Unsupported file type: ${file.type}`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large: ${file.name} (max 50MB)`);
        continue;
      }
      valid.push(file);
    }

    return valid;
  }, []);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    const valid = validateFiles(e.dataTransfer.files);
    if (valid.length > 0) onFilesSelected(valid);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    if (e.target.files) {
      const valid = validateFiles(e.target.files);
      if (valid.length > 0) onFilesSelected(valid);
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed p-4 text-sm transition-colors ${
          isDragging
            ? 'border-blue-400 bg-blue-50 text-blue-600 dark:bg-blue-900/20'
            : 'border-slate-300 text-slate-400 hover:border-slate-400 dark:border-slate-600'
        }`}
        role="button"
        tabIndex={0}
        aria-label="Upload media files"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
      >
        Drop photos/videos here or click to browse
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
