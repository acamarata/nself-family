'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGraphQL } from '@/hooks/use-graphql';
import { useFamilyStore } from '@/lib/family-store';
import { useAuthStore } from '@/lib/auth-store';

const DEVICES_QUERY = `
  query GetDevices($familyId: uuid!) {
    registered_devices(where: { family_id: { _eq: $familyId } }, order_by: { created_at: desc }) {
      id family_id user_id device_name device_type is_trusted is_revoked
      last_heartbeat_at health_metrics created_at updated_at
    }
  }
`;

const REGISTER_DEVICE_MUTATION = `
  mutation RegisterDevice($object: registered_devices_insert_input!) {
    insert_registered_devices_one(object: $object) { id }
  }
`;

const REVOKE_DEVICE_MUTATION = `
  mutation RevokeDevice($id: uuid!) {
    update_registered_devices_by_pk(pk_columns: { id: $id }, _set: { is_revoked: true, credential: null }) { id }
  }
`;

const DEVICE_TYPE_ICONS: Record<string, string> = {
  tv: '\ud83d\udcfa',
  mobile: '\ud83d\udcf1',
  desktop: '\ud83d\udcbb',
  browser: '\ud83c\udf10',
  antbox: '\ud83d\udce6',
  antserver: '\ud83d\udda5\ufe0f',
};

/**
 * Device management page — register, monitor, and revoke devices.
 */
export default function DevicesPage() {
  const { execute: gql } = useGraphQL();
  const qc = useQueryClient();
  const familyId = useFamilyStore((s) => s.activeFamilyId);
  const userId = useAuthStore((s) => s.user?.id);
  const [showRegister, setShowRegister] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('browser');

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['devices', familyId],
    queryFn: async () => {
      const data = await gql(DEVICES_QUERY, { familyId });
      return data.registered_devices ?? [];
    },
    enabled: !!familyId,
  });

  const registerDevice = useMutation({
    mutationFn: async () => {
      await gql(REGISTER_DEVICE_MUTATION, {
        object: { family_id: familyId, user_id: userId, device_name: name, device_type: type },
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['devices'] }); setShowRegister(false); setName(''); },
  });

  const revokeDevice = useMutation({
    mutationFn: async (id: string) => { await gql(REVOKE_DEVICE_MUTATION, { id }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  });

  const trusted = devices.filter((d: { is_revoked: boolean }) => !d.is_revoked);
  const revoked = devices.filter((d: { is_revoked: boolean }) => d.is_revoked);

  return (
    <div className="mx-auto max-w-4xl pb-20 sm:pl-56">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Devices</h1>
        <button type="button" onClick={() => setShowRegister(true)} className="btn btn-primary text-sm">
          Register Device
        </button>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading devices...</p>}

      <div className="space-y-3">
        {trusted.map((d: { id: string; device_name: string; device_type: string; is_trusted: boolean; last_heartbeat_at: string | null; created_at: string }) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{DEVICE_TYPE_ICONS[d.device_type] ?? '\ud83d\udcbb'}</span>
              <div>
                <h3 className="font-medium">{d.device_name}</h3>
                <p className="text-xs text-slate-400">
                  {d.device_type} &middot; {d.is_trusted ? 'Trusted' : 'Pending'}
                  {d.last_heartbeat_at && ` \u00b7 Last seen ${new Date(d.last_heartbeat_at).toLocaleString()}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { if (confirm(`Revoke ${d.device_name}?`)) revokeDevice.mutate(d.id); }}
              className="text-xs text-red-400 hover:text-red-600"
              aria-label={`Revoke ${d.device_name}`}
            >
              Revoke
            </button>
          </div>
        ))}
      </div>

      {revoked.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-slate-400">Revoked Devices</h2>
          {revoked.map((d: { id: string; device_name: string; device_type: string }) => (
            <div key={d.id} className="mb-2 rounded-lg border border-slate-200 p-3 opacity-50 dark:border-slate-700">
              <span className="mr-2">{DEVICE_TYPE_ICONS[d.device_type] ?? '\ud83d\udcbb'}</span>
              <span className="text-sm line-through">{d.device_name}</span>
            </div>
          ))}
        </div>
      )}

      {!isLoading && devices.length === 0 && (
        <p className="text-center text-sm text-slate-500">No devices registered yet.</p>
      )}

      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowRegister(false)} role="dialog" aria-label="Register device">
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); registerDevice.mutate(); }}
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800"
          >
            <h2 className="mb-4 text-lg font-bold">Register Device</h2>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Device name" className="input mb-3 w-full" required />
            <select value={type} onChange={(e) => setType(e.target.value)} className="input mb-4 w-full" aria-label="Device type">
              <option value="browser">Browser</option>
              <option value="mobile">Mobile</option>
              <option value="desktop">Desktop</option>
              <option value="tv">TV</option>
              <option value="antbox">AntBox</option>
              <option value="antserver">AntServer</option>
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowRegister(false)} className="btn text-sm">Cancel</button>
              <button type="submit" disabled={registerDevice.isPending} className="btn btn-primary text-sm">Register</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
