import { useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeMouseHandler,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TableNode from './TableNode';
import { getLayoutedElements } from '../lib/layout';
import type { ERDData } from '../types';
import { Key, Link, LayoutGrid } from 'lucide-react';

const nodeTypes: NodeTypes = {
  table: TableNode as any,
};

const DEFAULT_EDGE_STYLE = { stroke: '#6366f1', strokeWidth: 1.5 };
const HOVER_EDGE_STYLE = { stroke: '#4f46e5', strokeWidth: 3 };
const DIM_EDGE_STYLE = { stroke: '#d1d5db', strokeWidth: 1 };

interface ERDCanvasProps {
  data: ERDData;
}

export default function ERDCanvas({ data }: ERDCanvasProps) {
  const [direction, setDirection] = useState<'LR' | 'TB'>('LR');
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  const layouted = useMemo(() => {
    const rawNodes: Node[] = data.tables.map((table) => ({
      id: table.name,
      type: 'table',
      position: { x: 0, y: 0 },
      data: {
        label: table.name,
        tableType: table.type,
        tags: table.tags,
        columns: table.columns,
      } as Record<string, unknown>,
    }));

    const rawEdges: Edge[] = data.relationships.map((rel) => ({
      id: `${rel.constraintName}-${rel.sourceColumn}`,
      source: rel.sourceTable,
      target: rel.targetTable,
      sourceHandle: `${rel.sourceColumn}-source`,
      targetHandle: `${rel.targetColumn}-target`,
      type: 'smoothstep',
      label: `${rel.sourceColumn} → ${rel.targetColumn}`,
      labelStyle: { fontSize: 10, fill: '#6b7280' },
      labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
      labelBgPadding: [4, 2] as [number, number],
      style: DEFAULT_EDGE_STYLE,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#6366f1',
        width: 16,
        height: 16,
      },
    }));

    return getLayoutedElements(rawNodes, rawEdges, direction);
  }, [data, direction]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layouted.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layouted.edges);

  useEffect(() => {
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [layouted, setNodes, setEdges]);

  // Apply hover styling to edges
  useEffect(() => {
    if (hoveredEdgeId === null) {
      // Reset all edges to default
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          style: DEFAULT_EDGE_STYLE,
          labelStyle: { fontSize: 10, fill: '#6b7280' },
          zIndex: 0,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#6366f1',
            width: 16,
            height: 16,
          },
        }))
      );
    } else {
      setEdges((eds) =>
        eds.map((e) => {
          if (e.id === hoveredEdgeId) {
            return {
              ...e,
              style: HOVER_EDGE_STYLE,
              labelStyle: { fontSize: 11, fill: '#312e81', fontWeight: 600 },
              zIndex: 1000,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#4f46e5',
                width: 20,
                height: 20,
              },
            };
          }
          return {
            ...e,
            style: DIM_EDGE_STYLE,
            labelStyle: { fontSize: 10, fill: '#d1d5db' },
            zIndex: 0,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#d1d5db',
              width: 14,
              height: 14,
            },
          };
        })
      );
    }
  }, [hoveredEdgeId, setEdges]);

  const onEdgeMouseEnter: EdgeMouseHandler = useCallback((_event, edge) => {
    setHoveredEdgeId(edge.id);
  }, []);

  const onEdgeMouseLeave: EdgeMouseHandler = useCallback(() => {
    setHoveredEdgeId(null);
  }, []);

  const toggleDirection = useCallback(() => {
    setDirection((d) => (d === 'LR' ? 'TB' : 'LR'));
  }, []);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.05}
        maxZoom={2}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} color="#e5e7eb" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor="#3b82f6"
          maskColor="rgba(0,0,0,0.1)"
          className="!bg-gray-50 !border-gray-200"
        />

        {/* Legend panel */}
        <Panel position="bottom-left" className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-200 px-4 py-3">
          <div className="flex items-center gap-5 text-xs text-gray-600 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-blue-600" />
              <span>Table</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-600" />
              <span>View</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-purple-600" />
              <span>Mat View</span>
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <div className="flex items-center gap-1.5">
              <Key size={12} className="text-yellow-600" />
              <span>Primary Key</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Link size={12} className="text-blue-500" />
              <span>Foreign Key</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-indigo-500" />
              <span>Relationship</span>
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <div className="text-gray-400">
              {data.tables.length} objects &middot; {data.relationships.length} relationships
            </div>
          </div>
        </Panel>

        {/* Layout toggle */}
        <Panel position="top-right" className="flex gap-2">
          <button
            onClick={toggleDirection}
            className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
          >
            <LayoutGrid size={14} />
            {direction === 'LR' ? 'Horizontal' : 'Vertical'} Layout
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
