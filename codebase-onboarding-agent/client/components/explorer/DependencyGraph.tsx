'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { getLayoutedElements } from '@/lib/dagreLayout';
import { DependencyEdge, GraphStats } from '@/types/graph';
import { Loader2, AlertCircle, RefreshCw, GitBranch } from 'lucide-react';

interface DependencyGraphProps {
  owner: string;
  repoName: string;
  onFileSelect?: (path: string) => void;
}

export default function DependencyGraph({ owner, repoName, onFileSelect }: DependencyGraphProps) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const [rawEdges, setRawEdges] = useState<DependencyEdge[]>([]);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${apiBase}/api/graph/${owner}/${repoName}`);

      if (res.status === 404) {
        setGenerating(true);
        const genRes = await fetch(`${apiBase}/api/graph/${owner}/${repoName}/generate`, {
          method: 'POST',
        });
        if (!genRes.ok) throw new Error('Failed to generate graph');
        setGenerating(false);

        const retryRes = await fetch(`${apiBase}/api/graph/${owner}/${repoName}`);
        const data = await retryRes.json() as { edges: DependencyEdge[]; stats: GraphStats };
        setRawEdges(data.edges);
        setStats(data.stats);
      } else {
        const data = await res.json() as { edges: DependencyEdge[]; stats: GraphStats };
        setRawEdges(data.edges);
        setStats(data.stats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dependency graph');
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  }, [apiBase, owner, repoName]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGraph();
  }, [fetchGraph]);

  const { layoutedNodes, layoutedEdges } = useMemo(() => {
    if (rawEdges.length === 0) return { layoutedNodes: [], layoutedEdges: [] };

    const allPaths = new Set<string>();
    rawEdges.forEach(e => {
      allPaths.add(e.source);
      allPaths.add(e.target);
    });

    const flowNodes: Node[] = Array.from(allPaths).map((path) => {
      const isEntryPoint = stats?.entryPoints.includes(path) ?? false;
      const importedByCount = stats?.mostImported.find(f => f.filePath === path)?.importedByCount ?? 0;

      return {
        id: path,
        position: { x: 0, y: 0 },
        data: {
          label: path.split('/').pop(),
          fullPath: path,
        },
        style: {
          background: isEntryPoint ? '#1e3a8a' : importedByCount > 3 ? '#1e293b' : '#111827',
          color: '#fff',
          border: isEntryPoint ? '2px solid #3b82f6' : '1px solid #374151',
          borderRadius: '8px',
          fontSize: '12px',
          padding: '8px',
          width: 200,
        },
      };
    });

    const flowEdges: Edge[] = rawEdges.map((e, idx) => ({
      id: `edge-${idx}`,
      source: e.source,
      target: e.target,
      animated: false,
      style: { stroke: '#4b5563', strokeWidth: 1 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#4b5563', width: 16, height: 16 },
    }));

    const { nodes: positioned, edges: positionedEdges } = getLayoutedElements(flowNodes, flowEdges, 'TB');

    return { layoutedNodes: positioned, layoutedEdges: positionedEdges };
  }, [rawEdges, stats]);

  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);

    setEdges(eds => eds.map(edge => ({
      ...edge,
      style: {
        ...edge.style,
        stroke: edge.source === node.id || edge.target === node.id ? '#3b82f6' : '#374151',
        strokeWidth: edge.source === node.id || edge.target === node.id ? 2 : 1,
      },
      animated: edge.source === node.id || edge.target === node.id,
    })));
  }, [setEdges]);

  const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    onFileSelect?.(node.id);
  }, [onFileSelect]);

  if (loading || generating) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
        <Loader2 size={28} className="animate-spin text-blue-500" />
        <p className="text-sm">
          {generating ? 'Analysing file dependencies... (this can take a minute)' : 'Loading graph...'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <AlertCircle size={28} className="text-red-400" />
        <p className="text-sm text-gray-400">{error}</p>
        <button
          onClick={fetchGraph}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  if (rawEdges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
        <GitBranch size={28} />
        <p className="text-sm">No internal dependencies detected in this repo</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        fitView
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1f2937" gap={16} />
        <Controls className="bg-gray-800 border-gray-700" />

<MiniMap
  className="bg-gray-900"
  nodeColor={(node) =>
    node.id === selectedNode ? '#3b82f6' : '#374151'
  }
  maskColor="rgba(0,0,0,0.6)"
/>
      </ReactFlow>

      <div className="absolute top-3 left-3 bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-lg p-3 text-xs flex flex-col gap-1.5 z-10">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-blue-900 border border-blue-500" />
          <span className="text-gray-300">Entry point</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-gray-800 border border-gray-600" />
          <span className="text-gray-300">Core file (heavily imported)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-gray-950 border border-gray-700" />
          <span className="text-gray-300">Regular file</span>
        </div>
        <p className="text-gray-500 mt-1 pt-1 border-t border-gray-800">Double-click to open file</p>
      </div>
    </div>
  );
}