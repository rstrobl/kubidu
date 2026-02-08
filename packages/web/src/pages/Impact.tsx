import { CO2Dashboard } from '../components/CO2Dashboard';
import { GreenBadge } from '../components/GreenBadge';

export function Impact() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl">🌍</span>
            Environmental Impact
          </h1>
          <p className="text-gray-500 mt-1">
            Track your sustainability metrics and share your commitment to green computing
          </p>
        </div>
        <GreenBadge co2Saved={36.8} />
      </div>

      {/* CO₂ Dashboard */}
      <CO2Dashboard />

      {/* Additional Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* About Our Green Infrastructure */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>🏭</span>
            Our Green Infrastructure
          </h2>
          <div className="space-y-4 text-sm text-gray-600">
            <p>
              Kubidu runs on <strong className="text-gray-900">Hetzner's Frankfurt data center</strong>, 
              which is powered by 100% renewable energy sources.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-0.5">✓</span>
                <span>Carbon-neutral data center operations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-0.5">✓</span>
                <span>Energy-efficient cooling systems</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-0.5">✓</span>
                <span>Optimized server utilization</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-0.5">✓</span>
                <span>EU-based (Frankfurt, Germany)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* How We Calculate */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>📊</span>
            How We Calculate Savings
          </h2>
          <div className="space-y-4 text-sm text-gray-600">
            <p>
              Our CO₂ calculations are based on publicly available data from cloud providers 
              and energy efficiency reports.
            </p>
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Methodology</h3>
              <ul className="space-y-1 text-xs">
                <li>• Traditional cloud: ~0.5 kg CO₂/kWh</li>
                <li>• Renewable energy: ~0.02 kg CO₂/kWh</li>
                <li>• Average server power: 300W/hour</li>
                <li>• 1 tree absorbs ~22kg CO₂/year</li>
              </ul>
            </div>
            <p className="text-xs text-gray-400">
              Sources: IEA, EPA, Cloud Carbon Footprint Project
            </p>
          </div>
        </div>
      </div>

      {/* Certifications */}
      <div className="bg-gradient-to-r from-primary-600 to-success-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">
              🏆 Our Sustainability Commitments
            </h2>
            <p className="text-primary-100">
              We're committed to reducing the environmental impact of cloud computing.
              Every deployment on Kubidu contributes to a greener future.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
              <div className="text-2xl mb-1">🌱</div>
              <div className="text-xs font-medium">100% Renewable</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
              <div className="text-2xl mb-1">🇪🇺</div>
              <div className="text-xs font-medium">EU Hosted</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
              <div className="text-2xl mb-1">🔒</div>
              <div className="text-xs font-medium">GDPR Ready</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
              <div className="text-2xl mb-1">📜</div>
              <div className="text-xs font-medium">ISO 27001</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
