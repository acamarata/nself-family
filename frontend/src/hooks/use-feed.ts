import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useGraphQLClient } from './use-graphql';
import type { Post } from '@/types';

const FEED_PAGE_SIZE = 20;

const FEED_QUERY = `
  query FeedQuery($family_id: uuid!, $limit: Int!, $offset: Int!) {
    posts(
      where: {
        family_id: { _eq: $family_id }
        is_deleted: { _eq: false }
      }
      order_by: [{ is_pinned: desc }, { created_at: desc }]
      limit: $limit
      offset: $offset
    ) {
      id
      family_id
      author_id
      post_type
      title
      body
      visibility
      metadata
      is_pinned
      is_deleted
      created_at
      updated_at
      author: user {
        id
        display_name
        avatar_url
      }
      post_assets(order_by: { sort_order: asc }) {
        id
        post_id
        media_item_id
        sort_order
        caption
        created_at
        media_item {
          id
          family_id
          uploaded_by
          file_name
          mime_type
          file_size
          storage_path
          checksum_sha256
          width
          height
          duration_ms
          metadata
          processing_status
          is_deleted
          created_at
          updated_at
        }
      }
    }
    posts_aggregate(
      where: {
        family_id: { _eq: $family_id }
        is_deleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

interface FeedPage {
  posts: Post[];
  totalCount: number;
}

/**
 * Hook to fetch the family feed with infinite scrolling pagination.
 * @param familyId - The family to fetch feed for
 * @returns React Query infinite query result
 */
export function useFeed(familyId: string | null) {
  const client = useGraphQLClient();

  return useInfiniteQuery<FeedPage>({
    queryKey: ['feed', familyId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!familyId) return { posts: [], totalCount: 0 };
      const data = await client.request<{
        posts: Post[];
        posts_aggregate: { aggregate: { count: number } };
      }>(FEED_QUERY, {
        family_id: familyId,
        limit: FEED_PAGE_SIZE,
        offset: pageParam as number,
      });
      return {
        posts: data.posts,
        totalCount: data.posts_aggregate.aggregate.count,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, p) => sum + p.posts.length, 0);
      return totalFetched < lastPage.totalCount ? totalFetched : undefined;
    },
    enabled: !!familyId,
  });
}

/**
 * Hook to get a single post by ID.
 * @param postId - The post ID
 * @returns React Query result
 */
export function usePost(postId: string | null) {
  const client = useGraphQLClient();

  return useQuery<Post | null>({
    queryKey: ['post', postId],
    queryFn: async () => {
      if (!postId) return null;
      const data = await client.request<{ posts_by_pk: Post }>(
        `query GetPost($id: uuid!) {
          posts_by_pk(id: $id) {
            id family_id author_id post_type title body visibility metadata
            is_pinned is_deleted created_at updated_at
            author: user { id display_name avatar_url }
            post_assets(order_by: { sort_order: asc }) {
              id post_id media_item_id sort_order caption created_at
              media_item {
                id file_name mime_type file_size storage_path width height
                processing_status created_at updated_at
              }
            }
          }
        }`,
        { id: postId },
      );
      return data.posts_by_pk;
    },
    enabled: !!postId,
  });
}

/**
 * Invalidate feed queries to trigger refetch.
 */
export function useInvalidateFeed() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['feed'] });
}
