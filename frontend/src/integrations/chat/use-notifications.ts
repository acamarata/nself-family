'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGraphQL } from '@/hooks/use-graphql';
import type { NotificationEvent } from '@/types';

const NOTIFICATIONS_QUERY = `
  query GetNotifications($userId: uuid!, $limit: Int!) {
    notification_events(
      where: { user_id: { _eq: $userId } },
      order_by: { created_at: desc },
      limit: $limit
    ) {
      id family_id user_id type title body data channel status
      source_id source_type created_at
    }
  }
`;

const UNREAD_COUNT_QUERY = `
  query GetUnreadCount($userId: uuid!) {
    notification_events_aggregate(
      where: { user_id: { _eq: $userId }, status: { _in: ["pending", "sent", "delivered"] } }
    ) {
      aggregate { count }
    }
  }
`;

const MARK_READ_MUTATION = `
  mutation MarkNotificationsRead($ids: [uuid!]!) {
    update_notification_events(
      where: { id: { _in: $ids } },
      _set: { status: "read" }
    ) { affected_rows }
  }
`;

/**
 * Hook to fetch notifications for the current user.
 * @param userId - Current user ID
 * @param limit - Max notifications to fetch
 * @returns Notifications query result
 */
export function useNotifications(userId: string | undefined, limit = 50) {
  const { execute } = useGraphQL();

  return useQuery({
    queryKey: ['notifications', userId, limit],
    queryFn: async () => {
      const data = await execute<{ notification_events: NotificationEvent[] }>(
        NOTIFICATIONS_QUERY,
        { userId, limit },
      );
      return data.notification_events;
    },
    enabled: !!userId,
    refetchInterval: 15_000,
  });
}

/**
 * Hook to get unread notification count.
 * @param userId - Current user ID
 * @returns Unread count query result
 */
export function useUnreadNotificationCount(userId: string | undefined) {
  const { execute } = useGraphQL();

  return useQuery({
    queryKey: ['notificationCount', userId],
    queryFn: async () => {
      const data = await execute<{
        notification_events_aggregate: { aggregate: { count: number } };
      }>(UNREAD_COUNT_QUERY, { userId });
      return data.notification_events_aggregate.aggregate.count;
    },
    enabled: !!userId,
    refetchInterval: 15_000,
  });
}

/**
 * Hook to mark notifications as read.
 * @returns Mutation for marking notifications read
 */
export function useMarkNotificationsRead() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      await execute(MARK_READ_MUTATION, { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationCount'] });
    },
  });
}
