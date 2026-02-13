import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RelationshipGraph } from './relationship-graph';
import type { FamilyMember, Relationship } from '@/types';

const mockMembers: FamilyMember[] = [
  {
    id: 'm1', family_id: 'f1', user_id: 'u1', role: 'OWNER',
    lifecycle_state: 'active', display_name: 'Alice', permissions: {},
    joined_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'm2', family_id: 'f1', user_id: 'u2', role: 'ADULT_MEMBER',
    lifecycle_state: 'active', display_name: 'Bob', permissions: {},
    joined_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
];

const mockRelationships: Relationship[] = [
  {
    id: 'r1', family_id: 'f1', user_a_id: 'u1', user_b_id: 'u2',
    relation_type: 'spouse', is_mahram: true, metadata: {},
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('RelationshipGraph', () => {
  it('renders SVG graph', () => {
    render(<RelationshipGraph members={mockMembers} relationships={mockRelationships} />);
    expect(screen.getByRole('img', { name: /relationship graph/i })).toBeInTheDocument();
  });

  it('renders member initials', () => {
    render(<RelationshipGraph members={mockMembers} relationships={mockRelationships} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('renders relationship labels', () => {
    render(<RelationshipGraph members={mockMembers} relationships={mockRelationships} />);
    expect(screen.getByText('Spouse')).toBeInTheDocument();
  });

  it('handles empty members', () => {
    render(<RelationshipGraph members={[]} relationships={[]} />);
    expect(screen.getByText('No family members to display.')).toBeInTheDocument();
  });

  it('handles no relationships', () => {
    render(<RelationshipGraph members={mockMembers} relationships={[]} />);
    expect(screen.getByText('No relationships defined yet.')).toBeInTheDocument();
  });
});
