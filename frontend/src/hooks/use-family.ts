import { useQuery } from '@tanstack/react-query';
import { useGraphQLClient } from './use-graphql';
import { useAuthStore } from '@/lib/auth-store';
import type { Family, FamilyMember, Relationship } from '@/types';

const FAMILIES_QUERY = `
  query MyFamilies($user_id: uuid!) {
    family_members(where: { user_id: { _eq: $user_id }, lifecycle_state: { _eq: "active" } }) {
      id
      family_id
      user_id
      role
      lifecycle_state
      display_name
      permissions
      joined_at
      created_at
      updated_at
      family {
        id
        name
        description
        settings
        created_by
        is_active
        created_at
        updated_at
      }
    }
  }
`;

const FAMILY_MEMBERS_QUERY = `
  query FamilyMembers($family_id: uuid!) {
    family_members(
      where: { family_id: { _eq: $family_id }, lifecycle_state: { _eq: "active" } }
      order_by: { role: asc, joined_at: asc }
    ) {
      id family_id user_id role lifecycle_state display_name permissions
      joined_at created_at updated_at
      user {
        id email display_name avatar_url profile is_active
      }
    }
  }
`;

const RELATIONSHIPS_QUERY = `
  query FamilyRelationships($family_id: uuid!) {
    relationships(where: { family_id: { _eq: $family_id } }) {
      id family_id user_a_id user_b_id relation_type is_mahram metadata
      created_at updated_at
    }
  }
`;

interface FamilyMembership {
  membership: FamilyMember;
  family: Family;
}

/**
 * Hook to fetch the current user's family memberships.
 * @returns React Query result with family memberships
 */
export function useMyFamilies() {
  const client = useGraphQLClient();
  const user = useAuthStore((s) => s.user);

  return useQuery<FamilyMembership[]>({
    queryKey: ['my-families', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const data = await client.request<{
        family_members: Array<FamilyMember & { family: Family }>;
      }>(FAMILIES_QUERY, { user_id: user.id });
      return data.family_members.map((m) => ({
        membership: m,
        family: m.family,
      }));
    },
    enabled: !!user?.id,
  });
}

/**
 * Hook to fetch all members of a family.
 * @param familyId - Family ID
 * @returns React Query result with family members
 */
export function useFamilyMembers(familyId: string | null) {
  const client = useGraphQLClient();

  return useQuery<FamilyMember[]>({
    queryKey: ['family-members', familyId],
    queryFn: async () => {
      if (!familyId) return [];
      const data = await client.request<{ family_members: FamilyMember[] }>(
        FAMILY_MEMBERS_QUERY,
        { family_id: familyId },
      );
      return data.family_members;
    },
    enabled: !!familyId,
  });
}

/**
 * Hook to fetch all relationships in a family.
 * @param familyId - Family ID
 * @returns React Query result with relationships
 */
export function useFamilyRelationships(familyId: string | null) {
  const client = useGraphQLClient();

  return useQuery<Relationship[]>({
    queryKey: ['family-relationships', familyId],
    queryFn: async () => {
      if (!familyId) return [];
      const data = await client.request<{ relationships: Relationship[] }>(
        RELATIONSHIPS_QUERY,
        { family_id: familyId },
      );
      return data.relationships;
    },
    enabled: !!familyId,
  });
}
