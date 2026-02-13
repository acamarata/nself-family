'use client';

import { useNotifications, useMarkNotificationsRead } from '@/integrations/chat';
import { useAuthStore } from '@/lib/auth-store';

/**
 * Full notifications page.
 */
export default function NotificationsPage() {
  const userId = useAuthStore((s) => s.user?.id);
  const { data: notifications = [], isLoading } = useNotifications(userId);
  const markRead = useMarkNotificationsRead();

  function handleMarkAllRead() {
    const unread = notifications.filter((n) => n.status !== 'read').map((n) => n.id);
    if (unread.length > 0) markRead.mutate(unread);
  }

  return (
    <div className="mx-auto max-w-3xl pb-20 sm:pl-56">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button type="button" onClick={handleMarkAllRead} className="btn text-sm" disabled={markRead.isPending}>
          Mark all read
        </button>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading notifications...</p>}

      <div className="space-y-2">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`rounded-lg border p-4 ${
              notif.status !== 'read'
                ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10'
                : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{notif.title}</div>
                {notif.body && <p className="mt-1 text-sm text-slate-500">{notif.body}</p>}
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">
                  {new Date(notif.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
                <div className="text-xs text-slate-400">
                  {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700">
                {notif.type.replace(/_/g, ' ')}
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700">
                {notif.channel}
              </span>
              <span className={`rounded px-2 py-0.5 text-xs ${
                notif.status === 'read' ? 'bg-slate-100 text-slate-400 dark:bg-slate-700' :
                notif.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
              }`}>
                {notif.status}
              </span>
            </div>
          </div>
        ))}
        {!isLoading && notifications.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">No notifications yet.</p>
        )}
      </div>
    </div>
  );
}
