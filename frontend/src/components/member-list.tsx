'use client';

import type { FamilyMember } from '@/types';

interface MemberListProps {
  members: FamilyMember[];
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  ADULT_MEMBER: 'Adult',
  YOUTH_MEMBER: 'Youth',
  CHILD_MEMBER: 'Child',
  DEVICE: 'Device',
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  ADMIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  ADULT_MEMBER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  YOUTH_MEMBER: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  CHILD_MEMBER: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  DEVICE: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

/**
 * Displays a list of family members with their roles.
 */
export function MemberList({ members }: MemberListProps) {
  if (members.length === 0) {
    return <p className="text-slate-400">No members yet.</p>;
  }

  return (
    <div className="space-y-2">
      {members.map((member) => {
        const name = member.display_name ?? member.user?.display_name ?? member.user?.email ?? 'Unknown';
        return (
          <div key={member.id} className="card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{name}</p>
                {member.user?.email && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{member.user.email}</p>
                )}
              </div>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[member.role] ?? ''}`}>
              {ROLE_LABELS[member.role] ?? member.role}
            </span>
          </div>
        );
      })}
    </div>
  );
}
