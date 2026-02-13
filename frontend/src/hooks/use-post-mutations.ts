import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGraphQLClient } from './use-graphql';
import type { Post, PostType, VisibilityLevel } from '@/types';

const CREATE_POST_MUTATION = `
  mutation CreatePost($object: posts_insert_input!) {
    insert_posts_one(object: $object) {
      id family_id author_id post_type title body visibility
      metadata is_pinned is_deleted created_at updated_at
    }
  }
`;

const UPDATE_POST_MUTATION = `
  mutation UpdatePost($id: uuid!, $set: posts_set_input!) {
    update_posts_by_pk(pk_columns: { id: $id }, _set: $set) {
      id family_id author_id post_type title body visibility
      metadata is_pinned is_deleted created_at updated_at
    }
  }
`;

const DELETE_POST_MUTATION = `
  mutation DeletePost($id: uuid!) {
    update_posts_by_pk(pk_columns: { id: $id }, _set: { is_deleted: true }) {
      id
    }
  }
`;

const LINK_ASSET_MUTATION = `
  mutation LinkPostAsset($object: post_assets_insert_input!) {
    insert_post_assets_one(object: $object) {
      id post_id media_item_id sort_order caption
    }
  }
`;

interface CreatePostInput {
  family_id: string;
  post_type: PostType;
  title?: string;
  body?: string;
  visibility?: VisibilityLevel;
  metadata?: Record<string, unknown>;
}

interface UpdatePostInput {
  title?: string;
  body?: string;
  visibility?: VisibilityLevel;
  metadata?: Record<string, unknown>;
  is_pinned?: boolean;
}

/**
 * Hook for creating a new post with optimistic update.
 * @returns React Query mutation
 */
export function useCreatePost() {
  const client = useGraphQLClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const data = await client.request<{ insert_posts_one: Post }>(CREATE_POST_MUTATION, {
        object: {
          family_id: input.family_id,
          post_type: input.post_type,
          title: input.title ?? null,
          body: input.body ?? null,
          visibility: input.visibility ?? 'family',
          metadata: input.metadata ?? {},
        },
      });
      return data.insert_posts_one;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

/**
 * Hook for updating an existing post.
 * @returns React Query mutation
 */
export function useUpdatePost() {
  const client = useGraphQLClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...set }: UpdatePostInput & { id: string }) => {
      const data = await client.request<{ update_posts_by_pk: Post }>(UPDATE_POST_MUTATION, {
        id,
        set,
      });
      return data.update_posts_by_pk;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['post', data.id] });
    },
  });
}

/**
 * Hook for soft-deleting a post.
 * @returns React Query mutation
 */
export function useDeletePost() {
  const client = useGraphQLClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      await client.request(DELETE_POST_MUTATION, { id: postId });
      return postId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

/**
 * Hook for linking a media item to a post as an asset.
 * @returns React Query mutation
 */
export function useLinkPostAsset() {
  const client = useGraphQLClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { post_id: string; media_item_id: string; sort_order: number; caption?: string }) => {
      const data = await client.request<{ insert_post_assets_one: { id: string } }>(LINK_ASSET_MUTATION, {
        object: {
          post_id: input.post_id,
          media_item_id: input.media_item_id,
          sort_order: input.sort_order,
          caption: input.caption ?? null,
        },
      });
      return data.insert_post_assets_one;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
