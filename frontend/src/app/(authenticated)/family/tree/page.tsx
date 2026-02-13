'use client';

import { useCallback, useMemo, useRef, useState, type WheelEvent, type MouseEvent } from 'react';
import { useFamilyMembers, useFamilyRelationships } from '@/hooks/use-family';
import { useFamilyStore } from '@/lib/family-store';
import type { FamilyMember, Relationship } from '@/types';

interface TreeNode {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  generation: number;
}

interface TreeEdge {
  from: string;
  to: string;
  type: string;
}

/**
 * Interactive family tree page with zoom, pan, and node interaction.
 */
export default function FamilyTreePage() {
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const { data: members } = useFamilyMembers(activeFamilyId);
  const { data: relationships } = useFamilyRelationships(activeFamilyId);

  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    if (!members || !relationships) return { nodes: [], edges: [] };
    return layoutTree(members, relationships);
  }, [members, relationships]);

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.3, Math.min(3, z * delta)));
  }

  function handleMouseDown(e: MouseEvent) {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  if (!activeFamilyId) {
    return <div className="py-20 text-center text-slate-500">Select a family first.</div>;
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const selectedMember = selectedNode ? members?.find((m) => m.user_id === selectedNode) : null;

  return (
    <div className="mx-auto max-w-4xl pb-20 sm:pl-56">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Family Tree</h1>
        <div className="flex gap-2">
          <button onClick={() => setZoom((z) => Math.min(3, z * 1.2))} className="btn-secondary text-sm">
            Zoom In
          </button>
          <button onClick={() => setZoom((z) => Math.max(0.3, z * 0.8))} className="btn-secondary text-sm">
            Zoom Out
          </button>
          <button onClick={() => { setZoom(1); setPanX(0); setPanY(0); }} className="btn-secondary text-sm">
            Reset
          </button>
        </div>
      </div>

      <div
        className="card relative overflow-hidden"
        style={{ height: '500px', cursor: isDragging ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`${-panX / zoom} ${-panY / zoom} ${800 / zoom} ${500 / zoom}`}
          role="img"
          aria-label="Interactive family tree"
        >
          {/* Edges */}
          {edges.map((edge, i) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;
            return (
              <line
                key={i}
                x1={from.x} y1={from.y}
                x2={to.x} y2={to.y}
                stroke="#94a3b8"
                strokeWidth={1.5 / zoom}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => (
            <g
              key={node.id}
              onClick={() => setSelectedNode(node.id === selectedNode ? null : node.id)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={node.x} cy={node.y}
                r={24 / zoom}
                className={node.id === selectedNode
                  ? 'fill-blue-500 stroke-blue-700'
                  : 'fill-blue-100 stroke-blue-500 dark:fill-blue-900 dark:stroke-blue-400'
                }
                strokeWidth={2 / zoom}
              />
              <text
                x={node.x} y={node.y}
                textAnchor="middle" dominantBaseline="central"
                className={`${node.id === selectedNode ? 'fill-white' : 'fill-blue-700 dark:fill-blue-200'}`}
                fontSize={`${11 / zoom}px`}
                fontWeight="bold"
              >
                {node.name.charAt(0).toUpperCase()}
              </text>
              <text
                x={node.x} y={node.y + 35 / zoom}
                textAnchor="middle"
                className="fill-slate-600 dark:fill-slate-300"
                fontSize={`${10 / zoom}px`}
              >
                {node.name.split(' ')[0]}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Selected member detail */}
      {selectedMember && (
        <div className="card mt-4">
          <h3 className="text-lg font-semibold">
            {selectedMember.display_name ?? selectedMember.user?.display_name ?? 'Unknown'}
          </h3>
          <p className="text-sm text-slate-500">Role: {selectedMember.role}</p>
          {selectedMember.user?.email && (
            <p className="text-sm text-slate-500">{selectedMember.user.email}</p>
          )}
        </div>
      )}
    </div>
  );
}

function layoutTree(members: FamilyMember[], relationships: Relationship[]): { nodes: TreeNode[]; edges: TreeEdge[] } {
  // Build generation assignment based on parent-child relationships
  const parentChildRels = relationships.filter((r) => ['parent', 'child'].includes(r.relation_type));
  const generations = new Map<string, number>();

  // Start with members that have no parents (generation 0)
  const childSet = new Set(parentChildRels.filter((r) => r.relation_type === 'child').map((r) => r.user_a_id));
  const parentSet = new Set(parentChildRels.filter((r) => r.relation_type === 'parent').map((r) => r.user_a_id));

  for (const m of members) {
    if (parentSet.has(m.user_id) && !childSet.has(m.user_id)) {
      generations.set(m.user_id, 0);
    }
  }

  // Assign generations via BFS
  for (const m of members) {
    if (!generations.has(m.user_id)) {
      generations.set(m.user_id, 1);
    }
  }

  // Simple layout: group by generation
  const byGen = new Map<number, string[]>();
  for (const [userId, gen] of generations) {
    const arr = byGen.get(gen) ?? [];
    arr.push(userId);
    byGen.set(gen, arr);
  }

  const nodes: TreeNode[] = [];
  for (const m of members) {
    const gen = generations.get(m.user_id) ?? 0;
    const genMembers = byGen.get(gen) ?? [];
    const idx = genMembers.indexOf(m.user_id);
    const total = genMembers.length;

    nodes.push({
      id: m.user_id,
      name: m.display_name ?? m.user?.display_name ?? 'Unknown',
      role: m.role,
      x: 400 + (idx - (total - 1) / 2) * 120,
      y: 80 + gen * 120,
      generation: gen,
    });
  }

  const edges: TreeEdge[] = relationships.map((r) => ({
    from: r.user_a_id,
    to: r.user_b_id,
    type: r.relation_type,
  }));

  return { nodes, edges };
}
