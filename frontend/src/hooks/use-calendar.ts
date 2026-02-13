'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGraphQL } from './use-graphql';
import { useFamilyStore } from '@/lib/family-store';
import type { CalendarEvent, EventInvite, RsvpStatus } from '@/types';

const EVENTS_QUERY = `
  query GetEvents($familyId: uuid!, $start: timestamptz!, $end: timestamptz!) {
    events(where: {
      family_id: { _eq: $familyId },
      is_deleted: { _eq: false },
      start_at: { _gte: $start, _lte: $end }
    }, order_by: { start_at: asc }) {
      id family_id title description start_at end_at all_day
      location recurrence_rule color created_by is_deleted
      metadata created_at updated_at
      event_invites { id event_id user_id status responded_at created_at user { id display_name avatar_url } }
    }
  }
`;

const CREATE_EVENT_MUTATION = `
  mutation CreateEvent($object: events_insert_input!) {
    insert_events_one(object: $object) { id }
  }
`;

const UPDATE_EVENT_MUTATION = `
  mutation UpdateEvent($id: uuid!, $set: events_set_input!) {
    update_events_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;

const DELETE_EVENT_MUTATION = `
  mutation DeleteEvent($id: uuid!) {
    update_events_by_pk(pk_columns: { id: $id }, _set: { is_deleted: true }) { id }
  }
`;

const RSVP_MUTATION = `
  mutation RespondToInvite($object: event_invites_insert_input!) {
    insert_event_invites_one(
      object: $object,
      on_conflict: { constraint: event_invites_event_id_user_id_key, update_columns: [status, responded_at] }
    ) { id }
  }
`;

/**
 * Hook to fetch calendar events for a date range.
 * @param start - Range start ISO string
 * @param end - Range end ISO string
 * @returns Events query result
 */
export function useCalendarEvents(start: string, end: string) {
  const { execute } = useGraphQL();
  const familyId = useFamilyStore((s) => s.activeFamilyId);

  return useQuery({
    queryKey: ['events', familyId, start, end],
    queryFn: async () => {
      const data = await execute<{ events: (CalendarEvent & { event_invites: EventInvite[] })[] }>(
        EVENTS_QUERY,
        { familyId, start, end },
      );
      return data.events;
    },
    enabled: !!familyId,
  });
}

/**
 * Hook to create a calendar event.
 * @returns Mutation for creating events
 */
export function useCreateEvent() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<CalendarEvent>) => {
      const data = await execute<{ insert_events_one: { id: string } }>(
        CREATE_EVENT_MUTATION,
        { object: input },
      );
      return data.insert_events_one.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

/**
 * Hook to update a calendar event.
 * @returns Mutation for updating events
 */
export function useUpdateEvent() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...set }: { id: string } & Partial<CalendarEvent>) => {
      await execute(UPDATE_EVENT_MUTATION, { id, set });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

/**
 * Hook to soft-delete a calendar event.
 * @returns Mutation for deleting events
 */
export function useDeleteEvent() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await execute(DELETE_EVENT_MUTATION, { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

/**
 * Hook to RSVP to an event invitation.
 * @returns Mutation for responding to invites
 */
export function useRsvp() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, userId, status }: { eventId: string; userId: string; status: RsvpStatus }) => {
      await execute(RSVP_MUTATION, {
        object: {
          event_id: eventId,
          user_id: userId,
          status,
          responded_at: new Date().toISOString(),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
