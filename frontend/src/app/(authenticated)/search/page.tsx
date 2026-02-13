'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearch, useActivityFeed, useRecentSearches, saveRecentSearch } from '@/hooks/use-search';
import type { SearchContentType } from '@/types';

const CONTENT_TYPE_LABELS: Record<string, string> = {
  post: 'Posts',
  recipe: 'Recipes',
  event: 'Events',
  message: 'Messages',
  member: 'Members',
  trip: 'Trips',
  photo: 'Photos',
};

const CONTENT_TYPE_ICONS: Record<string, string> = {
  post: '\ud83d\udcdd',
  recipe: '\ud83c\udf73',
  event: '\ud83d\udcc5',
  message: '\ud83d\udcac',
  member: '\ud83d\udc64',
  trip: '\u2708\ufe0f',
  photo: '\ud83d\udcf7',
};

/**
 * Global search page with filters and activity feed.
 */
export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [tab, setTab] = useState<'search' | 'activity'>('search');

  const { data: recentSearches } = useRecentSearches();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      if (query.length >= 2) saveRecentSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: searchData, fetchNextPage, hasNextPage, isLoading } = useSearch(
    debouncedQuery,
    activeFilters.length > 0 ? activeFilters : undefined,
  );

  const results = searchData?.pages.flatMap((p) => p.results) ?? [];

  const toggleFilter = useCallback((type: string) => {
    setActiveFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }, []);

  function highlightMatch(text: string | null, q: string): string {
    if (!text || !q) return text ?? '';
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  return (
    <div className="mx-auto max-w-4xl pb-20 sm:pl-56">
      <h1 className="mb-4 text-2xl font-bold">Search</h1>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setTab('search')}
          className={`px-4 py-2 text-sm font-medium ${tab === 'search' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-500'}`}
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setTab('activity')}
          className={`px-4 py-2 text-sm font-medium ${tab === 'activity' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-500'}`}
        >
          Activity Feed
        </button>
      </div>

      {tab === 'search' && (
        <>
          {/* Search input */}
          <div className="mb-4">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts, recipes, events, messages..."
              className="input w-full"
              aria-label="Search query"
            />
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(CONTENT_TYPE_LABELS).map(([type, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleFilter(type)}
                className={`rounded-full px-3 py-1 text-xs ${
                  activeFilters.includes(type)
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}
              >
                {CONTENT_TYPE_ICONS[type]} {label}
              </button>
            ))}
          </div>

          {/* Recent searches */}
          {!debouncedQuery && recentSearches && recentSearches.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-xs font-medium text-slate-400">Recent Searches</h3>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQuery(s)}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {isLoading && <p className="text-sm text-slate-500">Searching...</p>}

          <div className="space-y-3">
            {results.map((r) => (
              <div key={r.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{CONTENT_TYPE_ICONS[r.content_type] ?? '\ud83d\udcc4'}</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700">{CONTENT_TYPE_LABELS[r.content_type] ?? r.content_type}</span>
                </div>
                {r.title && (
                  <h3
                    className="mt-1 font-medium"
                    dangerouslySetInnerHTML={{ __html: highlightMatch(r.title, debouncedQuery) }}
                  />
                )}
                {r.body && (
                  <p
                    className="mt-1 text-sm text-slate-500"
                    dangerouslySetInnerHTML={{ __html: highlightMatch(r.body.slice(0, 200), debouncedQuery) }}
                  />
                )}
                <p className="mt-1 text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>

          {hasNextPage && (
            <button type="button" onClick={() => fetchNextPage()} className="btn mt-4 w-full text-sm">
              Load More
            </button>
          )}

          {debouncedQuery && !isLoading && results.length === 0 && (
            <p className="text-center text-sm text-slate-500">No results found for &ldquo;{debouncedQuery}&rdquo;</p>
          )}
        </>
      )}

      {tab === 'activity' && <ActivityFeed />}
    </div>
  );
}

function ActivityFeed() {
  const { data: activityData, fetchNextPage, hasNextPage, isLoading } = useActivityFeed();
  const items = activityData?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">Recent activity across your family.</p>

      {isLoading && <p className="text-sm text-slate-500">Loading activity...</p>}

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm dark:bg-slate-700">
              {item.actor_avatar ? (
                <img src={item.actor_avatar} alt="" className="h-8 w-8 rounded-full" />
              ) : (
                <span>{(item.actor_name ?? '?')[0]}</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-medium">{item.actor_name ?? 'Unknown'}</span>{' '}
                <span className="text-slate-500">{item.summary ?? item.action.replace(/_/g, ' ')}</span>
              </p>
              <p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</p>
            </div>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700">
              {item.target_type}
            </span>
          </div>
        ))}
      </div>

      {hasNextPage && (
        <button type="button" onClick={() => fetchNextPage()} className="btn mt-4 w-full text-sm">
          Load More
        </button>
      )}

      {!isLoading && items.length === 0 && (
        <p className="text-center text-sm text-slate-500">No activity recorded yet.</p>
      )}
    </div>
  );
}
