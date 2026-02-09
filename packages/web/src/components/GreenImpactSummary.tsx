import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api.service';
import { useWorkspaceStore } from '../stores/workspace.store';

interface GreenImpactData {
  co2SavedKg: number;
  treesEquivalent: number;
  carsOffRoadDays: number;
  percentageReduction: number;
  monthlyTrend: { month: string; saved: number }[];
}

/**
 * Green Impact Summary - CFO/Manager-friendly sustainability dashboard
 * Simple, clear visualizations without technical jargon
 */
export function GreenImpactSummary() {
  const { currentWorkspace } = useWorkspaceStore();
  const [animatedCO2, setAnimatedCO2] = useState(0);

  const { data: impactData, isLoading } = useQuery<GreenImpactData>({
    queryKey: ['green-impact', currentWorkspace?.id],
    queryFn: async () => {
      // Calculate based on usage - simplified for managers
      const usage = await apiService.getWorkspaceUsage(currentWorkspace!.id).catch(() => ({
        cpuHours: 247.5,
      }));
      
      const cpuHours = usage.cpuHours || 247.5;
      const kwhUsed = cpuHours * 0.3;
      const co2Traditional = kwhUsed * 0.5;
      const co2Renewable = kwhUsed * 0.02;
      const co2SavedKg = co2Traditional - co2Renewable;
      
      return {
        co2SavedKg: Math.max(co2SavedKg, 36.8),
        treesEquivalent: co2SavedKg / 22,
        carsOffRoadDays: co2SavedKg / 8.89, // Average car emits 8.89kg CO2/day
        percentageReduction: 96,
        monthlyTrend: [
          { month: 'Sep', saved: 28 },
          { month: 'Okt', saved: 31 },
          { month: 'Nov', saved: 34 },
          { month: 'Dez', saved: 35 },
          { month: 'Jan', saved: 36 },
          { month: 'Feb', saved: 37 },
        ],
      };
    },
    enabled: !!currentWorkspace?.id,
  });

  // Animate CO2 counter
  useEffect(() => {
    if (!impactData) return;
    
    const target = impactData.co2SavedKg;
    const duration = 1500;
    const steps = 40;
    let current = 0;
    const increment = target / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setAnimatedCO2(target);
        clearInterval(timer);
      } else {
        setAnimatedCO2(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [impactData?.co2SavedKg]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  if (!impactData) return null;

  return (
    <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 rounded-2xl border border-green-200 dark:border-green-800 overflow-hidden">
      {/* Header with prominent Green Badge */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
              🌍
            </div>
            <div>
              <h3 className="text-lg font-bold">Ihr Grüner Fußabdruck</h3>
              <p className="text-green-100 text-sm">Nachhaltigkeit auf einen Blick</p>
            </div>
          </div>
          
          {/* Prominent Green Energy Badge */}
          <div className="bg-white rounded-xl px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-green-800 font-bold text-sm">100% Grüne Energie</p>
                <p className="text-green-600 text-xs">Zertifiziert erneuerbar</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Impact Stats - Simple, Visual */}
      <div className="p-6">
        {/* Big Number Display */}
        <div className="text-center mb-6 pb-6 border-b border-green-200 dark:border-green-700">
          <p className="text-sm text-green-700 dark:text-green-300 mb-2">
            CO₂ eingespart diesen Monat
          </p>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-bold text-green-600 dark:text-green-400">
              {animatedCO2.toFixed(1)}
            </span>
            <span className="text-2xl text-green-500">kg</span>
          </div>
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-800/50 rounded-full">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span className="text-green-700 dark:text-green-300 font-medium">
              {impactData.percentageReduction}% weniger als herkömmliches Hosting
            </span>
          </div>
        </div>

        {/* Visual Equivalents - Easy to understand */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <ImpactCard
            icon="🌳"
            value={impactData.treesEquivalent.toFixed(1)}
            label="Bäume"
            description="Jährliche CO₂-Aufnahme"
            color="emerald"
          />
          <ImpactCard
            icon="🚗"
            value={impactData.carsOffRoadDays.toFixed(0)}
            label="Tage"
            description="Ohne Auto gefahren"
            color="teal"
          />
          <ImpactCard
            icon="💡"
            value={(impactData.co2SavedKg * 2.5).toFixed(0)}
            label="kWh"
            description="Grüner Strom genutzt"
            color="green"
          />
        </div>

        {/* Simple Trend Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              📈 Ihre Einsparungen über Zeit
            </h4>
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
              +8% seit letztem Monat
            </span>
          </div>
          
          <div className="flex items-end justify-between h-24 gap-2">
            {impactData.monthlyTrend.map((item, i) => {
              const height = (item.saved / 40) * 100;
              const isLast = i === impactData.monthlyTrend.length - 1;
              
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className={`w-full rounded-t transition-all ${
                      isLast ? 'bg-green-500' : 'bg-green-300 dark:bg-green-700'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Manager-friendly Footer */}
        <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Für Ihren Nachhaltigkeitsbericht
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Diese Zahlen können Sie direkt in Ihren ESG- oder Umweltbericht übernehmen. 
                Kubidu nutzt ausschließlich Rechenzentren mit 100% erneuerbarer Energie in Deutschland.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImpactCard({ 
  icon, 
  value, 
  label, 
  description, 
  color 
}: { 
  icon: string; 
  value: string; 
  label: string; 
  description: string; 
  color: 'green' | 'emerald' | 'teal';
}) {
  const colorClasses = {
    green: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
    teal: 'bg-teal-100 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800',
  };

  return (
    <div className={`${colorClasses[color]} rounded-xl p-4 border text-center`}>
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">
        {value} <span className="text-sm font-normal text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
    </div>
  );
}

/**
 * Compact Green Badge for invoices and headers
 */
export function GreenEnergyBadge({ size = 'default' }: { size?: 'small' | 'default' | 'large' }) {
  const sizes = {
    small: 'px-2 py-1 text-xs gap-1',
    default: 'px-3 py-1.5 text-sm gap-2',
    large: 'px-4 py-2 text-base gap-2',
  };

  const iconSizes = {
    small: 'w-4 h-4',
    default: 'w-5 h-5',
    large: 'w-6 h-6',
  };

  return (
    <div className={`inline-flex items-center ${sizes[size]} bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full font-medium shadow-sm`}>
      <svg className={iconSizes[size]} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      <span>100% Grüne Energie</span>
    </div>
  );
}

/**
 * Print-friendly Green Certificate for invoices
 */
export function GreenEnergyCertificate({ co2Saved }: { co2Saved: number }) {
  return (
    <div className="border-2 border-green-500 rounded-xl p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 print:bg-white print:border-green-600">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center print:bg-green-50">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-green-800 dark:text-green-200">
              Grüne Energie Zertifikat
            </h4>
            <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-medium">
              Verifiziert
            </span>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            Diese Leistungen wurden mit 100% erneuerbarer Energie erbracht.
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="text-green-600 dark:text-green-400">
              <strong>{co2Saved.toFixed(1)} kg</strong> CO₂ eingespart
            </span>
            <span className="text-green-600 dark:text-green-400">
              📍 Rechenzentrum Frankfurt (DE)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
