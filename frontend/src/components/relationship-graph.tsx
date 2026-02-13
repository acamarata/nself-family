'use client';

import { useMemo } from 'react';
import type { FamilyMember, Relationship } from '@/types';

interface RelationshipGraphProps {
  members: FamilyMember[];
  relationships: Relationship[];
}

interface GraphNode {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
}

interface GraphEdge {
  from: string;
  to: string;
  type: string;
  isMahram: boolean;
}

const RELATION_LABELS: Record<string, string> = {
  spouse: 'Spouse',
  parent: 'Parent',
  child: 'Child',
  sibling: 'Sibling',
  grandparent: 'Grandparent',
  grandchild: 'Grandchild',
  uncle_aunt: 'Uncle/Aunt',
  nephew_niece: 'Nephew/Niece',
  cousin: 'Cousin',
};

/**
 * Visual family relationship graph using SVG.
 * Renders members as nodes and relationships as labeled edges.
 */
export function RelationshipGraph({ members, relationships }: RelationshipGraphProps) {
  const { nodes, edges, width, height } = useMemo(() => {
    if (members.length === 0) {
      return { nodes: [], edges: [], width: 400, height: 200 };
    }

    // Simple circular layout
    const centerX = 250;
    const centerY = 200;
    const radius = Math.min(150, 50 * members.length);

    const graphNodes: GraphNode[] = members.map((m, i) => {
      const angle = (2 * Math.PI * i) / members.length - Math.PI / 2;
      return {
        id: m.user_id,
        name: m.display_name ?? m.user?.display_name ?? 'Unknown',
        role: m.role,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });

    const graphEdges: GraphEdge[] = relationships.map((r) => ({
      from: r.user_a_id,
      to: r.user_b_id,
      type: r.relation_type,
      isMahram: r.is_mahram,
    }));

    const w = 500;
    const h = 400;
    return { nodes: graphNodes, edges: graphEdges, width: w, height: h };
  }, [members, relationships]);

  if (members.length === 0) {
    return <p className="text-slate-400">No family members to display.</p>;
  }

  if (relationships.length === 0) {
    return <p className="text-slate-400">No relationships defined yet.</p>;
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="card overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Family relationship graph"
      >
        {/* Edges */}
        {edges.map((edge, i) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;

          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;

          return (
            <g key={i}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={edge.isMahram ? '#8b5cf6' : '#94a3b8'}
                strokeWidth={edge.isMahram ? 2 : 1.5}
                strokeDasharray={edge.isMahram ? undefined : '4 2'}
              />
              <text
                x={midX}
                y={midY - 6}
                textAnchor="middle"
                className="fill-slate-500 text-[9px]"
              >
                {RELATION_LABELS[edge.type] ?? edge.type}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={22}
              className="fill-blue-100 stroke-blue-500 dark:fill-blue-900 dark:stroke-blue-400"
              strokeWidth={2}
            />
            <text
              x={node.x}
              y={node.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-blue-700 text-[11px] font-medium dark:fill-blue-200"
            >
              {node.name.charAt(0).toUpperCase()}
            </text>
            <text
              x={node.x}
              y={node.y + 32}
              textAnchor="middle"
              className="fill-slate-600 text-[10px] dark:fill-slate-300"
            >
              {node.name.split(' ')[0]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
