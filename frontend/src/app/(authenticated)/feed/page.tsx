'use client';

import { useEffect } from 'react';
import { useFeed } from '@/hooks/use-feed';
import { useMyFamilies } from '@/hooks/use-family';
import { useFamilyStore } from '@/lib/family-store';
import { PostCard } from '@/components/post-card';
import { PostComposer } from '@/components/post-composer';

export default function FeedPage() {
  const { data: familiesData, isLoading: familiesLoading } = useMyFamilies();
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const setActiveFamilyId = useFamilyStore((s) => s.setActiveFamilyId);

  // Auto-select first family if none active
  useEffect(() => {
    if (!activeFamilyId && familiesData && familiesData.length > 0) {
      setActiveFamilyId(familiesData[0].family.id);
    }
  }, [activeFamilyId, familiesData, setActiveFamilyId]);

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useFeed(activeFamilyId);

  if (familiesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!familiesData || familiesData.length === 0) {
    return (
      <div className="py-20 text-center">
        <h2 className="mb-2 text-xl font-semibold">Welcome to ɳFamily</h2>
        <p className="mb-6 text-slate-500">You&apos;re not part of any family yet.</p>
        <a href="/onboarding" className="btn-primary">
          Create your family
        </a>
      </div>
    );
  }

  const allPosts = data?.pages.flatMap((page) => page.posts) ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-20 sm:pl-56">
      {/* Family selector (if multiple families) */}
      {familiesData.length > 1 && (
        <div className="flex gap-2">
          {familiesData.map(({ family }) => (
            <button
              key={family.id}
              onClick={() => setActiveFamilyId(family.id)}
              className={`rounded-full px-3 py-1 text-sm ${
                activeFamilyId === family.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {family.name}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      {activeFamilyId && <PostComposer familyId={activeFamilyId} />}

      {/* Feed */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : allPosts.length === 0 ? (
        <div className="py-10 text-center text-slate-400">
          No posts yet. Be the first to share something!
        </div>
      ) : (
        <>
          {allPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="btn-secondary w-full"
            >
              {isFetchingNextPage ? 'Loading more...' : 'Load more'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
