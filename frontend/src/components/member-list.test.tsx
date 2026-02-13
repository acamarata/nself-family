import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemberList } from './member-list';
import type { FamilyMember } from '@/types';

const mockMembers: FamilyMember[] = [
  {
    id: 'm1',
    family_id: 'f1',
    user_id: 'u1',
    role: 'OWNER',
    lifecycle_state: 'active',
    display_name: 'Papa',
    permissions: {},
    joined_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user: {
      id: 'u1',
      email: 'owner@test.com',
      display_name: 'Owner User',
      avatar_url: null,
      profile: {},
      email_verified: true,
      is_active: true,
      last_login_at: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'm2',
    family_id: 'f1',
    user_id: 'u2',
    role: 'ADULT_MEMBER',
    lifecycle_state: 'active',
    display_name: null,
    permissions: {},
    joined_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user: {
      id: 'u2',
      email: 'member@test.com',
      display_name: 'Member User',
      avatar_url: null,
      profile: {},
      email_verified: true,
      is_active: true,
      last_login_at: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
];

describe('MemberList', () => {
  it('renders member names', () => {
    render(<MemberList members={mockMembers} />);
    expect(screen.getByText('Papa')).toBeInTheDocument();
    expect(screen.getByText('Member User')).toBeInTheDocument();
  });

  it('renders role badges', () => {
    render(<MemberList members={mockMembers} />);
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Adult')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<MemberList members={[]} />);
    expect(screen.getByText('No members yet.')).toBeInTheDocument();
  });

  it('shows member email', () => {
    render(<MemberList members={mockMembers} />);
    expect(screen.getByText('owner@test.com')).toBeInTheDocument();
  });
});
