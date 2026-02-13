import { useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';

const API_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3001';

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

interface UploadResult {
  id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  processing_status: string;
}

/**
 * Hook for uploading media files with progress tracking.
 * @returns Upload state and upload function
 */
export function useMediaUpload() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  const upload = useCallback(
    async (file: File, familyId: string): Promise<UploadResult | null> => {
      if (!accessToken) {
        setState({ isUploading: false, progress: 0, error: 'Not authenticated' });
        return null;
      }

      setState({ isUploading: true, progress: 0, error: null });

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('family_id', familyId);

        const xhr = new XMLHttpRequest();
        const result = await new Promise<UploadResult>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              setState((prev) => ({ ...prev, progress: Math.round((e.loaded / e.total) * 100) }));
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const data = JSON.parse(xhr.responseText);
              resolve(data.data);
            } else {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.error?.message ?? 'Upload failed'));
            }
          });

          xhr.addEventListener('error', () => reject(new Error('Network error')));
          xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

          xhr.open('POST', `${API_URL}/api/media/upload`);
          xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
          xhr.send(formData);
        });

        setState({ isUploading: false, progress: 100, error: null });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setState({ isUploading: false, progress: 0, error: message });
        return null;
      }
    },
    [accessToken],
  );

  const reset = useCallback(() => {
    setState({ isUploading: false, progress: 0, error: null });
  }, []);

  return { ...state, upload, reset };
}
