'use client';

import { useState } from 'react';
import {
  useDigitalSuccessor, useSetSuccessor, useInheritanceScenarios,
  useCreateScenario, useMemorialProfile, useRequestMemorial, useApproveMemorial,
} from '@/hooks/use-vault';
import { useAuthStore } from '@/lib/auth-store';
import { useFamilyStore } from '@/lib/family-store';
import type { AfterDeathAction } from '@/types';

const ACTION_LABELS: Record<AfterDeathAction, string> = {
  memorialize: 'Memorialize my profile',
  delete: 'Delete my account',
  transfer: 'Transfer to successor',
};

/**
 * Inheritance planning and memorialization controls.
 */
export default function InheritancePage() {
  const userId = useAuthStore((s) => s.user?.id);
  const familyId = useFamilyStore((s) => s.activeFamilyId);

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-20 sm:pl-56">
      <div>
        <h1 className="text-2xl font-bold">Inheritance Planning</h1>
        <p className="mt-1 text-sm text-slate-500">
          Plan your digital legacy — assign a successor, set preferences, and manage memorialization.
        </p>
      </div>

      <SuccessorSection />
      <InheritanceScenariosSection />
      <MemorialSection targetUserId={userId} />
    </div>
  );
}

function SuccessorSection() {
  const userId = useAuthStore((s) => s.user?.id);
  const familyId = useFamilyStore((s) => s.activeFamilyId);
  const { data: successor, isLoading } = useDigitalSuccessor();
  const setSuccessor = useSetSuccessor();
  const [editing, setEditing] = useState(false);
  const [successorId, setSuccessorId] = useState('');
  const [action, setAction] = useState<AfterDeathAction>('memorialize');
  const [notes, setNotes] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !userId || !successorId) return;
    await setSuccessor.mutateAsync({
      family_id: familyId, owner_id: userId, successor_id: successorId,
      after_death_action: action, notes: notes || undefined,
    });
    setEditing(false);
  }

  return (
    <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <h2 className="mb-3 text-lg font-bold">Digital Successor</h2>
      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}

      {!isLoading && !editing && successor && (
        <div>
          <p className="text-sm">
            <span className="font-medium">{successor.display_name ?? successor.email ?? successor.successor_id}</span>
            {successor.confirmed_at ? (
              <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Confirmed</span>
            ) : (
              <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">Pending confirmation</span>
            )}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Action: {ACTION_LABELS[successor.after_death_action as AfterDeathAction] ?? successor.after_death_action}
          </p>
          {successor.notes && <p className="mt-1 text-sm text-slate-400">{successor.notes}</p>}
          <button type="button" onClick={() => { setEditing(true); setSuccessorId(successor.successor_id); setAction(successor.after_death_action as AfterDeathAction); setNotes(successor.notes ?? ''); }} className="btn mt-2 text-sm">
            Change
          </button>
        </div>
      )}

      {!isLoading && !editing && !successor && (
        <div>
          <p className="text-sm text-slate-500">No digital successor assigned yet.</p>
          <button type="button" onClick={() => setEditing(true)} className="btn btn-primary mt-2 text-sm">
            Assign Successor
          </button>
        </div>
      )}

      {editing && (
        <form onSubmit={handleSave} className="space-y-3">
          <input type="text" value={successorId} onChange={(e) => setSuccessorId(e.target.value)} placeholder="Successor user ID" className="input w-full" required />
          <select value={action} onChange={(e) => setAction(e.target.value as AfterDeathAction)} className="input w-full" aria-label="After-death action">
            <option value="memorialize">Memorialize my profile</option>
            <option value="delete">Delete my account</option>
            <option value="transfer">Transfer to successor</option>
          </select>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="input w-full" rows={2} />
          <div className="flex gap-2">
            <button type="submit" disabled={setSuccessor.isPending} className="btn btn-primary text-sm">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="btn text-sm">Cancel</button>
          </div>
        </form>
      )}
    </section>
  );
}

function InheritanceScenariosSection() {
  const userId = useAuthStore((s) => s.user?.id);
  const familyId = useFamilyStore((s) => s.activeFamilyId);
  const { data: scenarios = [] } = useInheritanceScenarios();
  const createScenario = useCreateScenario();
  const [showCreate, setShowCreate] = useState(false);

  async function handleCreate() {
    if (!familyId || !userId) return;
    const version = (scenarios[0]?.version ?? 0) + 1;
    await createScenario.mutateAsync({
      family_id: familyId, owner_id: userId, version,
      input_snapshot: { vaults_count: 0, recipients_count: 0, timestamp: new Date().toISOString() },
      output_snapshot: { distribution: 'equal', notes: 'Auto-generated snapshot' },
    });
    setShowCreate(false);
  }

  return (
    <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Inheritance Scenarios</h2>
        <button type="button" onClick={() => setShowCreate(true)} className="btn text-sm">
          New Snapshot
        </button>
      </div>
      <p className="mb-3 text-xs text-slate-400">
        Immutable snapshots of your inheritance configuration. Each version is preserved forever.
      </p>

      {scenarios.length === 0 && <p className="text-sm text-slate-500">No scenarios created yet.</p>}

      <div className="space-y-2">
        {scenarios.map((s) => (
          <div key={s.id} className="rounded bg-slate-50 p-3 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Version {s.version}</span>
              <span className="text-xs text-slate-400">{new Date(s.created_at).toLocaleDateString()}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Input: {JSON.stringify(s.input_snapshot).slice(0, 80)}...
            </p>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={handleCreate} disabled={createScenario.isPending} className="btn btn-primary text-sm">
            {createScenario.isPending ? 'Creating...' : 'Create Snapshot'}
          </button>
          <button type="button" onClick={() => setShowCreate(false)} className="btn text-sm">Cancel</button>
        </div>
      )}
    </section>
  );
}

function MemorialSection({ targetUserId }: { targetUserId?: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const familyId = useFamilyStore((s) => s.activeFamilyId);
  const { data: memorial } = useMemorialProfile(targetUserId);
  const requestMemorial = useRequestMemorial();
  const approveMemorial = useApproveMemorial();
  const [showRequest, setShowRequest] = useState(false);
  const [message, setMessage] = useState('');
  const [memorialDate, setMemorialDate] = useState('');

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!targetUserId || !familyId || !userId) return;
    await requestMemorial.mutateAsync({
      user_id: targetUserId, family_id: familyId, requested_by: userId,
      state: 'pending_memorial', memorial_message: message || undefined,
      memorial_date: memorialDate || undefined, requested_at: new Date().toISOString(),
    });
    setShowRequest(false);
  }

  async function handleApprove() {
    if (!targetUserId || !userId) return;
    await approveMemorial.mutateAsync({ userId: targetUserId, approvedBy: userId });
  }

  return (
    <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <h2 className="mb-3 text-lg font-bold">Memorialization</h2>

      {!memorial && (
        <div>
          <p className="text-sm text-slate-500">No memorialization request for this profile.</p>
          {!showRequest ? (
            <button type="button" onClick={() => setShowRequest(true)} className="btn mt-2 text-sm">
              Request Memorialization
            </button>
          ) : (
            <form onSubmit={handleRequest} className="mt-3 space-y-2">
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Memorial message" className="input w-full" rows={3} />
              <input type="date" value={memorialDate} onChange={(e) => setMemorialDate(e.target.value)} className="input" aria-label="Memorial date" />
              <div className="flex gap-2">
                <button type="submit" disabled={requestMemorial.isPending} className="btn btn-primary text-sm">Submit Request</button>
                <button type="button" onClick={() => setShowRequest(false)} className="btn text-sm">Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {memorial && memorial.state === 'pending_memorial' && (
        <div>
          <p className="text-sm">
            <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">Pending Approval</span>
          </p>
          {memorial.memorial_message && <p className="mt-2 text-sm italic text-slate-500">&ldquo;{memorial.memorial_message}&rdquo;</p>}
          <button type="button" onClick={handleApprove} disabled={approveMemorial.isPending} className="btn btn-primary mt-2 text-sm">
            Approve Memorialization
          </button>
        </div>
      )}

      {memorial && memorial.state === 'memorialized' && (
        <div>
          <p className="text-sm">
            <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">Memorialized</span>
          </p>
          {memorial.memorial_message && <p className="mt-2 text-sm italic text-slate-500">&ldquo;{memorial.memorial_message}&rdquo;</p>}
          {memorial.memorial_date && <p className="mt-1 text-xs text-slate-400">{memorial.memorial_date}</p>}
          {memorial.approved_at && <p className="text-xs text-slate-400">Approved {new Date(memorial.approved_at).toLocaleDateString()}</p>}
        </div>
      )}
    </section>
  );
}
