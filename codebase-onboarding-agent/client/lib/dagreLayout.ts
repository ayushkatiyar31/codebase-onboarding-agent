import dagre from 'dagre';
import { Node, Edge, Position } from 'reactflow';
const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;
export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction: 'TB' | 'LR' = 'TB'): {
    nodes: Node[];
    edges: Edge[];
} => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
        rankdir: direction,
        nodesep: 60,
        ranksep: 100,
    });
    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });
    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });
    dagre.layout(dagreGraph);
    const layoutedNodes = nodes.map((node) => {
        const dagreNode = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: dagreNode.x - NODE_WIDTH / 2,
                y: dagreNode.y - NODE_HEIGHT / 2,
            },
            targetPosition: direction === 'TB' ? Position.Top : Position.Left,
            sourcePosition: direction === 'TB' ? Position.Bottom : Position.Right,
        };
    });
    return { nodes: layoutedNodes, edges };
};
