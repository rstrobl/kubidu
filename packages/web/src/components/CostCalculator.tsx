import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api.service';
import { useWorkspaceStore } from '../stores/workspace.store';

interface ServiceCost {
  serviceId: string;
  serviceName: string;
  cpuCores: number;
  memoryGB: number;
  storageGB: number;
  cpuCost: number;
  memoryCost: number;
  storageCost: number;
  totalCost: number;
}

interface CostBreakdown {
  workspace: {
    id: string;
    name: string;
    plan: string;
  };
  billing: {
    basePrice: number;
    resourceCosts: number;
    totalEstimate: number;
    currency: string;
  };
  usage: {
    totalServices: number;
    includedServices: number;
    totalDeployments: number;
    includedDeployments: number;
    totalCpuCores: number;
    totalMemoryGB: number;
    totalStorageGB: number;
  };
  services: ServiceCost[];
  recommendations: string[];
  upsell?: {
    plan: string;
    potentialSavings: number;
    message: string;
  };
}

export function CostCalculator() {
  const { currentWorkspace } = useWorkspaceStore();
  const [showDetails, setShowDetails] = useState(false);

  const { data: costData, isLoading, error } = useQuery<CostBreakdown>({
    queryKey: ['workspace-cost', currentWorkspace?.id],
    queryFn: () => apiService.getWorkspaceCost(currentWorkspace!.id),
    enabled: !!currentWorkspace?.id,
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
          <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (error || !costData) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          Failed to load cost data
        </div>
      </div>
    );
  }

  const planColors: Record<string, string> = {
    Free: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    Starter: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    Pro: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    Enterprise: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            💰 Cost Estimate
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Based on current usage
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${planColors[costData.workspace.plan] || planColors.Free}`}>
          {costData.workspace.plan} Plan
        </span>
      </div>

      {/* Main Cost Display */}
      <div className="p-6">
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Estimated Monthly Cost</p>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">
              ${costData.billing.totalEstimate.toFixed(2)}
            </span>
            <span className="text-gray-500 dark:text-gray-400">/mo</span>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Base Price</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              ${costData.billing.basePrice.toFixed(2)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Resource Usage</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              ${costData.billing.resourceCosts.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Services</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {costData.usage.totalServices}
              {costData.usage.includedServices > 0 && (
                <span className="text-gray-400 dark:text-gray-500">
                  /{costData.usage.includedServices === -1 ? '∞' : costData.usage.includedServices} included
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">CPU Cores</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {costData.usage.totalCpuCores.toFixed(2)} vCPU
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Memory</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {costData.usage.totalMemoryGB.toFixed(2)} GB
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Storage</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {costData.usage.totalStorageGB.toFixed(2)} GB
            </span>
          </div>
        </div>

        {/* Toggle Details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full py-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center justify-center gap-1"
        >
          {showDetails ? 'Hide' : 'Show'} Service Breakdown
          <svg
            className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Service Details */}
        {showDetails && costData.services.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-4">
            {costData.services.map((service) => (
              <div
                key={service.serviceId}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {service.serviceName}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    ${service.totalCost.toFixed(2)}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {service.cpuCores} CPU • {service.memoryGB}GB RAM
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {costData.recommendations.length > 0 && (
          <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
              💡 Recommendations
            </p>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              {costData.recommendations.map((rec, i) => (
                <li key={i}>• {rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Upsell */}
        {costData.upsell && (
          <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 border border-primary-200 dark:border-primary-800">
            <p className="text-sm font-medium text-primary-800 dark:text-primary-200 mb-1">
              🚀 Upgrade to {costData.upsell.plan}
            </p>
            <p className="text-sm text-primary-700 dark:text-primary-300 mb-3">
              {costData.upsell.message}
            </p>
            <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors">
              View Plans
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact version for sidebar/dashboard
export function CostWidget() {
  const { currentWorkspace } = useWorkspaceStore();

  const { data: costData, isLoading } = useQuery<CostBreakdown>({
    queryKey: ['workspace-cost', currentWorkspace?.id],
    queryFn: () => apiService.getWorkspaceCost(currentWorkspace!.id),
    enabled: !!currentWorkspace?.id,
    staleTime: 60000,
  });

  if (isLoading || !costData) {
    return (
      <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
      <p className="text-xs text-green-700 dark:text-green-300 mb-1">Est. Monthly Cost</p>
      <p className="text-lg font-bold text-green-800 dark:text-green-200">
        ${costData.billing.totalEstimate.toFixed(2)}
        <span className="text-xs font-normal text-green-600 dark:text-green-400 ml-1">
          {costData.workspace.plan}
        </span>
      </p>
    </div>
  );
}
