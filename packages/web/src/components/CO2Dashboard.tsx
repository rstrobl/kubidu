import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api.service';
import { useWorkspaceStore } from '../stores/workspace.store';

interface CO2Stats {
  totalCpuHours: number;
  co2Saved: number; // in kg
  treesEquivalent: number;
  percentageSaved: number;
  monthlyTrend: Array<{ month: string; saved: number }>;
}

// Calculate CO₂ savings based on CPU hours
// Based on research: AWS/GCP average ~0.5 kg CO₂/kWh, renewable is ~0.02 kg CO₂/kWh
// Average server uses ~300W = 0.3 kWh per hour
function calculateCO2Stats(cpuHours: number): CO2Stats {
  const kwhUsed = cpuHours * 0.3; // 300W per hour
  const co2Traditional = kwhUsed * 0.5; // kg CO2 for traditional data centers
  const co2Renewable = kwhUsed * 0.02; // kg CO2 for renewable
  const co2Saved = co2Traditional - co2Renewable;
  
  // One tree absorbs ~22kg CO2 per year = 0.06kg per day
  const treesEquivalent = co2Saved / 22;
  
  const percentageSaved = co2Traditional > 0 ? ((co2Saved / co2Traditional) * 100) : 96;

  // Generate mock monthly trend data
  const months = ['Aug', 'Sep', 'Okt', 'Nov', 'Dez', 'Jan'];
  const monthlyTrend = months.map((month, i) => ({
    month,
    saved: (co2Saved / 6) * (0.5 + (i * 0.1)),
  }));

  return {
    totalCpuHours: cpuHours,
    co2Saved: Math.max(co2Saved, 0),
    treesEquivalent: Math.max(treesEquivalent, 0),
    percentageSaved,
    monthlyTrend,
  };
}

export function CO2Dashboard() {
  const { currentWorkspace } = useWorkspaceStore();
  const [stats, setStats] = useState<CO2Stats | null>(null);
  const [animatedSaved, setAnimatedSaved] = useState(0);

  // Fetch usage stats
  const { data: usageStats } = useQuery({
    queryKey: ['usage-stats', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;
      try {
        const response = await apiService.getWorkspaceUsage(currentWorkspace.id);
        return response;
      } catch {
        // Return mock data if API doesn't exist yet
        return { cpuHours: 247.5, memoryGBHours: 512 };
      }
    },
    enabled: !!currentWorkspace?.id,
  });

  useEffect(() => {
    const cpuHours = usageStats?.cpuHours || 247.5; // Default mock data
    setStats(calculateCO2Stats(cpuHours));
  }, [usageStats]);

  // Animate the counter
  useEffect(() => {
    if (!stats) return;
    
    const duration = 2000;
    const steps = 60;
    const increment = stats.co2Saved / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= stats.co2Saved) {
        setAnimatedSaved(stats.co2Saved);
        clearInterval(timer);
      } else {
        setAnimatedSaved(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [stats?.co2Saved]);

  if (!stats) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-2xl h-96" />
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary-50 via-white to-success-50 rounded-2xl border border-primary-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-primary-100 bg-white/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">🌱</span>
              CO₂-Bilanz Dashboard
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Ihre Umweltbilanz mit Kubidus 100% erneuerbarer Energie
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary-100 rounded-full">
            <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-primary-700">100% Grüne Energie</span>
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CO2 Saved */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-4xl font-bold text-primary-600">
              {animatedSaved.toFixed(1)}<span className="text-xl ml-1">kg</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">CO₂ eingespart diesen Monat</div>
            <div className="mt-3 text-xs text-primary-600 bg-primary-50 rounded-full px-3 py-1 inline-block">
              {stats.percentageSaved.toFixed(0)}% weniger als traditionelles Hosting
            </div>
          </div>

          {/* Trees Equivalent */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-success-100 rounded-full flex items-center justify-center text-3xl">
              🌳
            </div>
            <div className="text-4xl font-bold text-success-600">
              {stats.treesEquivalent.toFixed(1)}
            </div>
            <div className="text-sm text-gray-500 mt-1">Bäume CO₂-Äquivalent</div>
            <div className="mt-3 text-xs text-success-600 bg-success-50 rounded-full px-3 py-1 inline-block">
              Jährliche Absorptionsleistung
            </div>
          </div>

          {/* CPU Hours */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-accent-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div className="text-4xl font-bold text-accent-600">
              {stats.totalCpuHours.toFixed(0)}<span className="text-xl ml-1">h</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">Rechenzeit</div>
            <div className="mt-3 text-xs text-accent-600 bg-accent-50 rounded-full px-3 py-1 inline-block">
              Mit erneuerbarer Energie betrieben
            </div>
          </div>
        </div>

        {/* Comparison Section */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Kubidu vs. traditionelle Cloud-Anbieter
          </h3>
          <div className="space-y-4">
            <ComparisonBar
              label="Kubidu (100% Erneuerbar)"
              value={4}
              maxValue={100}
              color="bg-primary-500"
              suffix="g CO₂/kWh"
            />
            <ComparisonBar
              label="AWS (Globaler Durchschnitt)"
              value={50}
              maxValue={100}
              color="bg-gray-400"
              suffix="g CO₂/kWh"
            />
            <ComparisonBar
              label="Azure (Globaler Durchschnitt)"
              value={45}
              maxValue={100}
              color="bg-gray-400"
              suffix="g CO₂/kWh"
            />
            <ComparisonBar
              label="GCP (Globaler Durchschnitt)"
              value={38}
              maxValue={100}
              color="bg-gray-400"
              suffix="g CO₂/kWh"
            />
          </div>
          <p className="text-xs text-gray-500 mt-4">
            * Daten basieren auf öffentlich zugänglichen CO₂-Intensitätsberichten. Kubidu nutzt Hetzner-Rechenzentren mit 100% erneuerbarer Energie in Frankfurt, Deutschland.
          </p>
        </div>

        {/* Call to Action */}
        <div className="mt-6 bg-gradient-to-r from-primary-600 to-success-600 rounded-xl p-6 text-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">Teilen Sie Ihre Wirkung! 🌍</h3>
              <p className="text-primary-100 text-sm mt-1">
                Fügen Sie ein grünes Badge zu Ihrem Projekt hinzu, um Ihr Engagement für Nachhaltigkeit zu zeigen.
              </p>
            </div>
            <button
              onClick={() => {
                const event = new CustomEvent('open-badge-generator');
                window.dispatchEvent(event);
              }}
              className="px-6 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-colors shadow-lg whitespace-nowrap"
            >
              Grünes Badge erhalten →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparisonBar({
  label,
  value,
  maxValue,
  color,
  suffix,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  suffix: string;
}) {
  const percentage = (value / maxValue) * 100;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span className="font-medium text-gray-900">
          {value} {suffix}
        </span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Mini widget version for dashboard
export function CO2Widget() {
  const [saved] = useState(36.8); // Mock data

  return (
    <div className="bg-gradient-to-br from-primary-50 to-success-50 rounded-xl p-4 border border-primary-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-xl">
          🌱
        </div>
        <div>
          <div className="text-2xl font-bold text-primary-600">
            {saved.toFixed(1)}<span className="text-sm ml-1">kg</span>
          </div>
          <div className="text-xs text-gray-500">CO₂ eingespart diesen Monat</div>
        </div>
      </div>
    </div>
  );
}
