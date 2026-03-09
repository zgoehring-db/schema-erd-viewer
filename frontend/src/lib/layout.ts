import Dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

const TABLE_WIDTH = 280;
const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 40;
const PADDING = 16;

export function getTableNodeHeight(columnCount: number): number {
  return HEADER_HEIGHT + columnCount * ROW_HEIGHT + PADDING;
}

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'LR'
): { nodes: Node[]; edges: Edge[] } {
  // Separate connected nodes (have edges) from disconnected nodes
  const connectedIds = new Set<string>();
  edges.forEach((e) => {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  });

  const connectedNodes = nodes.filter((n) => connectedIds.has(n.id));
  const disconnectedNodes = nodes.filter((n) => !connectedIds.has(n.id));

  // Layout connected nodes with Dagre
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  g.setGraph({
    rankdir: direction,
    nodesep: 80,
    ranksep: 120,
    marginx: 50,
    marginy: 50,
  });

  connectedNodes.forEach((node) => {
    const colCount = (node.data as any).columns?.length || 1;
    g.setNode(node.id, {
      width: TABLE_WIDTH,
      height: getTableNodeHeight(colCount),
    });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  if (connectedNodes.length > 0) {
    Dagre.layout(g);
  }

  const layoutedConnected = connectedNodes.map((node) => {
    const pos = g.node(node.id);
    const colCount = (node.data as any).columns?.length || 1;
    return {
      ...node,
      position: {
        x: pos.x - TABLE_WIDTH / 2,
        y: pos.y - getTableNodeHeight(colCount) / 2,
      },
    };
  });

  // Find the bounding box of the connected graph
  let maxX = 0;
  let minY = 0;
  layoutedConnected.forEach((n) => {
    const colCount = (n.data as any).columns?.length || 1;
    maxX = Math.max(maxX, n.position.x + TABLE_WIDTH);
    minY = Math.min(minY, n.position.y);
  });

  // Place disconnected nodes in a grid to the right of the connected graph
  const GAP_FROM_GRAPH = 200;
  const COL_GAP = 60;
  const ROW_GAP = 40;
  const GRID_COLS = Math.max(1, Math.ceil(Math.sqrt(disconnectedNodes.length)));

  const startX = connectedNodes.length > 0 ? maxX + GAP_FROM_GRAPH : 50;
  const startY = minY;

  const layoutedDisconnected = disconnectedNodes.map((node, i) => {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);

    // Calculate cumulative Y offset for this column based on actual node heights
    let yOffset = 0;
    for (let r = 0; r < row; r++) {
      const idx = r * GRID_COLS + col;
      if (idx < disconnectedNodes.length) {
        const prevColCount = (disconnectedNodes[idx].data as any).columns?.length || 1;
        yOffset += getTableNodeHeight(prevColCount) + ROW_GAP;
      }
    }

    return {
      ...node,
      position: {
        x: startX + col * (TABLE_WIDTH + COL_GAP),
        y: startY + yOffset,
      },
    };
  });

  return {
    nodes: [...layoutedConnected, ...layoutedDisconnected],
    edges,
  };
}
