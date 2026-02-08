import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  type Node,
  type Edge,
  type NodeProps,
  type NodeTypes,
  type OnNodeDrag,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { apiService } from '../services/api.service';

// Context menu state type
interface ContextMenuState {
  x: number;
  y: number;
  type: 'service' | 'group';
  serviceId?: string;
  groupId?: string;
  serviceName?: string;
  groupName?: string;
  serviceIds?: string[]; // For group deletion
}

type DisplayStatus = 'running' | 'in-progress' | 'failed' | 'stopped';

function getServiceDisplayStatus(service: any): { label: string; dotClass: string; textClass: string; status: DisplayStatus } {
  const deployments: any[] = service.deployments || [];
  if (deployments.length === 0) {
    return { label: 'Stopped', dotClass: 'bg-gray-400', textClass: 'text-gray-600', status: 'stopped' };
  }

  const active = deployments.find((d: any) => d.isActive);
  const latest = active || [...deployments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  switch (latest.status) {
    case 'RUNNING':
      return { label: 'Running', dotClass: 'bg-green-500 animate-pulse', textClass: 'text-green-700', status: 'running' };
    case 'PENDING':
    case 'BUILDING':
    case 'DEPLOYING':
      return { label: 'In Progress', dotClass: 'bg-yellow-500 animate-pulse', textClass: 'text-yellow-700', status: 'in-progress' };
    case 'FAILED':
    case 'CRASHED':
      return { label: 'Failed', dotClass: 'bg-red-500', textClass: 'text-red-700', status: 'failed' };
    case 'STOPPED':
    default:
      return { label: 'Stopped', dotClass: 'bg-gray-400', textClass: 'text-gray-600', status: 'stopped' };
  }
}

interface ServiceNodeData {
  service: any;
  onSelect: (serviceId: string) => void;
  [key: string]: unknown;
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function DockerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H5.136a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z" />
    </svg>
  );
}

// Database and service-specific icons using CDN images
function PostgreSQLIcon({ className }: { className?: string }) {
  return <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg" alt="PostgreSQL" className={className} />;
}

function MySQLIcon({ className }: { className?: string }) {
  return <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg" alt="MySQL" className={className} />;
}

function RedisIcon({ className }: { className?: string }) {
  return <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg" alt="Redis" className={className} />;
}

function MongoDBIcon({ className }: { className?: string }) {
  return <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg" alt="MongoDB" className={className} />;
}

function WordPressIcon({ className }: { className?: string }) {
  return <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/wordpress/wordpress-plain.svg" alt="WordPress" className={className} />;
}

function N8nIcon({ className }: { className?: string }) {
  return <img src="https://n8n.io/favicon.ico" alt="n8n" className={className} />;
}

function GhostIcon({ className }: { className?: string }) {
  return <img src="https://ghost.org/favicon.ico" alt="Ghost" className={className} />;
}

function PrefectIcon({ className }: { className?: string }) {
  return <img src="https://api.iconify.design/simple-icons/prefect.svg" alt="Prefect" className={className} />;
}

function DirectusIcon({ className }: { className?: string }) {
  return <img src="https://raw.githubusercontent.com/directus/directus/main/app/public/favicon.ico" alt="Directus" className={className} />;
}

function TemplateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function VolumeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 5v6c0 1.657-4.03 3-9 3s-9-1.343-9-3V5" />
      <path d="M21 11v6c0 1.657-4.03 3-9 3s-9-1.343-9-3v-6" />
    </svg>
  );
}

function ServiceTypeIcon({ serviceType, templateDeploymentId, dockerImage, serviceName, className }: { serviceType: string; templateDeploymentId?: string | null; dockerImage?: string | null; serviceName?: string; className?: string }) {
  const imageOrName = (dockerImage || serviceName || '').toLowerCase();

  if (imageOrName.includes('postgres') || imageOrName.includes('postgresql')) return <PostgreSQLIcon className={className} />;
  if (imageOrName.includes('mysql') || imageOrName.includes('mariadb')) return <MySQLIcon className={className} />;
  if (imageOrName.includes('redis')) return <RedisIcon className={className} />;
  if (imageOrName.includes('mongo')) return <MongoDBIcon className={className} />;
  if (imageOrName.includes('wordpress') || imageOrName.includes('wp-')) return <WordPressIcon className={className} />;
  if (imageOrName.includes('n8n')) return <N8nIcon className={className} />;
  if (imageOrName.includes('ghost')) return <GhostIcon className={className} />;
  if (imageOrName.includes('prefect')) return <PrefectIcon className={className} />;
  if (imageOrName.includes('directus')) return <DirectusIcon className={className} />;

  if (templateDeploymentId) return <TemplateIcon className={className} />;
  if (serviceType === 'GITHUB') return <GitHubIcon className={className} />;
  return <DockerIcon className={className} />;
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function ServiceNode({ data }: NodeProps<Node<ServiceNodeData>>) {
  const { service, onSelect } = data;
  const displayStatus = getServiceDisplayStatus(service);
  const volumes = service.volumes || [];

  const borderColor =
    displayStatus.status === 'running' ? 'border-green-400' :
    displayStatus.status === 'in-progress' ? 'border-yellow-400' :
    displayStatus.status === 'failed' ? 'border-red-400' :
    'border-gray-200';

  // Extract short domain for display
  const shortUrl = service.url ? service.url.replace(/^https?:\/\//, '').replace(/\.kubidu\.io$/, '') : null;

  return (
    <div
      onClick={() => onSelect(service.id)}
      className={`bg-white rounded-xl shadow-sm border-2 ${borderColor} px-3 py-3 cursor-pointer hover:shadow-md transition-all w-[220px] group relative`}
    >
      <Handle type="target" position={Position.Left} id="target-left" className="!opacity-0 !w-1 !h-1 !min-w-0 !min-h-0 !-left-px" />
      <Handle type="target" position={Position.Right} id="target-right" className="!opacity-0 !w-1 !h-1 !min-w-0 !min-h-0 !-right-px" />
      <Handle type="target" position={Position.Top} id="target-top" className="!opacity-0 !w-1 !h-1 !min-w-0 !min-h-0 !-top-px" />
      <Handle type="target" position={Position.Bottom} id="target-bottom" className="!opacity-0 !w-1 !h-1 !min-w-0 !min-h-0 !-bottom-px" />
      <Handle type="source" position={Position.Left} id="source-left" className="!opacity-0 !w-1 !h-1 !min-w-0 !min-h-0 !-left-px" />
      <Handle type="source" position={Position.Right} id="source-right" className="!opacity-0 !w-1 !h-1 !min-w-0 !min-h-0 !-right-px" />
      <Handle type="source" position={Position.Top} id="source-top" className="!opacity-0 !w-1 !h-1 !min-w-0 !min-h-0 !-top-px" />
      <Handle type="source" position={Position.Bottom} id="source-bottom" className="!opacity-0 !w-1 !h-1 !min-w-0 !min-h-0 !-bottom-px" />
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors flex items-center justify-center">
          <ServiceTypeIcon serviceType={service.serviceType} templateDeploymentId={service.templateDeploymentId} dockerImage={service.dockerImage} serviceName={service.name} className="w-4 h-4 text-gray-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{service.name}</h3>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${displayStatus.dotClass}`}></div>
          </div>
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {service.templateDeploymentId ? 'Template' : service.serviceType === 'GITHUB' ? service.repositoryBranch || 'main' : service.dockerImage || 'docker'}
          </p>
        </div>
      </div>
      {/* Public URL */}
      {shortUrl && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <a
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:underline"
          >
            <LinkIcon className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{shortUrl}</span>
          </a>
        </div>
      )}
      {/* Volumes */}
      {volumes.length > 0 && (
        <div className={`mt-2 pt-2 border-t border-gray-100 ${shortUrl ? '' : ''}`}>
          <div className="flex flex-wrap gap-1.5">
            {volumes.map((volume: any) => (
              <div key={volume.id} className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-medium" title={`${volume.name} (${volume.size}) → ${volume.mountPath}`}>
                <VolumeIcon className="w-3 h-3" />
                <span className="truncate max-w-[80px]">{volume.size}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface GroupNodeData {
  label: string;
  serviceCount: number;
  width: number;
  height: number;
  [key: string]: unknown;
}

function GroupNode({ data }: NodeProps<Node<GroupNodeData>>) {
  return (
    <div
      className="bg-gradient-to-br from-slate-50/90 to-gray-100/90 border-2 border-dashed border-slate-300 rounded-2xl"
      style={{ width: data.width, height: data.height }}
    >
      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-slate-200/50">
        <TemplateIcon className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-semibold text-slate-700">{data.label}</span>
        <span className="text-xs text-slate-400 ml-auto">{data.serviceCount} services</span>
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  serviceNode: ServiceNode,
  groupNode: GroupNode,
};

interface ServiceCanvasProps {
  projectId: string;
  services: any[];
  onServiceSelect: (serviceId: string) => void;
  onServicesDeleted?: () => void; // Callback to refresh services after deletion
}

function getBestHandles(sourcePos: { x: number; y: number }, targetPos: { x: number; y: number }): { sourceHandle: string; targetHandle: string } {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? { sourceHandle: 'source-right', targetHandle: 'target-left' } : { sourceHandle: 'source-left', targetHandle: 'target-right' };
  }
  return dy >= 0 ? { sourceHandle: 'source-bottom', targetHandle: 'target-top' } : { sourceHandle: 'source-top', targetHandle: 'target-bottom' };
}

const GROUP_PADDING = 24;
const GROUP_HEADER_HEIGHT = 44;
const SERVICE_NODE_WIDTH = 220;
const SERVICE_NODE_HEIGHT = 140; // Increased to account for URL and volumes
const ITEM_GAP_X = 260;
const ITEM_GAP_Y = 160;
const START_X = 50;
const START_Y = 50;

function inferGroupName(services: any[], templateDeploymentId: string): string {
  // Extract instance suffix from template deployment ID (first 6 chars)
  const suffix = templateDeploymentId.slice(0, 6);

  for (const svc of services) {
    const name = (svc.dockerImage || svc.name || '').toLowerCase();
    if (name.includes('wordpress')) return `WordPress #${suffix}`;
    if (name.includes('ghost')) return `Ghost #${suffix}`;
    if (name.includes('n8n')) return `n8n #${suffix}`;
    if (name.includes('prefect')) return `Prefect #${suffix}`;
    if (name.includes('directus')) return `Directus #${suffix}`;
  }
  return `Template #${suffix}`;
}

// LocalStorage for group positions
function getGroupPositions(projectId: string): Record<string, { x: number; y: number }> {
  try {
    return JSON.parse(localStorage.getItem(`kubidu-groups-${projectId}`) || '{}');
  } catch {
    return {};
  }
}

function saveGroupPosition(projectId: string, groupId: string, pos: { x: number; y: number }) {
  try {
    const positions = getGroupPositions(projectId);
    positions[groupId] = pos;
    localStorage.setItem(`kubidu-groups-${projectId}`, JSON.stringify(positions));
  } catch {}
}

// LocalStorage for custom group names
function getGroupNames(projectId: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(`kubidu-group-names-${projectId}`) || '{}');
  } catch {
    return {};
  }
}

function saveGroupName(projectId: string, groupId: string, name: string) {
  try {
    const names = getGroupNames(projectId);
    names[groupId] = name;
    localStorage.setItem(`kubidu-group-names-${projectId}`, JSON.stringify(names));
  } catch {}
}

function deleteGroupName(projectId: string, groupId: string) {
  try {
    const names = getGroupNames(projectId);
    delete names[groupId];
    localStorage.setItem(`kubidu-group-names-${projectId}`, JSON.stringify(names));
  } catch {}
}

export function ServiceCanvas({ projectId, services, onServiceSelect, onServicesDeleted }: ServiceCanvasProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [customGroupNames, setCustomGroupNames] = useState<Record<string, string>>(() => getGroupNames(projectId));
  const menuRef = useRef<HTMLDivElement>(null);

  // Helper to get group name (custom or inferred)
  const getGroupLabel = useCallback((groupId: string, groupServices: any[], templateDeploymentId: string) => {
    return customGroupNames[groupId] || inferGroupName(groupServices, templateDeploymentId);
  }, [customGroupNames]);

  // Build a map of group IDs to their service IDs for group deletion
  const groupServiceMap = useMemo(() => {
    const map = new Map<string, { serviceIds: string[]; groupName: string }>();
    const groups = new Map<string, any[]>();

    for (const svc of services) {
      if (svc.templateDeploymentId) {
        const list = groups.get(svc.templateDeploymentId) || [];
        list.push(svc);
        groups.set(svc.templateDeploymentId, list);
      }
    }

    groups.forEach((groupServices, templateDeploymentId) => {
      const groupId = `group-${templateDeploymentId}`;
      map.set(groupId, {
        serviceIds: groupServices.map((s: any) => s.id),
        groupName: getGroupLabel(groupId, groupServices, templateDeploymentId),
      });
    });

    return map;
  }, [services, getGroupLabel]);

  const nodes = useMemo(() => {
    const result: Node[] = [];
    const groupPositions = getGroupPositions(projectId);

    // Separate template groups and standalone services
    const groups = new Map<string, any[]>();
    const standalone: any[] = [];

    for (const svc of services) {
      if (svc.templateDeploymentId) {
        const list = groups.get(svc.templateDeploymentId) || [];
        list.push(svc);
        groups.set(svc.templateDeploymentId, list);
      } else {
        standalone.push(svc);
      }
    }

    let nextY = START_Y;

    // Create group nodes with their children
    groups.forEach((groupServices, templateDeploymentId) => {
      const groupId = `group-${templateDeploymentId}`;
      const cols = Math.min(groupServices.length, 2);
      const rows = Math.ceil(groupServices.length / 2);
      const width = GROUP_PADDING * 2 + (cols - 1) * ITEM_GAP_X + SERVICE_NODE_WIDTH;
      const height = GROUP_HEADER_HEIGHT + GROUP_PADDING * 2 + (rows - 1) * ITEM_GAP_Y + SERVICE_NODE_HEIGHT;

      // Use saved position or auto-layout
      const savedPos = groupPositions[groupId];
      const groupX = savedPos?.x ?? START_X;
      const groupY = savedPos?.y ?? nextY;

      // Save position if new
      if (!savedPos) {
        saveGroupPosition(projectId, groupId, { x: groupX, y: groupY });
      }

      result.push({
        id: groupId,
        type: 'groupNode',
        position: { x: groupX, y: groupY },
        style: { width, height },
        zIndex: -1,
        draggable: true,
        selectable: false,
        data: { label: getGroupLabel(groupId, groupServices, templateDeploymentId), serviceCount: groupServices.length, width, height },
      });

      // Add child service nodes
      groupServices.forEach((svc: any, idx: number) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        result.push({
          id: svc.id,
          type: 'serviceNode',
          parentId: groupId,
          extent: 'parent' as const,
          position: { x: GROUP_PADDING + col * ITEM_GAP_X, y: GROUP_HEADER_HEIGHT + GROUP_PADDING + row * ITEM_GAP_Y },
          data: { service: svc, onSelect: onServiceSelect },
        });
      });

      nextY += height + 50;
    });

    // Add standalone services
    standalone.forEach((svc: any, idx: number) => {
      const hasPos = svc.canvasX != null && svc.canvasY != null && !(svc.canvasX === 0 && svc.canvasY === 0 && idx > 0);
      const col = idx % 2;
      const row = Math.floor(idx / 2);

      result.push({
        id: svc.id,
        type: 'serviceNode',
        position: hasPos ? { x: svc.canvasX, y: svc.canvasY } : { x: START_X + col * ITEM_GAP_X, y: nextY + row * ITEM_GAP_Y },
        data: { service: svc, onSelect: onServiceSelect },
      });
    });

    return result;
  }, [services, onServiceSelect, projectId, getGroupLabel]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);

  // Update nodes when services change
  useMemo(() => {
    setFlowNodes(nodes);
  }, [nodes, setFlowNodes]);

  const edges = useMemo(() => {
    const positions = new Map(flowNodes.map(n => [n.id, n.position]));
    const result: Edge[] = [];
    const seen = new Set<string>();

    for (const svc of services) {
      for (const ref of svc.consumingReferences || []) {
        const key = `${svc.id}->${ref.sourceServiceId}`;
        if (!seen.has(key)) {
          seen.add(key);
          const srcPos = positions.get(svc.id);
          const tgtPos = positions.get(ref.sourceServiceId);
          const handles = srcPos && tgtPos ? getBestHandles(srcPos, tgtPos) : { sourceHandle: 'source-right', targetHandle: 'target-left' };
          result.push({
            id: key,
            source: svc.id,
            target: ref.sourceServiceId,
            ...handles,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#0d9488', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#0d9488' },
          });
        }
      }
    }
    return result;
  }, [services, flowNodes]);

  const onNodeDragStop: OnNodeDrag = useCallback((_event, node) => {
    if (node.id.startsWith('group-')) {
      saveGroupPosition(projectId, node.id, node.position);
    } else {
      apiService.updateService(projectId, node.id, { canvasX: node.position.x, canvasY: node.position.y }).catch(console.error);
    }
  }, [projectId]);

  // Handle right-click on nodes
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    event.stopPropagation();

    if (node.id.startsWith('group-')) {
      const groupInfo = groupServiceMap.get(node.id);
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: 'group',
        groupId: node.id,
        groupName: groupInfo?.groupName || 'Template',
        serviceIds: groupInfo?.serviceIds || [],
      });
    } else {
      const service = services.find(s => s.id === node.id);
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: 'service',
        serviceId: node.id,
        serviceName: service?.name || 'Service',
      });
    }
  }, [services, groupServiceMap]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as globalThis.Node)) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!contextMenu) return;

    const confirmMessage = contextMenu.type === 'group'
      ? `Delete "${contextMenu.groupName}" and all its ${contextMenu.serviceIds?.length || 0} services? This cannot be undone.`
      : `Delete "${contextMenu.serviceName}"? This cannot be undone.`;

    if (!window.confirm(confirmMessage)) {
      setContextMenu(null);
      return;
    }

    setIsDeleting(true);

    try {
      if (contextMenu.type === 'group' && contextMenu.serviceIds && contextMenu.serviceIds.length > 0) {
        // Batch delete all services in a single API call
        await apiService.deleteServices(projectId, contextMenu.serviceIds);
        // Remove group position and name from localStorage
        if (contextMenu.groupId) {
          const positions = getGroupPositions(projectId);
          delete positions[contextMenu.groupId];
          localStorage.setItem(`kubidu-groups-${projectId}`, JSON.stringify(positions));
          deleteGroupName(projectId, contextMenu.groupId);
          setCustomGroupNames(prev => {
            const next = { ...prev };
            delete next[contextMenu.groupId!];
            return next;
          });
        }
      } else if (contextMenu.serviceId) {
        await apiService.deleteService(projectId, contextMenu.serviceId);
      }

      setContextMenu(null);
      onServicesDeleted?.();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [contextMenu, projectId, onServicesDeleted]);

  // Handle rename group
  const handleRename = useCallback(() => {
    if (!contextMenu || contextMenu.type !== 'group' || !contextMenu.groupId) return;

    const currentName = contextMenu.groupName || '';
    const newName = window.prompt('Enter new group name:', currentName);

    if (newName && newName.trim() && newName !== currentName) {
      saveGroupName(projectId, contextMenu.groupId, newName.trim());
      setCustomGroupNames(prev => ({ ...prev, [contextMenu.groupId!]: newName.trim() }));
    }

    setContextMenu(null);
  }, [contextMenu, projectId]);

  // Close context menu on pane click, node click, or escape key
  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="h-full w-full bg-gray-50 relative">
      <ReactFlow
        nodes={flowNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={closeContextMenu}
        onNodeClick={closeContextMenu}
        onMove={closeContextMenu}
        nodeTypes={nodeTypes}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
        <Controls className="!scale-150 origin-bottom-left !left-5 !bottom-5" />
      </ReactFlow>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs text-gray-500">
              {contextMenu.type === 'group' ? 'Template Group' : 'Service'}
            </p>
            <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
              {contextMenu.type === 'group' ? contextMenu.groupName : contextMenu.serviceName}
            </p>
          </div>
          {/* Rename option for groups */}
          {contextMenu.type === 'group' && (
            <button
              onClick={handleRename}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Rename Group
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {isDeleting ? 'Deleting...' : contextMenu.type === 'group' ? 'Delete Group' : 'Delete Service'}
          </button>
        </div>
      )}
    </div>
  );
}
