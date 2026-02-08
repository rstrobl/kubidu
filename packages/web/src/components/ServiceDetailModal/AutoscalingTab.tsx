import { useState, useEffect } from 'react';
import { Service } from './types';

interface AutoscalingTabProps {
  service: Service;
  editedService: Partial<Service>;
  isLoading: boolean;
  onEditedServiceChange: (updates: Partial<Service>) => void;
  onUpdateService: () => void;
}

export function AutoscalingTab({
  service,
  editedService,
  isLoading,
  onEditedServiceChange,
  onUpdateService,
}: AutoscalingTabProps) {
  const enabled = editedService.autoscalingEnabled ?? service.autoscalingEnabled ?? false;
  const minReplicas = editedService.autoscalingMinReplicas ?? service.autoscalingMinReplicas ?? 1;
  const maxReplicas = editedService.autoscalingMaxReplicas ?? service.autoscalingMaxReplicas ?? 10;
  const targetCPU = editedService.autoscalingTargetCPU ?? service.autoscalingTargetCPU ?? 70;
  const targetMemory = editedService.autoscalingTargetMemory ?? service.autoscalingTargetMemory;
  const useMemoryScaling = !!targetMemory;

  const currentReplicas = service.defaultReplicas || 1;

  const handleChange = (updates: Partial<Service>) => {
    onEditedServiceChange(updates);
  };

  return (
    <div className="space-y-6">
      {/* Header with toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Horizontal Pod Autoscaling
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Automatically scale replicas based on resource usage
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleChange({ autoscalingEnabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-600"></div>
          <span className="ml-3 text-sm font-medium text-gray-700">
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      </div>

      {/* Current Status */}
      <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-primary-700">Current Replicas</span>
            <p className="text-xs text-primary-500 mt-0.5">Active pods running your service</p>
          </div>
          <span className="text-3xl font-bold text-primary-600">{currentReplicas}</span>
        </div>
      </div>

      {/* Configuration */}
      <div className={`space-y-6 transition-opacity ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Replica Range */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Replica Range
          </h4>
          <div className="grid grid-cols-2 gap-6">
            {/* Min Replicas */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Minimum: <span className="font-semibold text-primary-600">{minReplicas}</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={minReplicas}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  handleChange({ 
                    autoscalingMinReplicas: val,
                    autoscalingMaxReplicas: val > maxReplicas ? val : maxReplicas
                  });
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1</span>
                <span>10</span>
              </div>
            </div>

            {/* Max Replicas */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Maximum: <span className="font-semibold text-primary-600">{maxReplicas}</span>
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={maxReplicas}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  handleChange({
                    autoscalingMaxReplicas: val,
                    autoscalingMinReplicas: val < minReplicas ? val : minReplicas
                  });
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1</span>
                <span>20</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scaling Triggers */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Scaling Triggers
          </h4>
          
          {/* CPU Target */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-600">Target CPU Utilization</label>
              <span className="text-sm font-semibold text-primary-600">{targetCPU}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="90"
              step="5"
              value={targetCPU}
              onChange={(e) => handleChange({ autoscalingTargetCPU: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <p className="text-xs text-gray-400 mt-1">
              Scale up when CPU exceeds {targetCPU}%, scale down when below
            </p>
          </div>

          {/* Memory Target (optional) */}
          <div className="pt-4 border-t border-gray-100">
            <label className="flex items-center mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useMemoryScaling}
                onChange={(e) => handleChange({ 
                  autoscalingTargetMemory: e.target.checked ? 80 : undefined 
                })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-600">Also scale based on memory usage</span>
            </label>
            
            {useMemoryScaling && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-600">Target Memory Utilization</label>
                  <span className="text-sm font-semibold text-primary-600">{targetMemory}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="95"
                  step="5"
                  value={targetMemory || 80}
                  onChange={(e) => handleChange({ autoscalingTargetMemory: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <div className="flex">
            <svg className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-primary-700">
              <p className="font-medium">How Horizontal Pod Autoscaling works</p>
              <p className="mt-1">
                Kubernetes monitors your service's resource usage every 15 seconds. When average usage 
                exceeds the target, new replicas are added (up to max). When usage drops significantly 
                below the target, replicas are removed (down to min). This typically happens within 30-60 seconds.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-100">
        <button
          onClick={onUpdateService}
          disabled={isLoading}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
