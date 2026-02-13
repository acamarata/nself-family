'use client';

import { useState, useEffect } from 'react';
import { isOnline, getPendingActionCount } from '@/lib/offline-store';

/**
 * Offline indicator banner — shows when the user is offline
 * and displays pending sync action count.
 */
export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setOnline(isOnline());
    setPendingCount(getPendingActionCount());

    function handleOnline() {
      setOnline(true);
      setPendingCount(getPendingActionCount());
    }
    function handleOffline() {
      setOnline(false);
      setPendingCount(getPendingActionCount());
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setPendingCount(getPendingActionCount());
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (online && pendingCount === 0) return null;

  return (
    <div
      className={`fixed bottom-16 left-0 right-0 z-50 px-4 py-2 text-center text-sm sm:bottom-0 ${
        online ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'
      }`}
      role="status"
      aria-live="polite"
    >
      {!online && 'You are offline. Changes will be synced when reconnected.'}
      {online && pendingCount > 0 && `Syncing ${pendingCount} pending action${pendingCount > 1 ? 's' : ''}...`}
    </div>
  );
}
