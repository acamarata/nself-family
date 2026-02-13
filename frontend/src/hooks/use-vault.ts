'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGraphQL } from './use-graphql';
import { useFamilyStore } from '@/lib/family-store';
import { useAuthStore } from '@/lib/auth-store';
import type { LegacyVault, VaultItem, VaultRecipient, DigitalSuccessor, InheritanceScenario, MemorialProfile } from '@/types';

const VAULTS_QUERY = `
  query GetVaults($ownerId: uuid!) {
    legacy_vaults(where: { owner_id: { _eq: $ownerId } }, order_by: { created_at: desc }) {
      id family_id owner_id title description status sealed_at released_at
      release_condition release_trigger_at requires_reauth metadata created_at updated_at
      vault_items(order_by: { sort_order: asc }) {
        id vault_id content_type title content media_id sort_order metadata created_at updated_at
      }
      vault_recipients {
        id vault_id user_id message notified_at viewed_at created_at
        user { display_name email }
      }
    }
  }
`;

const RELEASED_VAULTS_QUERY = `
  query GetReleasedVaults($userId: uuid!) {
    vault_recipients(where: { user_id: { _eq: $userId }, vault: { status: { _eq: "released" } } }) {
      vault {
        id family_id owner_id title description status released_at metadata
        vault_items(order_by: { sort_order: asc }) {
          id content_type title content media_id sort_order
        }
      }
      message viewed_at
    }
  }
`;

const CREATE_VAULT_MUTATION = `
  mutation CreateVault($object: legacy_vaults_insert_input!) {
    insert_legacy_vaults_one(object: $object) { id }
  }
`;

const ADD_VAULT_ITEM_MUTATION = `
  mutation AddVaultItem($object: vault_items_insert_input!) {
    insert_vault_items_one(object: $object) { id }
  }
`;

const REMOVE_VAULT_ITEM_MUTATION = `
  mutation RemoveVaultItem($id: uuid!) {
    delete_vault_items_by_pk(id: $id) { id }
  }
`;

const ADD_RECIPIENT_MUTATION = `
  mutation AddRecipient($object: vault_recipients_insert_input!) {
    insert_vault_recipients_one(object: $object, on_conflict: { constraint: vault_recipients_vault_id_user_id_key, update_columns: [message] }) { id }
  }
`;

const REMOVE_RECIPIENT_MUTATION = `
  mutation RemoveRecipient($vaultId: uuid!, $userId: uuid!) {
    delete_vault_recipients(where: { vault_id: { _eq: $vaultId }, user_id: { _eq: $userId } }) { affected_rows }
  }
`;

const SEAL_VAULT_MUTATION = `
  mutation SealVault($id: uuid!) {
    update_legacy_vaults_by_pk(pk_columns: { id: $id }, _set: { status: "sealed", sealed_at: "now()" }) { id }
  }
`;

const SUCCESSOR_QUERY = `
  query GetSuccessor($familyId: uuid!, $ownerId: uuid!) {
    digital_successors(where: { family_id: { _eq: $familyId }, owner_id: { _eq: $ownerId } }) {
      id family_id owner_id successor_id after_death_action notes confirmed_at created_at updated_at
      successor { display_name email }
    }
  }
`;

const SET_SUCCESSOR_MUTATION = `
  mutation SetSuccessor($object: digital_successors_insert_input!) {
    insert_digital_successors_one(object: $object, on_conflict: { constraint: digital_successors_family_id_owner_id_key, update_columns: [successor_id, after_death_action, notes] }) { id }
  }
`;

const SCENARIOS_QUERY = `
  query GetScenarios($familyId: uuid!, $ownerId: uuid!) {
    inheritance_scenarios(where: { family_id: { _eq: $familyId }, owner_id: { _eq: $ownerId } }, order_by: { version: desc }) {
      id family_id owner_id version input_snapshot output_snapshot created_at
    }
  }
`;

const CREATE_SCENARIO_MUTATION = `
  mutation CreateScenario($object: inheritance_scenarios_insert_input!) {
    insert_inheritance_scenarios_one(object: $object) { id }
  }
`;

const MEMORIAL_QUERY = `
  query GetMemorial($userId: uuid!) {
    memorial_profiles(where: { user_id: { _eq: $userId } }) {
      id user_id family_id state requested_by approved_by memorial_message memorial_date requested_at approved_at created_at updated_at
    }
  }
`;

const REQUEST_MEMORIAL_MUTATION = `
  mutation RequestMemorial($object: memorial_profiles_insert_input!) {
    insert_memorial_profiles_one(object: $object, on_conflict: { constraint: memorial_profiles_user_id_key, update_columns: [state, requested_by, memorial_message, memorial_date, requested_at] }) { id }
  }
`;

const APPROVE_MEMORIAL_MUTATION = `
  mutation ApproveMemorial($userId: uuid!, $approvedBy: uuid!) {
    update_memorial_profiles(where: { user_id: { _eq: $userId } }, _set: { state: "memorialized", approved_by: $approvedBy, approved_at: "now()" }) { affected_rows }
  }
`;

/**
 * Hook to fetch user's own legacy vaults.
 * @returns Query result with vault array
 */
export function useVaults() {
  const { execute: gql } = useGraphQL();
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['vaults', userId],
    queryFn: async () => {
      const data = await gql(VAULTS_QUERY, { ownerId: userId });
      return (data.legacy_vaults ?? []) as (LegacyVault & { vault_items: VaultItem[]; vault_recipients: VaultRecipient[] })[];
    },
    enabled: !!userId,
  });
}

/**
 * Hook to fetch released vaults where user is a recipient.
 * @returns Query result with released vault array
 */
export function useReleasedVaults() {
  const { execute: gql } = useGraphQL();
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['released-vaults', userId],
    queryFn: async () => {
      const data = await gql(RELEASED_VAULTS_QUERY, { userId });
      return data.vault_recipients ?? [];
    },
    enabled: !!userId,
  });
}

/**
 * Hook to create a new vault.
 * @returns Mutation for vault creation
 */
export function useCreateVault() {
  const { execute: gql } = useGraphQL();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { family_id: string; owner_id: string; title: string; description?: string; release_condition?: string; release_trigger_at?: string }) => {
      const data = await gql(CREATE_VAULT_MUTATION, { object: input });
      return data.insert_legacy_vaults_one.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vaults'] }),
  });
}

/**
 * Hook to add an item to a vault.
 * @returns Mutation for item addition
 */
export function useAddVaultItem() {
  const { execute: gql } = useGraphQL();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { vault_id: string; content_type: string; title?: string; content?: string; media_id?: string; sort_order?: number }) => {
      const data = await gql(ADD_VAULT_ITEM_MUTATION, { object: input });
      return data.insert_vault_items_one.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vaults'] }),
  });
}

/**
 * Hook to remove an item from a vault.
 * @returns Mutation for item removal
 */
export function useRemoveVaultItem() {
  const { execute: gql } = useGraphQL();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await gql(REMOVE_VAULT_ITEM_MUTATION, { id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vaults'] }),
  });
}

/**
 * Hook to add a recipient to a vault.
 * @returns Mutation for recipient addition
 */
export function useAddVaultRecipient() {
  const { execute: gql } = useGraphQL();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { vault_id: string; user_id: string; message?: string }) => {
      const data = await gql(ADD_RECIPIENT_MUTATION, { object: input });
      return data.insert_vault_recipients_one.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vaults'] }),
  });
}

/**
 * Hook to remove a recipient from a vault.
 * @returns Mutation for recipient removal
 */
export function useRemoveVaultRecipient() {
  const { execute: gql } = useGraphQL();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { vaultId: string; userId: string }) => {
      await gql(REMOVE_RECIPIENT_MUTATION, input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vaults'] }),
  });
}

/**
 * Hook to seal a vault (prevent further edits).
 * @returns Mutation for vault sealing
 */
export function useSealVault() {
  const { execute: gql } = useGraphQL();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await gql(SEAL_VAULT_MUTATION, { id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vaults'] }),
  });
}

/**
 * Hook to get digital successor.
 * @returns Query result with successor data
 */
export function useDigitalSuccessor() {
  const { execute: gql } = useGraphQL();
  const familyId = useFamilyStore((s) => s.activeFamilyId);
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['successor', familyId, userId],
    queryFn: async () => {
      const data = await gql(SUCCESSOR_QUERY, { familyId, ownerId: userId });
      return (data.digital_successors?.[0] ?? null) as DigitalSuccessor | null;
    },
    enabled: !!familyId && !!userId,
  });
}

/**
 * Hook to set digital successor.
 * @returns Mutation for successor assignment
 */
export function useSetSuccessor() {
  const { execute: gql } = useGraphQL();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { family_id: string; owner_id: string; successor_id: string; after_death_action?: string; notes?: string }) => {
      const data = await gql(SET_SUCCESSOR_MUTATION, { object: input });
      return data.insert_digital_successors_one.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['successor'] }),
  });
}

/**
 * Hook to get inheritance scenarios.
 * @returns Query result with scenario array
 */
export function useInheritanceScenarios() {
  const { execute: gql } = useGraphQL();
  const familyId = useFamilyStore((s) => s.activeFamilyId);
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['scenarios', familyId, userId],
    queryFn: async () => {
      const data = await gql(SCENARIOS_QUERY, { familyId, ownerId: userId });
      return (data.inheritance_scenarios ?? []) as InheritanceScenario[];
    },
    enabled: !!familyId && !!userId,
  });
}

/**
 * Hook to create an inheritance scenario.
 * @returns Mutation for scenario creation
 */
export function useCreateScenario() {
  const { execute: gql } = useGraphQL();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { family_id: string; owner_id: string; version: number; input_snapshot: Record<string, unknown>; output_snapshot: Record<string, unknown> }) => {
      const data = await gql(CREATE_SCENARIO_MUTATION, { object: input });
      return data.insert_inheritance_scenarios_one.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scenarios'] }),
  });
}

/**
 * Hook to get memorial profile for a user.
 * @param userId - User ID to check
 * @returns Query result with memorial profile
 */
export function useMemorialProfile(userId?: string) {
  const { execute: gql } = useGraphQL();
  return useQuery({
    queryKey: ['memorial', userId],
    queryFn: async () => {
      const data = await gql(MEMORIAL_QUERY, { userId });
      return (data.memorial_profiles?.[0] ?? null) as MemorialProfile | null;
    },
    enabled: !!userId,
  });
}

/**
 * Hook to request memorialization.
 * @returns Mutation for memorial request
 */
export function useRequestMemorial() {
  const { execute: gql } = useGraphQL();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { user_id: string; family_id: string; requested_by: string; state: string; memorial_message?: string; memorial_date?: string; requested_at?: string }) => {
      const data = await gql(REQUEST_MEMORIAL_MUTATION, { object: input });
      return data.insert_memorial_profiles_one.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memorial'] }),
  });
}

/**
 * Hook to approve memorialization (admin).
 * @returns Mutation for memorial approval
 */
export function useApproveMemorial() {
  const { execute: gql } = useGraphQL();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; approvedBy: string }) => {
      await gql(APPROVE_MEMORIAL_MUTATION, input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memorial'] }),
  });
}
