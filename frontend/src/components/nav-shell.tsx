'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import type { ReactNode } from 'react';

const NAV_ITEMS = [
  { href: '/feed', label: 'Feed', icon: '📰' },
  { href: '/family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
  { href: '/albums', label: 'Albums', icon: '📸' },
  { href: '/calendar', label: 'Calendar', icon: '📅' },
  { href: '/admin', label: 'Admin', icon: '⚙️' },
] as const;

interface NavShellProps {
  children: ReactNode;
}

/**
 * Main navigation shell with header and bottom nav (mobile) / sidebar (desktop).
 */
export function NavShell({ children }: NavShellProps) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/feed" className="text-lg font-bold text-blue-600">
            ɳFamily
          </Link>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden text-sm text-slate-600 dark:text-slate-400 sm:block">
                {user.display_name ?? user.email}
              </span>
            )}
            <button
              onClick={() => logout()}
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              aria-label="Log out"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>

      {/* Bottom navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 sm:hidden" aria-label="Main navigation">
        <div className="flex justify-around py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="text-lg" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Sidebar navigation (desktop) — rendered as left rail */}
      <aside className="fixed left-0 top-14 hidden h-[calc(100vh-3.5rem)] w-56 border-r border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:block" aria-label="Sidebar navigation">
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
