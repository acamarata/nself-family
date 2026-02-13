'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGraphQL } from './use-graphql';
import { useFamilyStore } from '@/lib/family-store';
import type { Trip, TripItineraryItem } from '@/types';

const TRIPS_QUERY = `
  query GetTrips($familyId: uuid!) {
    trips(where: { family_id: { _eq: $familyId } }, order_by: { start_date: asc_nulls_last }) {
      id family_id title destination description start_date end_date
      status event_id created_by metadata created_at updated_at
      trip_participants { id user_id role user { id display_name avatar_url } }
      trip_itinerary_items(order_by: { day_number: asc, sort_order: asc }) {
        id trip_id day_number start_time end_time activity location notes sort_order created_by created_at updated_at
      }
    }
  }
`;

const CREATE_TRIP_MUTATION = `
  mutation CreateTrip($object: trips_insert_input!) {
    insert_trips_one(object: $object) { id }
  }
`;

const UPDATE_TRIP_MUTATION = `
  mutation UpdateTrip($id: uuid!, $set: trips_set_input!) {
    update_trips_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;

const ADD_ITINERARY_ITEM_MUTATION = `
  mutation AddItineraryItem($object: trip_itinerary_items_insert_input!) {
    insert_trip_itinerary_items_one(object: $object) { id }
  }
`;

const DELETE_ITINERARY_ITEM_MUTATION = `
  mutation DeleteItineraryItem($id: uuid!) {
    delete_trip_itinerary_items_by_pk(id: $id) { id }
  }
`;

/**
 * Hook to fetch all trips for the active family.
 * @returns Trips query result
 */
export function useTrips() {
  const { execute } = useGraphQL();
  const familyId = useFamilyStore((s) => s.activeFamilyId);

  return useQuery({
    queryKey: ['trips', familyId],
    queryFn: async () => {
      const data = await execute<{ trips: (Trip & { trip_itinerary_items: TripItineraryItem[] })[] }>(
        TRIPS_QUERY,
        { familyId },
      );
      return data.trips;
    },
    enabled: !!familyId,
  });
}

/**
 * Hook to create a new trip.
 * @returns Mutation for creating trips
 */
export function useCreateTrip() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<Trip>) => {
      const data = await execute<{ insert_trips_one: { id: string } }>(
        CREATE_TRIP_MUTATION,
        { object: input },
      );
      return data.insert_trips_one.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

/**
 * Hook to update a trip.
 * @returns Mutation for updating trips
 */
export function useUpdateTrip() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...set }: { id: string } & Partial<Trip>) => {
      await execute(UPDATE_TRIP_MUTATION, { id, set });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

/**
 * Hook to add an itinerary item to a trip.
 * @returns Mutation for adding itinerary items
 */
export function useAddItineraryItem() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<TripItineraryItem>) => {
      const data = await execute<{ insert_trip_itinerary_items_one: { id: string } }>(
        ADD_ITINERARY_ITEM_MUTATION,
        { object: input },
      );
      return data.insert_trip_itinerary_items_one.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

/**
 * Hook to delete an itinerary item.
 * @returns Mutation for deleting itinerary items
 */
export function useDeleteItineraryItem() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await execute(DELETE_ITINERARY_ITEM_MUTATION, { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}
