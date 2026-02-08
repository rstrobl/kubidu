import { useState, useRef, useMemo } from 'react';

interface ServiceNode {
  id: string;
  name: string;
  type: 'github' | 'docker';
  status: 'running' | 'stopped' | 'building' | 'failed';
  x?: number;
  y?: number;
}

interface DependencyEdge {
  from: string;
  to: string;
  variables: string[];
}

interface DependencyGraphProps {
  services: ServiceNode[];
  dependencies: DependencyEdge[];
  onNodeClick?: (serviceId: string) => void;
  selectedServiceId?: string;
}

const statusColors = {
  running: { bg: '#22c55e', text: '#166534' },
  stopped: { bg: '#9ca3af', text: '#374151' },
  building: { bg: '#3b82f6', text: '#1e40af' },
  failed: { bg: '#ef4444', text: '#991b1b' },
};

const typeIcons = {
  github: '📦',
  docker: '🐳',
};

function calculateLayout(services: ServiceNode[], dependencies: DependencyEdge[]) {
  // Create adjacency list
  const dependents = new Map<string, string[]>();
  const providers = new Map<string, string[]>();
  
  services.forEach(s => {
    dependents.set(s.id, []);
    providers.set(s.id, []);
  });
  
  dependencies.forEach(d => {
    dependents.get(d.from)?.push(d.to);
    providers.get(d.to)?.push(d.from);
  });
  
  // Find root nodes (no providers)
  const roots = services.filter(s => providers.get(s.id)?.length === 0);
  
  // Calculate levels using BFS from roots
  const levels = new Map<string, number>();
  const queue = roots.map(r => ({ id: r.id, level: 0 }));
  
  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    
    if (levels.has(id) && levels.get(id)! <= level) continue;
    levels.set(id, level);
    
    dependents.get(id)?.forEach(depId => {
      queue.push({ id: depId, level: level + 1 });
    });
  }
  
  // Position nodes
  const levelGroups = new Map<number, string[]>();
  levels.forEach((level, id) => {
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(id);
  });
  
  const maxLevel = Math.max(...levels.values(), 0);
  const width = 600;
  const height = Math.max(400, (maxLevel + 1) * 120);
  const nodeWidth = 140;
  const nodeHeight = 60;
  
  const positioned = services.map(s => {
    const level = levels.get(s.id) ?? 0;
    const group = levelGroups.get(level) ?? [s.id];
    const idx = group.indexOf(s.id);
    const groupWidth = group.length * (nodeWidth + 40);
    const startX = (width - groupWidth) / 2 + 20;
    
    return {
      ...s,
      x: startX + idx * (nodeWidth + 40) + nodeWidth / 2,
      y: 60 + level * 100 + nodeHeight / 2,
    };
  });
  
  return { nodes: positioned, width, height };
}

export function DependencyGraph({
  services,
  dependencies,
  onNodeClick,
  selectedServiceId,
}: DependencyGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<DependencyEdge | null>(null);
  
  const layout = useMemo(() => {
    return calculateLayout(services, dependencies);
  }, [services, dependencies]);
  
  const nodeMap = useMemo(() => {
    return new Map(layout.nodes.map(n => [n.id, n]));
  }, [layout.nodes]);
  
  // Calculate edge paths
  const edges = useMemo(() => {
    return dependencies.map(dep => {
      const from = nodeMap.get(dep.from);
      const to = nodeMap.get(dep.to);
      
      if (!from || !to) return null;
      
      const nodeHeight = 60;
      const startY = (from.y ?? 0) + nodeHeight / 2 - 10;
      const endY = (to.y ?? 0) - nodeHeight / 2 + 10;
      const startX = from.x ?? 0;
      const endX = to.x ?? 0;
      
      // Create a curved path
      const midY = (startY + endY) / 2;
      const path = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
      
      return { ...dep, path, startX, startY, endX, endY };
    }).filter(Boolean);
  }, [dependencies, nodeMap]);
  
  // Check if edge is highlighted
  const isEdgeHighlighted = (edge: DependencyEdge) => {
    if (hoveredNode) {
      return edge.from === hoveredNode || edge.to === hoveredNode;
    }
    if (selectedServiceId) {
      return edge.from === selectedServiceId || edge.to === selectedServiceId;
    }
    return false;
  };
  
  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center bg-gray-50 rounded-xl border border-gray-200">
        <span className="text-5xl mb-4">🔗</span>
        <h3 className="text-lg font-medium text-gray-900">No Dependencies</h3>
        <p className="text-gray-500 mt-1">
          Add environment variable references to see service dependencies
        </p>
      </div>
    );
  }
  
  return (
    <div className="relative">
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-3 z-10">
        <div className="text-xs font-medium text-gray-500 mb-2">Status</div>
        <div className="flex flex-col gap-1">
          {Object.entries(statusColors).map(([status, colors]) => (
            <div key={status} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors.bg }}
              />
              <span className="text-xs text-gray-600 capitalize">{status}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* SVG Graph */}
      <svg
        ref={svgRef}
        width="100%"
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="bg-gray-50 rounded-xl border border-gray-200"
      >
        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#94a3b8"
            />
          </marker>
          <marker
            id="arrowhead-highlighted"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#3b82f6"
            />
          </marker>
        </defs>
        
        {/* Edges */}
        <g className="edges">
          {edges.map((edge, idx) => {
            if (!edge) return null;
            const highlighted = isEdgeHighlighted(edge);
            
            return (
              <g key={idx}>
                <path
                  d={edge.path}
                  fill="none"
                  stroke={highlighted ? '#3b82f6' : '#cbd5e1'}
                  strokeWidth={highlighted ? 3 : 2}
                  markerEnd={`url(#arrowhead${highlighted ? '-highlighted' : ''})`}
                  className="transition-all duration-200"
                  onMouseEnter={() => setHoveredEdge(edge)}
                  onMouseLeave={() => setHoveredEdge(null)}
                  style={{ cursor: 'pointer' }}
                />
                {/* Variable labels on hover */}
                {hoveredEdge === edge && (
                  <foreignObject
                    x={(edge.startX + edge.endX) / 2 - 60}
                    y={(edge.startY + edge.endY) / 2 - 15}
                    width="120"
                    height="30"
                  >
                    <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 text-center shadow-lg">
                      {edge.variables.slice(0, 2).join(', ')}
                      {edge.variables.length > 2 && ` +${edge.variables.length - 2}`}
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </g>
        
        {/* Nodes */}
        <g className="nodes">
          {layout.nodes.map((node) => {
            const colors = statusColors[node.status] || statusColors.stopped;
            const isHovered = hoveredNode === node.id;
            const isSelected = selectedServiceId === node.id;
            const nodeWidth = 140;
            const nodeHeight = 60;
            
            return (
              <g
                key={node.id}
                transform={`translate(${(node.x ?? 0) - nodeWidth / 2}, ${(node.y ?? 0) - nodeHeight / 2})`}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onNodeClick?.(node.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Node background */}
                <rect
                  width={nodeWidth}
                  height={nodeHeight}
                  rx="12"
                  fill="white"
                  stroke={isSelected || isHovered ? '#3b82f6' : '#e5e7eb'}
                  strokeWidth={isSelected || isHovered ? 3 : 2}
                  className="transition-all duration-200"
                  filter={isHovered ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' : undefined}
                />
                
                {/* Status indicator */}
                <circle
                  cx="20"
                  cy={nodeHeight / 2}
                  r="6"
                  fill={colors.bg}
                />
                
                {/* Service icon */}
                <text
                  x="38"
                  y={nodeHeight / 2 - 8}
                  fontSize="14"
                  textAnchor="start"
                  dominantBaseline="middle"
                >
                  {typeIcons[node.type] || '📦'}
                </text>
                
                {/* Service name */}
                <text
                  x="55"
                  y={nodeHeight / 2 - 8}
                  fontSize="12"
                  fontWeight="600"
                  fill="#1f2937"
                  textAnchor="start"
                  dominantBaseline="middle"
                >
                  {node.name.length > 10 ? node.name.slice(0, 10) + '…' : node.name}
                </text>
                
                {/* Status text */}
                <text
                  x={nodeWidth / 2}
                  y={nodeHeight / 2 + 12}
                  fontSize="10"
                  fill="#6b7280"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="capitalize"
                >
                  {node.status}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      
      {/* Info panel */}
      {selectedServiceId && (
        <div className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-xl">
          <h4 className="font-medium text-primary-900 mb-2">
            {nodeMap.get(selectedServiceId)?.name}
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-primary-700 font-medium mb-1">Depends on</div>
              <div className="space-y-1">
                {dependencies
                  .filter(d => d.from === selectedServiceId)
                  .map(d => (
                    <div key={d.to} className="text-primary-600">
                      → {nodeMap.get(d.to)?.name} ({d.variables.length} vars)
                    </div>
                  ))}
                {dependencies.filter(d => d.from === selectedServiceId).length === 0 && (
                  <div className="text-primary-400">None</div>
                )}
              </div>
            </div>
            <div>
              <div className="text-primary-700 font-medium mb-1">Required by</div>
              <div className="space-y-1">
                {dependencies
                  .filter(d => d.to === selectedServiceId)
                  .map(d => (
                    <div key={d.from} className="text-primary-600">
                      ← {nodeMap.get(d.from)?.name} ({d.variables.length} vars)
                    </div>
                  ))}
                {dependencies.filter(d => d.to === selectedServiceId).length === 0 && (
                  <div className="text-primary-400">None</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
