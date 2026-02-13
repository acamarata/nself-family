'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useGraphQL } from './use-graphql';
import { useFamilyStore } from '@/lib/family-store';
import type { SearchResult, ActivityLog } from '@/types';

const SEARCH_QUERY = `
  query Search($familyId: uuid!, $query: String!, $contentTypes: [String!], $limit: Int!, $offset: Int!) {
    search_index(
      where: {
        family_id: { _eq: $familyId },
        _or: [
          { title: { _ilike: $query } },
          { body: { _ilike: $query } }
        ],
        content_type: { _in: $contentTypes }
      },
      order_by: { created_at: desc },
      limit: $limit,
      offset: $offset
    ) {
      id family_id content_type content_id title body author_id visibility metadata created_at
    }
  }
`;

const SEARCH_ALL_QUERY = `
  query SearchAll($familyId: uuid!, $query: String!, $limit: Int!, $offset: Int!) {
    search_index(
      where: {
        family_id: { _eq: $familyId },
        _or: [
          { title: { _ilike: $query } },
          { body: { _ilike: $query } }
        ]
      },
      order_by: { created_at: desc },
      limit: $limit,
      offset: $offset
    ) {
      id family_id content_type content_id title body author_id visibility metadata created_at
    }
  }
`;

const ACTIVITY_FEED_QUERY = `
  query ActivityFeed($familyId: uuid!, $limit: Int!, $offset: Int!) {
    activity_log(
      where: { family_id: { _eq: $familyId } },
      order_by: { created_at: desc },
      limit: $limit,
      offset: $offset
    ) {
      id family_id actor_id action target_type target_id summary metadata created_at
      user { display_name avatar_url }
    }
  }
`;

/**
 * Hook to search across all content types.
 * @param query - Search query string
 * @param contentTypes - Optional content type filter
 * @returns Query result with search results
 */
export function useSearch(query: string, contentTypes?: string[]) {
  const { execute: gql } = useGraphQL();
  const familyId = useFamilyStore((s) => s.activeFamilyId);

  return useInfiniteQuery({
    queryKey: ['search', familyId, query, contentTypes],
    queryFn: async ({ pageParam = 0 }) => {
      const ilike = `%${query}%`;
      const variables = contentTypes && contentTypes.length > 0
        ? { familyId, query: ilike, contentTypes, limit: 20, offset: pageParam }
        : { familyId, query: ilike, limit: 20, offset: pageParam };
      const gqlQuery = contentTypes && contentTypes.length > 0 ? SEARCH_QUERY : SEARCH_ALL_QUERY;
      const data = await gql(gqlQuery, variables);
      const results = (data.search_index ?? []) as SearchResult[];
      return {
        results,
        nextOffset: results.length === 20 ? pageParam + 20 : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: !!familyId && query.length >= 2,
  });
}

/**
 * Hook to get admin activity feed.
 * @param limit - Max results per page
 * @returns Query result with activity log
 */
export function useActivityFeed(limit = 50) {
  const { execute: gql } = useGraphQL();
  const familyId = useFamilyStore((s) => s.activeFamilyId);

  return useInfiniteQuery({
    queryKey: ['activity-feed', familyId],
    queryFn: async ({ pageParam = 0 }) => {
      const data = await gql(ACTIVITY_FEED_QUERY, { familyId, limit, offset: pageParam });
      const items = (data.activity_log ?? []) as ActivityLog[];
      return {
        items,
        nextOffset: items.length === limit ? pageParam + limit : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: !!familyId,
  });
}

/**
 * Hook to get recent searches from localStorage.
 * @returns Recent search queries
 */
export function useRecentSearches() {
  return useQuery({
    queryKey: ['recent-searches'],
    queryFn: () => {
      try {
        const stored = localStorage.getItem('nfamily_recent_searches');
        return stored ? JSON.parse(stored) as string[] : [];
      } catch {
        return [];
      }
    },
    staleTime: Infinity,
  });
}

/**
 * Save a search query to recent searches.
 * @param query - Search query to save
 */
export function saveRecentSearch(query: string): void {
  try {
    const stored = localStorage.getItem('nfamily_recent_searches');
    const recent = stored ? JSON.parse(stored) as string[] : [];
    const filtered = recent.filter((q) => q !== query);
    filtered.unshift(query);
    localStorage.setItem('nfamily_recent_searches', JSON.stringify(filtered.slice(0, 10)));
  } catch {
    // Silently fail on localStorage errors
  }
}
