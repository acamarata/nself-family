'use client';

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGraphQL } from '@/hooks/use-graphql';
import { useFamilyStore } from '@/lib/family-store';
import type { Conversation, ConversationMember, Message, MessageReaction } from '@/types';

const CONVERSATIONS_QUERY = `
  query GetConversations($familyId: uuid!, $userId: uuid!) {
    conversations(
      where: { family_id: { _eq: $familyId }, conversation_members: { user_id: { _eq: $userId }, left_at: { _is_null: true } } },
      order_by: { last_message_at: desc_nulls_last }
    ) {
      id family_id type title avatar_url created_by is_archived
      metadata last_message_at created_at updated_at
      conversation_members(where: { left_at: { _is_null: true } }) {
        id conversation_id user_id role is_muted joined_at left_at
        user { id display_name avatar_url }
      }
      messages(limit: 1, order_by: { created_at: desc }) {
        id content sender_id message_type created_at
        sender { id display_name avatar_url }
      }
    }
  }
`;

const MESSAGES_QUERY = `
  query GetMessages($conversationId: uuid!, $limit: Int!, $before: timestamptz) {
    messages(
      where: { conversation_id: { _eq: $conversationId }, created_at: { _lt: $before } },
      order_by: { created_at: desc },
      limit: $limit
    ) {
      id conversation_id sender_id content message_type reply_to_id
      media_id shared_content edited_at deleted_at metadata created_at
      sender { id display_name avatar_url }
      message_reactions { id message_id user_id emoji created_at }
      reply_to: message(where: { id: { _eq: "$reply_to_id" } }) {
        id content sender_id created_at sender { id display_name }
      }
    }
    messages_aggregate(where: { conversation_id: { _eq: $conversationId } }) {
      aggregate { count }
    }
  }
`;

const SEND_MESSAGE_MUTATION = `
  mutation SendMessage($object: messages_insert_input!) {
    insert_messages_one(object: $object) { id created_at }
  }
`;

const EDIT_MESSAGE_MUTATION = `
  mutation EditMessage($id: uuid!, $content: String!) {
    update_messages_by_pk(pk_columns: { id: $id }, _set: { content: $content, edited_at: "now()" }) { id }
  }
`;

const DELETE_MESSAGE_MUTATION = `
  mutation DeleteMessage($id: uuid!) {
    update_messages_by_pk(pk_columns: { id: $id }, _set: { deleted_at: "now()", content: null }) { id }
  }
`;

const CREATE_CONVERSATION_MUTATION = `
  mutation CreateConversation($object: conversations_insert_input!) {
    insert_conversations_one(object: $object) { id }
  }
`;

const ADD_REACTION_MUTATION = `
  mutation AddReaction($object: message_reactions_insert_input!) {
    insert_message_reactions_one(
      object: $object,
      on_conflict: { constraint: message_reactions_message_id_user_id_emoji_key, update_columns: [] }
    ) { id }
  }
`;

const REMOVE_REACTION_MUTATION = `
  mutation RemoveReaction($messageId: uuid!, $userId: uuid!, $emoji: String!) {
    delete_message_reactions(
      where: { message_id: { _eq: $messageId }, user_id: { _eq: $userId }, emoji: { _eq: $emoji } }
    ) { affected_rows }
  }
`;

const UPDATE_READ_STATE_MUTATION = `
  mutation UpdateReadState($object: read_states_insert_input!) {
    insert_read_states_one(
      object: $object,
      on_conflict: { constraint: read_states_conversation_id_user_id_key, update_columns: [last_read_message_id, last_read_at] }
    ) { id }
  }
`;

const PAGE_SIZE = 30;

/**
 * Hook to fetch conversations for the active family.
 * @param userId - Current user ID
 * @returns Conversations query result
 */
export function useConversations(userId: string | undefined) {
  const { execute } = useGraphQL();
  const familyId = useFamilyStore((s) => s.activeFamilyId);

  return useQuery({
    queryKey: ['conversations', familyId, userId],
    queryFn: async () => {
      const data = await execute<{
        conversations: (Conversation & {
          conversation_members: ConversationMember[];
          messages: Message[];
        })[];
      }>(CONVERSATIONS_QUERY, { familyId, userId });
      return data.conversations;
    },
    enabled: !!familyId && !!userId,
    refetchInterval: 10_000,
  });
}

/**
 * Hook to fetch messages for a conversation with pagination.
 * @param conversationId - Conversation ID
 * @returns Paginated messages query
 */
export function useMessages(conversationId: string | null) {
  const { execute } = useGraphQL();

  return useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam }) => {
      const data = await execute<{
        messages: (Message & { message_reactions: MessageReaction[] })[];
        messages_aggregate: { aggregate: { count: number } };
      }>(MESSAGES_QUERY, {
        conversationId,
        limit: PAGE_SIZE,
        before: pageParam ?? new Date().toISOString(),
      });
      return {
        messages: data.messages.reverse(), // Oldest first
        total: data.messages_aggregate.aggregate.count,
      };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.messages.length < PAGE_SIZE) return undefined;
      return lastPage.messages[0]?.created_at;
    },
    initialPageParam: null as string | null,
    enabled: !!conversationId,
  });
}

/**
 * Hook to send a message.
 * @returns Mutation for sending messages
 */
export function useSendMessage() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      conversation_id: string;
      sender_id: string;
      content: string;
      message_type?: string;
      reply_to_id?: string;
      media_id?: string;
      shared_content?: Record<string, unknown>;
    }) => {
      const data = await execute<{ insert_messages_one: { id: string; created_at: string } }>(
        SEND_MESSAGE_MUTATION,
        { object: input },
      );
      return data.insert_messages_one;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/**
 * Hook to edit a message.
 * @returns Mutation for editing messages
 */
export function useEditMessage() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      await execute(EDIT_MESSAGE_MUTATION, { id, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

/**
 * Hook to delete a message.
 * @returns Mutation for deleting messages
 */
export function useDeleteMessage() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await execute(DELETE_MESSAGE_MUTATION, { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

/**
 * Hook to create a conversation.
 * @returns Mutation for creating conversations
 */
export function useCreateConversation() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      family_id: string;
      type: 'direct' | 'group';
      title?: string;
      created_by: string;
      conversation_members: { data: Array<{ user_id: string; role: string }> };
    }) => {
      const data = await execute<{ insert_conversations_one: { id: string } }>(
        CREATE_CONVERSATION_MUTATION,
        { object: input },
      );
      return data.insert_conversations_one.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/**
 * Hook to add a reaction to a message.
 * @returns Mutation for adding reactions
 */
export function useAddReaction() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, userId, emoji }: { messageId: string; userId: string; emoji: string }) => {
      await execute(ADD_REACTION_MUTATION, {
        object: { message_id: messageId, user_id: userId, emoji },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

/**
 * Hook to remove a reaction from a message.
 * @returns Mutation for removing reactions
 */
export function useRemoveReaction() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, userId, emoji }: { messageId: string; userId: string; emoji: string }) => {
      await execute(REMOVE_REACTION_MUTATION, { messageId, userId, emoji });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

/**
 * Hook to update read state for a conversation.
 * @returns Mutation for updating read state
 */
export function useUpdateReadState() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, userId, lastReadMessageId }: {
      conversationId: string; userId: string; lastReadMessageId: string;
    }) => {
      await execute(UPDATE_READ_STATE_MUTATION, {
        object: {
          conversation_id: conversationId,
          user_id: userId,
          last_read_message_id: lastReadMessageId,
          last_read_at: new Date().toISOString(),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
