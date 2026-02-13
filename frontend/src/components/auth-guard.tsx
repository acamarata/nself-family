'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Route guard that redirects unauthenticated users to /login.
 * Wraps protected pages and shows a loading spinner while checking auth.
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || (!isAuthenticated && !user)) {
    return (
      fallback ?? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}
