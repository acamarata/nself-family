'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useGraphQL } from '@/hooks/use-graphql';
import { useFamilyStore } from '@/lib/family-store';

type Step = 'create-family' | 'invite' | 'profile' | 'done';

const CREATE_FAMILY_MUTATION = `
  mutation CreateFamily($object: families_insert_input!) {
    insert_families_one(object: $object) {
      id name
    }
  }
`;

const ADD_MEMBER_MUTATION = `
  mutation AddMember($object: family_members_insert_input!) {
    insert_family_members_one(object: $object) {
      id
    }
  }
`;

export default function OnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { execute } = useGraphQL();
  const setActiveFamilyId = useFamilyStore((s) => s.setActiveFamilyId);

  const [step, setStep] = useState<Step>('create-family');
  const [familyName, setFamilyName] = useState('');
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateFamily(e: FormEvent) {
    e.preventDefault();
    if (!familyName.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await execute<{
        insert_families_one: { id: string; name: string };
      }>(CREATE_FAMILY_MUTATION, {
        object: { name: familyName, created_by: user?.id },
      });

      const newFamilyId = data.insert_families_one.id;
      setFamilyId(newFamilyId);

      // Add self as OWNER
      await execute(ADD_MEMBER_MUTATION, {
        object: {
          family_id: newFamilyId,
          user_id: user?.id,
          role: 'OWNER',
          lifecycle_state: 'active',
        },
      });

      setActiveFamilyId(newFamilyId);
      setStep('invite');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create family');
    } finally {
      setIsLoading(false);
    }
  }

  function handleSkipInvite() {
    setStep('profile');
  }

  function handleSkipProfile() {
    setStep('done');
  }

  function handleFinish() {
    router.replace('/feed');
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {(['create-family', 'invite', 'profile', 'done'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-2 w-12 rounded-full ${
                i <= ['create-family', 'invite', 'profile', 'done'].indexOf(step)
                  ? 'bg-blue-500'
                  : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400" role="alert">
            {error}
          </div>
        )}

        {/* Step 1: Create family */}
        {step === 'create-family' && (
          <div>
            <h1 className="mb-2 text-center text-2xl font-bold">Create your family</h1>
            <p className="mb-6 text-center text-sm text-slate-500">
              Give your family space a name
            </p>
            <form onSubmit={handleCreateFamily} className="space-y-4">
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                className="input"
                placeholder="e.g., The Smiths"
                autoFocus
                required
              />
              <button type="submit" disabled={isLoading} className="btn-primary w-full">
                {isLoading ? 'Creating...' : 'Create family'}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Invite members */}
        {step === 'invite' && (
          <div>
            <h1 className="mb-2 text-center text-2xl font-bold">Invite family members</h1>
            <p className="mb-6 text-center text-sm text-slate-500">
              You can invite members later too
            </p>
            <div className="space-y-3">
              <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-800">
                Member invitations will be available soon. For now, members can be added through the admin panel.
              </p>
              <button onClick={handleSkipInvite} className="btn-primary w-full">
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Profile setup */}
        {step === 'profile' && (
          <div>
            <h1 className="mb-2 text-center text-2xl font-bold">Set up your profile</h1>
            <p className="mb-6 text-center text-sm text-slate-500">
              Customize how your family sees you
            </p>
            <div className="space-y-3">
              <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-800">
                Profile customization will be available soon. Your display name from registration will be used.
              </p>
              <button onClick={handleSkipProfile} className="btn-primary w-full">
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <div className="text-center">
            <h1 className="mb-2 text-2xl font-bold">You&apos;re all set!</h1>
            <p className="mb-6 text-sm text-slate-500">
              Your family space is ready. Start by sharing your first post.
            </p>
            <button onClick={handleFinish} className="btn-primary">
              Go to your feed
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
