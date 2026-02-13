'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFamilyStore } from '@/lib/family-store';
import { useFamilyMembers } from '@/hooks/use-family';
import { useAuthStore } from '@/lib/auth-store';
import { authFetch } from '@/lib/api-client';

interface FamilySettings {
  islamic_mode_enabled: boolean;
  default_visibility: string;
  parental_controls_enabled: boolean;
  content_moderation_level: string;
}

export default function AdminPage() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: members } = useFamilyMembers(activeFamilyId);
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<FamilySettings>({
    queryKey: ['admin-settings', activeFamilyId],
    queryFn: async () => {
      const res = await authFetch<{ data: FamilySettings }>(
        `/api/admin/${activeFamilyId}/settings`,
        { token: accessToken ?? undefined },
      );
      return res.data;
    },
    enabled: !!activeFamilyId && !!accessToken,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<FamilySettings>) => {
      return authFetch(`/api/admin/${activeFamilyId}/settings`, {
        method: 'PUT',
        body: updates,
        token: accessToken ?? undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return authFetch(`/api/admin/${activeFamilyId}/members/${userId}/role`, {
        method: 'PUT',
        body: { role },
        token: accessToken ?? undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      return authFetch(`/api/admin/${activeFamilyId}/members/${userId}`, {
        method: 'DELETE',
        token: accessToken ?? undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
    },
  });

  if (!activeFamilyId) {
    return <div className="py-20 text-center text-slate-500">Select a family first.</div>;
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-20 sm:pl-56">
      <h1 className="text-2xl font-bold">Family Admin</h1>

      {/* Family Settings */}
      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Settings</h2>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings?.islamic_mode_enabled ?? false}
            onChange={(e) => updateSettings.mutate({ islamic_mode_enabled: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm">Islamic mode (mahram-aware filtering)</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings?.parental_controls_enabled ?? false}
            onChange={(e) => updateSettings.mutate({ parental_controls_enabled: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm">Enable parental controls</span>
        </label>

        <div>
          <label className="mb-1 block text-sm font-medium">Default post visibility</label>
          <select
            value={settings?.default_visibility ?? 'family'}
            onChange={(e) => updateSettings.mutate({ default_visibility: e.target.value })}
            className="input w-auto"
          >
            <option value="family">Family</option>
            <option value="adults_only">Adults only</option>
            <option value="private">Private</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Content moderation</label>
          <select
            value={settings?.content_moderation_level ?? 'standard'}
            onChange={(e) => updateSettings.mutate({ content_moderation_level: e.target.value })}
            className="input w-auto"
          >
            <option value="relaxed">Relaxed</option>
            <option value="standard">Standard</option>
            <option value="strict">Strict</option>
          </select>
        </div>
      </section>

      {/* Member Management */}
      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Members</h2>
        <div className="space-y-2">
          {members?.map((member) => {
            const name = member.display_name ?? member.user?.display_name ?? member.user?.email ?? 'Unknown';
            return (
              <div key={member.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <span className="text-sm font-medium">{name}</span>
                <div className="flex items-center gap-2">
                  <select
                    value={member.role}
                    onChange={(e) => changeRole.mutate({ userId: member.user_id, role: e.target.value })}
                    className="input w-auto text-xs"
                    aria-label={`Role for ${name}`}
                  >
                    <option value="OWNER">Owner</option>
                    <option value="ADMIN">Admin</option>
                    <option value="ADULT_MEMBER">Adult</option>
                    <option value="YOUTH_MEMBER">Youth</option>
                    <option value="CHILD_MEMBER">Child</option>
                  </select>
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${name} from the family?`)) {
                        removeMember.mutate(member.user_id);
                      }
                    }}
                    className="rounded p-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
