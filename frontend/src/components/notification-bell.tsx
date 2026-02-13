'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotifications, useUnreadNotificationCount, useMarkNotificationsRead } from '@/integrations/chat';
import { useAuthStore } from '@/lib/auth-store';
import Link from 'next/link';

/**
 * Notification bell with dropdown showing recent notifications.
 */
export function NotificationBell() {
  const userId = useAuthStore((s) => s.user?.id);
  const { data: count = 0 } = useUnreadNotificationCount(userId);
  const { data: notifications = [] } = useNotifications(userId, 10);
  const markRead = useMarkNotificationsRead();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleOpen() {
    setOpen(!open);
    // Mark visible notifications as read
    if (!open && notifications.length > 0) {
      const unread = notifications
        .filter((n) => n.status !== 'read')
        .map((n) => n.id);
      if (unread.length > 0) markRead.mutate(unread);
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="relative rounded p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-700">
            <span className="text-sm font-medium">Notifications</span>
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400">No notifications</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`border-b border-slate-100 p-3 last:border-0 dark:border-slate-700 ${
                    notif.status !== 'read' ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium">{notif.title}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {notif.body && <p className="mt-0.5 text-xs text-slate-500">{notif.body}</p>}
                  <span className="mt-0.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-700">
                    {notif.type.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
