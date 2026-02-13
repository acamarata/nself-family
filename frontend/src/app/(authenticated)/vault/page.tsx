'use client';

import { useState } from 'react';
import {
  useVaults, useReleasedVaults, useCreateVault, useAddVaultItem,
  useRemoveVaultItem, useAddVaultRecipient, useRemoveVaultRecipient, useSealVault,
} from '@/hooks/use-vault';
import { useAuthStore } from '@/lib/auth-store';
import { useFamilyStore } from '@/lib/family-store';
import type { LegacyVault, VaultItem, VaultRecipient, VaultStatus } from '@/types';

const STATUS_STYLES: Record<VaultStatus, string> = {
  active: 'bg-green-100 text-green-700',
  sealed: 'bg-amber-100 text-amber-700',
  released: 'bg-blue-100 text-blue-700',
};

/**
 * Legacy vault management page — create, manage, and view vaults.
 */
export default function VaultPage() {
  const { data: vaults = [], isLoading } = useVaults();
  const { data: releasedVaults = [] } = useReleasedVaults();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedVault, setSelectedVault] = useState<string | null>(null);
  const [tab, setTab] = useState<'my' | 'received'>('my');

  const activeVault = vaults.find((v) => v.id === selectedVault);

  return (
    <div className="mx-auto max-w-4xl pb-20 sm:pl-56">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Legacy Vault</h1>
        <button type="button" onClick={() => setShowCreate(true)} className="btn btn-primary text-sm">
          Create Vault
        </button>
      </div>

      <p className="mb-4 text-sm text-slate-500">
        Secure containers for messages, documents, and media to be released to loved ones at a future time.
      </p>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setTab('my')}
          className={`px-4 py-2 text-sm font-medium ${tab === 'my' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-500'}`}
        >
          My Vaults ({vaults.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('received')}
          className={`px-4 py-2 text-sm font-medium ${tab === 'received' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-500'}`}
        >
          Received ({releasedVaults.length})
        </button>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading vaults...</p>}

      {tab === 'my' && (
        <div className="mb-6 space-y-3">
          {vaults.map((vault) => (
            <div
              key={vault.id}
              className={`cursor-pointer rounded-lg border p-4 transition-colors ${selectedVault === vault.id ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'}`}
              onClick={() => setSelectedVault(selectedVault === vault.id ? null : vault.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setSelectedVault(selectedVault === vault.id ? null : vault.id); }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{vault.title}</h3>
                  {vault.description && <p className="mt-1 text-sm text-slate-400">{vault.description}</p>}
                  <p className="mt-1 text-xs text-slate-400">
                    {vault.vault_items?.length ?? 0} items &middot; {vault.vault_recipients?.length ?? 0} recipients
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[vault.status as VaultStatus] ?? STATUS_STYLES.active}`}>
                  {vault.status}
                </span>
              </div>
            </div>
          ))}
          {!isLoading && vaults.length === 0 && (
            <p className="text-center text-sm text-slate-500">No vaults created yet. Start preserving your legacy.</p>
          )}
        </div>
      )}

      {tab === 'received' && (
        <div className="space-y-3">
          {releasedVaults.map((rv: { vault: LegacyVault & { vault_items?: VaultItem[] }; message: string | null; viewed_at: string | null }, i: number) => (
            <div key={rv.vault.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <h3 className="font-medium">{rv.vault.title}</h3>
              {rv.message && <p className="mt-1 text-sm italic text-slate-500">&ldquo;{rv.message}&rdquo;</p>}
              <p className="mt-1 text-xs text-slate-400">
                Released {rv.vault.released_at ? new Date(rv.vault.released_at).toLocaleDateString() : ''}
                {rv.viewed_at ? ' \u00b7 Viewed' : ' \u00b7 New'}
              </p>
              {rv.vault.vault_items && rv.vault.vault_items.length > 0 && (
                <div className="mt-3 space-y-2">
                  {rv.vault.vault_items.map((item: VaultItem) => (
                    <div key={item.id} className="rounded bg-slate-50 p-3 dark:bg-slate-800">
                      <div className="text-xs font-medium uppercase text-slate-400">{item.content_type}</div>
                      {item.title && <div className="font-medium">{item.title}</div>}
                      {item.content && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.content}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {releasedVaults.length === 0 && (
            <p className="text-center text-sm text-slate-500">No released vaults.</p>
          )}
        </div>
      )}

      {/* Vault detail */}
      {activeVault && tab === 'my' && <VaultDetail vault={activeVault as LegacyVault & { vault_items: VaultItem[]; vault_recipients: VaultRecipient[] }} />}

      {/* Create modal */}
      {showCreate && <CreateVaultModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function VaultDetail({ vault }: { vault: LegacyVault & { vault_items: VaultItem[]; vault_recipients: VaultRecipient[] } }) {
  const addItem = useAddVaultItem();
  const removeItem = useRemoveVaultItem();
  const addRecipient = useAddVaultRecipient();
  const removeRecipient = useRemoveVaultRecipient();
  const sealVault = useSealVault();
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [itemType, setItemType] = useState('letter');
  const [itemTitle, setItemTitle] = useState('');
  const [itemContent, setItemContent] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [recipientMsg, setRecipientMsg] = useState('');

  const isEditable = vault.status === 'active';

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    await addItem.mutateAsync({ vault_id: vault.id, content_type: itemType, title: itemTitle || undefined, content: itemContent || undefined });
    setItemTitle('');
    setItemContent('');
    setShowAddItem(false);
  }

  async function handleAddRecipient(e: React.FormEvent) {
    e.preventDefault();
    if (!recipientId) return;
    await addRecipient.mutateAsync({ vault_id: vault.id, user_id: recipientId, message: recipientMsg || undefined });
    setRecipientId('');
    setRecipientMsg('');
    setShowAddRecipient(false);
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">{vault.title}</h2>
        {isEditable && (
          <button
            type="button"
            onClick={() => { if (confirm('Seal this vault? No further edits will be allowed.')) sealVault.mutate(vault.id); }}
            className="rounded bg-amber-500 px-3 py-1 text-sm text-white hover:bg-amber-600"
          >
            Seal Vault
          </button>
        )}
      </div>

      {/* Items */}
      <h3 className="mb-2 text-sm font-medium text-slate-500">Contents ({vault.vault_items?.length ?? 0})</h3>
      <div className="mb-4 space-y-2">
        {(vault.vault_items ?? []).map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded bg-slate-50 p-3 dark:bg-slate-800">
            <div>
              <span className="text-xs font-medium uppercase text-slate-400">{item.content_type}</span>
              {item.title && <span className="ml-2 font-medium">{item.title}</span>}
              {item.content && <p className="mt-1 text-sm text-slate-500">{item.content.slice(0, 100)}{item.content.length > 100 ? '...' : ''}</p>}
            </div>
            {isEditable && (
              <button type="button" onClick={() => removeItem.mutate(item.id)} className="text-xs text-red-400 hover:text-red-600" aria-label={`Remove ${item.title ?? 'item'}`}>
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {isEditable && !showAddItem && (
        <button type="button" onClick={() => setShowAddItem(true)} className="btn mb-4 text-sm">+ Add Content</button>
      )}

      {showAddItem && (
        <form onSubmit={handleAddItem} className="mb-4 space-y-2 rounded border border-slate-200 p-3 dark:border-slate-700">
          <select value={itemType} onChange={(e) => setItemType(e.target.value)} className="input" aria-label="Content type">
            <option value="letter">Letter</option>
            <option value="document">Document</option>
            <option value="media">Media</option>
            <option value="message">Message</option>
          </select>
          <input type="text" value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} placeholder="Title (optional)" className="input w-full" />
          <textarea value={itemContent} onChange={(e) => setItemContent(e.target.value)} placeholder="Content" className="input w-full" rows={4} />
          <div className="flex gap-2">
            <button type="submit" disabled={addItem.isPending} className="btn btn-primary text-sm">Add</button>
            <button type="button" onClick={() => setShowAddItem(false)} className="btn text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Recipients */}
      <h3 className="mb-2 text-sm font-medium text-slate-500">Recipients ({vault.vault_recipients?.length ?? 0})</h3>
      <div className="mb-4 space-y-2">
        {(vault.vault_recipients ?? []).map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded bg-slate-50 p-2 dark:bg-slate-800">
            <span className="text-sm">{r.display_name ?? r.email ?? r.user_id}</span>
            {isEditable && (
              <button type="button" onClick={() => removeRecipient.mutate({ vaultId: vault.id, userId: r.user_id })} className="text-xs text-red-400 hover:text-red-600" aria-label={`Remove recipient ${r.display_name ?? ''}`}>
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {isEditable && !showAddRecipient && (
        <button type="button" onClick={() => setShowAddRecipient(true)} className="btn text-sm">+ Add Recipient</button>
      )}

      {showAddRecipient && (
        <form onSubmit={handleAddRecipient} className="space-y-2 rounded border border-slate-200 p-3 dark:border-slate-700">
          <input type="text" value={recipientId} onChange={(e) => setRecipientId(e.target.value)} placeholder="Recipient user ID" className="input w-full" required />
          <textarea value={recipientMsg} onChange={(e) => setRecipientMsg(e.target.value)} placeholder="Personal message (optional)" className="input w-full" rows={2} />
          <div className="flex gap-2">
            <button type="submit" disabled={addRecipient.isPending} className="btn btn-primary text-sm">Add</button>
            <button type="button" onClick={() => setShowAddRecipient(false)} className="btn text-sm">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

function CreateVaultModal({ onClose }: { onClose: () => void }) {
  const familyId = useFamilyStore((s) => s.activeFamilyId);
  const userId = useAuthStore((s) => s.user?.id);
  const createVault = useCreateVault();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('manual');
  const [triggerDate, setTriggerDate] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !userId || !title) return;
    await createVault.mutateAsync({
      family_id: familyId, owner_id: userId, title, description: description || undefined,
      release_condition: condition, release_trigger_at: triggerDate || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose} role="dialog" aria-label="Create a vault">
      <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-bold">Create Legacy Vault</h2>
        <div className="space-y-3">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Vault name" className="input w-full" required />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="input w-full" rows={2} />
          <select value={condition} onChange={(e) => setCondition(e.target.value)} className="input w-full" aria-label="Release condition">
            <option value="manual">Manual release</option>
            <option value="time_trigger">Release at a specific date</option>
            <option value="death_verification">Release upon death verification</option>
          </select>
          {condition === 'time_trigger' && (
            <input type="datetime-local" value={triggerDate} onChange={(e) => setTriggerDate(e.target.value)} className="input w-full" aria-label="Release date" />
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn text-sm">Cancel</button>
          <button type="submit" disabled={createVault.isPending} className="btn btn-primary text-sm">
            {createVault.isPending ? 'Creating...' : 'Create Vault'}
          </button>
        </div>
      </form>
    </div>
  );
}
