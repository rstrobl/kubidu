import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DependencyGraph } from '../components/DependencyGraph';
import { apiService } from '../services/api.service';

interface Service {
  id: string;
  name: string;
  serviceType: 'GITHUB' | 'DOCKER_IMAGE';
  status: string;
}

interface EnvVarReference {
  id: string;
  serviceId: string;
  sourceServiceId: string;
  key: string;
  alias?: string;
}

export function Dependencies() {
  const { id: projectId } = useParams<{ id: string }>();
  const [services, setServices] = useState<Service[]>([]);
  const [references, setReferences] = useState<EnvVarReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [impactAnalysis, setImpactAnalysis] = useState<{
    affectedServices: string[];
    cascadeLevel: number;
  } | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const servicesRes = await apiService.getServices(projectId);
        setServices(servicesRes);

        // Collect all references
        const allRefs: EnvVarReference[] = [];
        for (const service of servicesRes) {
          try {
            const refs = await apiService.getEnvVarReferences(service.id);
            allRefs.push(...refs);
          } catch (e) {
            // Service might not have references
          }
        }
        setReferences(allRefs);
      } catch (error) {
        console.error('Failed to fetch dependencies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  // Transform data for the graph
  const graphNodes = services.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.serviceType === 'GITHUB' ? 'github' : 'docker' as 'github' | 'docker',
    status: mapStatus(s.status),
  }));

  // Group references by edge (from -> to)
  const edgeMap = new Map<string, string[]>();
  references.forEach((ref) => {
    const key = `${ref.serviceId}:${ref.sourceServiceId}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, []);
    }
    edgeMap.get(key)!.push(ref.key);
  });

  const graphEdges = Array.from(edgeMap.entries()).map(([key, variables]) => {
    const [from, to] = key.split(':');
    return { from, to, variables };
  });

  // Calculate impact analysis when a service is selected
  useEffect(() => {
    if (!selectedService) {
      setImpactAnalysis(null);
      return;
    }

    // Find all services that would be affected if this service goes down
    const affected = new Set<string>();
    const queue = [selectedService];
    let level = 0;

    while (queue.length > 0 && level < 10) {
      const current = queue.shift()!;
      
      // Find services that depend on current
      references
        .filter((r) => r.sourceServiceId === current)
        .forEach((r) => {
          if (!affected.has(r.serviceId) && r.serviceId !== selectedService) {
            affected.add(r.serviceId);
            queue.push(r.serviceId);
          }
        });
      
      level++;
    }

    setImpactAnalysis({
      affectedServices: Array.from(affected),
      cascadeLevel: Math.min(level, affected.size),
    });
  }, [selectedService, references]);

  function mapStatus(status: string): 'running' | 'stopped' | 'building' | 'failed' {
    const statusMap: Record<string, 'running' | 'stopped' | 'building' | 'failed'> = {
      ACTIVE: 'running',
      RUNNING: 'running',
      BUILDING: 'building',
      DEPLOYING: 'building',
      PENDING: 'building',
      STOPPED: 'stopped',
      INACTIVE: 'stopped',
      FAILED: 'failed',
      CRASHED: 'failed',
    };
    return statusMap[status] || 'stopped';
  }

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Project not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to={`/projects/${projectId}`} className="hover:text-primary-600">
              ← Back to Project
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl">🔗</span>
            Service Dependencies
          </h1>
          <p className="text-gray-500 mt-1">
            Visualize how your services are connected through environment variables
          </p>
        </div>
        {selectedService && (
          <button
            onClick={() => setSelectedService(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="text-3xl mb-2">⚙️</div>
          <div className="text-2xl font-bold text-gray-900">{services.length}</div>
          <div className="text-sm text-gray-500">Services</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="text-3xl mb-2">🔗</div>
          <div className="text-2xl font-bold text-primary-600">{graphEdges.length}</div>
          <div className="text-sm text-gray-500">Connections</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="text-3xl mb-2">🔐</div>
          <div className="text-2xl font-bold text-gray-900">{references.length}</div>
          <div className="text-sm text-gray-500">Shared Variables</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="text-3xl mb-2">
            {services.filter((s) => mapStatus(s.status) === 'running').length === services.length
              ? '✅'
              : '⚠️'}
          </div>
          <div className="text-2xl font-bold text-success-600">
            {services.filter((s) => mapStatus(s.status) === 'running').length}/{services.length}
          </div>
          <div className="text-sm text-gray-500">Healthy</div>
        </div>
      </div>

      {/* Impact Analysis Banner */}
      {impactAnalysis && impactAnalysis.affectedServices.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
          <h3 className="font-semibold text-yellow-900 flex items-center gap-2 mb-2">
            <span>⚡</span>
            Impact Analysis
          </h3>
          <p className="text-yellow-800 text-sm mb-3">
            If <strong>{services.find((s) => s.id === selectedService)?.name}</strong> goes down,{' '}
            <strong>{impactAnalysis.affectedServices.length}</strong> service
            {impactAnalysis.affectedServices.length !== 1 ? 's' : ''} would be affected:
          </p>
          <div className="flex flex-wrap gap-2">
            {impactAnalysis.affectedServices.map((serviceId) => (
              <span
                key={serviceId}
                className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full"
              >
                ⚙️ {services.find((s) => s.id === serviceId)?.name || 'Unknown'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dependency Graph */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>🗺️</span>
          Dependency Map
        </h2>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : (
          <DependencyGraph
            services={graphNodes}
            dependencies={graphEdges}
            onNodeClick={setSelectedService}
            selectedServiceId={selectedService || undefined}
          />
        )}
      </div>

      {/* Reference List */}
      {references.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>📋</span>
            All References ({references.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">Consumer</th>
                  <th className="pb-3 font-medium">Variable</th>
                  <th className="pb-3 font-medium">Provider</th>
                  <th className="pb-3 font-medium">Alias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {references.map((ref) => (
                  <tr key={ref.id} className="hover:bg-gray-50">
                    <td className="py-3">
                      <span className="font-medium text-gray-900">
                        {services.find((s) => s.id === ref.serviceId)?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-3">
                      <code className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                        {ref.key}
                      </code>
                    </td>
                    <td className="py-3">
                      <span className="text-gray-600">
                        → {services.find((s) => s.id === ref.sourceServiceId)?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-3">
                      {ref.alias ? (
                        <code className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs">
                          {ref.alias}
                        </code>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span>💡</span>
          Understanding Dependencies
        </h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Arrows show data flow</h3>
            <p className="text-gray-600">
              An arrow from A → B means service A uses environment variables from service B
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Impact analysis</h3>
            <p className="text-gray-600">
              Click a service to see what would happen if it goes down or changes
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Circular dependencies</h3>
            <p className="text-gray-600">
              Avoid services that depend on each other - it makes deployments complex
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
