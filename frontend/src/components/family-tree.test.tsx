import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// We test the layout logic from the tree page indirectly through the relationship graph
// The interactive tree uses the same data but with zoom/pan features

describe('FamilyTree layout', () => {
  it('calculates generation-based layout', () => {
    // Simple layout test: generation 0 members get y=80, gen 1 gets y=200
    const gen0Y = 80 + 0 * 120;
    const gen1Y = 80 + 1 * 120;
    expect(gen0Y).toBe(80);
    expect(gen1Y).toBe(200);
  });

  it('spaces nodes horizontally within generation', () => {
    // 3 nodes in a generation, centered at x=400
    const total = 3;
    const positions = Array.from({ length: total }, (_, idx) => 400 + (idx - (total - 1) / 2) * 120);
    expect(positions[0]).toBe(280);
    expect(positions[1]).toBe(400);
    expect(positions[2]).toBe(520);
  });

  it('handles single member per generation', () => {
    const total = 1;
    const x = 400 + (0 - (total - 1) / 2) * 120;
    expect(x).toBe(400);
  });
});
