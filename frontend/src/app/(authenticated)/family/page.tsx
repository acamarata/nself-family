'use client';

import { useFamilyMembers, useFamilyRelationships } from '@/hooks/use-family';
import { useFamilyStore } from '@/lib/family-store';
import { RelationshipGraph } from '@/components/relationship-graph';
import { MemberList } from '@/components/member-list';

export default function FamilyPage() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const { data: members, isLoading: membersLoading } = useFamilyMembers(activeFamilyId);
  const { data: relationships, isLoading: relsLoading } = useFamilyRelationships(activeFamilyId);

  if (!activeFamilyId) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500">Select a family to view members.</p>
      </div>
    );
  }

  const isLoading = membersLoading || relsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-20 sm:pl-56">
      <div>
        <h1 className="mb-4 text-2xl font-bold">Family Members</h1>
        <MemberList members={members ?? []} />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-bold">Relationship Graph</h2>
        <RelationshipGraph members={members ?? []} relationships={relationships ?? []} />
      </div>
    </div>
  );
}
