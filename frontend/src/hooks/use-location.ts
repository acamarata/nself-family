'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGraphQL } from './use-graphql';
import { useFamilyStore } from '@/lib/family-store';
import type { LocationShare, Geofence } from '@/types';

const ACTIVE_LOCATIONS_QUERY = `
  query GetActiveLocations($familyId: uuid!, $now: timestamptz!) {
    location_shares(
      where: { family_id: { _eq: $familyId }, expires_at: { _gt: $now } },
      distinct_on: [user_id],
      order_by: [{ user_id: asc }, { created_at: desc }]
    ) {
      id user_id family_id latitude longitude accuracy altitude heading speed
      expires_at created_at
      user { id display_name avatar_url }
    }
  }
`;

const GEOFENCES_QUERY = `
  query GetGeofences($familyId: uuid!) {
    geofences(where: { family_id: { _eq: $familyId }, is_active: { _eq: true } }) {
      id family_id name center_lat center_lng radius_meters
      alert_on_enter alert_on_exit monitored_user_ids
      created_by is_active created_at updated_at
    }
  }
`;

const SHARE_LOCATION_MUTATION = `
  mutation ShareLocation($object: location_shares_insert_input!) {
    insert_location_shares_one(object: $object) { id }
  }
`;

const CREATE_GEOFENCE_MUTATION = `
  mutation CreateGeofence($object: geofences_insert_input!) {
    insert_geofences_one(object: $object) { id }
  }
`;

const DELETE_GEOFENCE_MUTATION = `
  mutation DeleteGeofence($id: uuid!) {
    update_geofences_by_pk(pk_columns: { id: $id }, _set: { is_active: false }) { id }
  }
`;

/**
 * Hook to fetch active location shares for family members.
 * @returns Active locations query result
 */
export function useActiveLocations() {
  const { execute } = useGraphQL();
  const familyId = useFamilyStore((s) => s.activeFamilyId);

  return useQuery({
    queryKey: ['locations', familyId],
    queryFn: async () => {
      const data = await execute<{ location_shares: LocationShare[] }>(
        ACTIVE_LOCATIONS_QUERY,
        { familyId, now: new Date().toISOString() },
      );
      return data.location_shares;
    },
    enabled: !!familyId,
    refetchInterval: 30_000, // Refresh every 30s
  });
}

/**
 * Hook to fetch geofences for the active family.
 * @returns Geofences query result
 */
export function useGeofences() {
  const { execute } = useGraphQL();
  const familyId = useFamilyStore((s) => s.activeFamilyId);

  return useQuery({
    queryKey: ['geofences', familyId],
    queryFn: async () => {
      const data = await execute<{ geofences: Geofence[] }>(
        GEOFENCES_QUERY,
        { familyId },
      );
      return data.geofences;
    },
    enabled: !!familyId,
  });
}

/**
 * Hook to share current location.
 * @returns Mutation for sharing location
 */
export function useShareLocation() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      user_id: string;
      family_id: string;
      latitude: number;
      longitude: number;
      accuracy?: number;
      altitude?: number;
      heading?: number;
      speed?: number;
      duration_hours?: number;
    }) => {
      const durationHours = input.duration_hours ?? 1;
      const expiresAt = new Date(Date.now() + durationHours * 3600_000).toISOString();
      const data = await execute<{ insert_location_shares_one: { id: string } }>(
        SHARE_LOCATION_MUTATION,
        {
          object: {
            user_id: input.user_id,
            family_id: input.family_id,
            latitude: input.latitude,
            longitude: input.longitude,
            accuracy: input.accuracy ?? null,
            altitude: input.altitude ?? null,
            heading: input.heading ?? null,
            speed: input.speed ?? null,
            expires_at: expiresAt,
          },
        },
      );
      return data.insert_location_shares_one.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

/**
 * Hook to create a geofence.
 * @returns Mutation for creating geofences
 */
export function useCreateGeofence() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<Geofence>) => {
      const data = await execute<{ insert_geofences_one: { id: string } }>(
        CREATE_GEOFENCE_MUTATION,
        { object: input },
      );
      return data.insert_geofences_one.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
    },
  });
}

/**
 * Hook to deactivate a geofence.
 * @returns Mutation for deleting geofences
 */
export function useDeleteGeofence() {
  const { execute } = useGraphQL();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await execute(DELETE_GEOFENCE_MUTATION, { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
    },
  });
}
