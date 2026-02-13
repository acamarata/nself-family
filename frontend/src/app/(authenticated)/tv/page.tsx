'use client';

import { useState } from 'react';
import { useTVSession, useTVAdmission } from '@/integrations/tv';
import { mapFamilyRoleToTVEntitlements, checkEntitlement } from '@/integrations/tv';
import { translateTVError } from '@/integrations/tv/telemetry';

/**
 * TV integration shell — session management and playback launch.
 */
export default function TVPage() {
  const { session, isActive, startSession, endSession } = useTVSession();
  const admission = useTVAdmission();
  const [contentId, setContentId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Example entitlements for ADULT_MEMBER
  const entitlements = mapFamilyRoleToTVEntitlements('ADULT_MEMBER');
  const canWatch = checkEntitlement(entitlements, 'can_watch');
  const canRecord = checkEntitlement(entitlements, 'can_record');

  async function handleStartSession() {
    setError(null);
    const result = await startSession(contentId || undefined);
    if (!result) setError('Failed to start TV session. Please try again.');
  }

  async function handleAdmission() {
    if (!contentId) return;
    setError(null);
    try {
      await admission.mutateAsync({ contentId });
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-20 sm:pl-56">
      <h1 className="mb-4 text-2xl font-bold">TV Integration</h1>
      <p className="mb-6 text-sm text-slate-500">
        Connect to nSelf TV for family media streaming. Manage sessions and launch playback.
      </p>

      {/* Session status */}
      <section className="mb-6 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <h2 className="mb-2 text-lg font-bold">Session</h2>
        {isActive && session ? (
          <div>
            <p className="text-sm">
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Active</span>
              <span className="ml-2 text-slate-500">Expires {new Date(session.expires_at).toLocaleTimeString()}</span>
            </p>
            <button type="button" onClick={endSession} className="btn mt-2 text-sm">End Session</button>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-sm text-slate-500">No active TV session.</p>
            <button type="button" onClick={handleStartSession} className="btn btn-primary text-sm">
              Start TV Session
            </button>
          </div>
        )}
      </section>

      {/* Playback */}
      <section className="mb-6 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <h2 className="mb-2 text-lg font-bold">Launch Playback</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={contentId}
            onChange={(e) => setContentId(e.target.value)}
            placeholder="Content ID"
            className="input flex-1"
            aria-label="Content ID"
          />
          <button
            type="button"
            onClick={handleAdmission}
            disabled={!contentId || admission.isPending || !canWatch}
            className="btn btn-primary text-sm"
          >
            {admission.isPending ? 'Connecting...' : 'Watch'}
          </button>
        </div>
        {!canWatch && <p className="mt-2 text-xs text-red-500">You do not have permission to watch content.</p>}
      </section>

      {/* Entitlements */}
      <section className="mb-6 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <h2 className="mb-2 text-lg font-bold">Your Entitlements</h2>
        <div className="space-y-1">
          {entitlements.map((e) => (
            <div key={e.claim_type} className="flex justify-between text-sm">
              <span className="text-slate-500">{e.claim_type.replace(/_/g, ' ')}</span>
              <span className={e.claim_value === 'true' ? 'text-green-600' : e.claim_value === 'false' ? 'text-red-500' : 'text-slate-700'}>
                {e.claim_value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
