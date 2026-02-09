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
            Umweltbilanz
          </h1>
          <p className="text-gray-500 mt-1">
            Verfolgen Sie Ihre Nachhaltigkeitskennzahlen und zeigen Sie Ihr Engagement für grünes Computing
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
            Unsere grüne Infrastruktur
          </h2>
          <div className="space-y-4 text-sm text-gray-600">
            <p>
              Kubidu läuft auf dem <strong className="text-gray-900">Hetzner-Rechenzentrum in Frankfurt</strong>, 
              das zu 100% mit erneuerbaren Energien betrieben wird.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-0.5">✓</span>
                <span>Klimaneutraler Rechenzentrumsbetrieb</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-0.5">✓</span>
                <span>Energieeffiziente Kühlsysteme</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-0.5">✓</span>
                <span>Optimierte Serverauslastung</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-0.5">✓</span>
                <span>EU-Standort (Frankfurt, Deutschland)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* How We Calculate */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>📊</span>
            So berechnen wir Ihre Einsparungen
          </h2>
          <div className="space-y-4 text-sm text-gray-600">
            <p>
              Unsere CO₂-Berechnungen basieren auf öffentlich zugänglichen Daten von Cloud-Anbietern 
              und Energieeffizienzberichten.
            </p>
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Methodik</h3>
              <ul className="space-y-1 text-xs">
                <li>• Traditionelle Cloud: ~0,5 kg CO₂/kWh</li>
                <li>• Erneuerbare Energie: ~0,02 kg CO₂/kWh</li>
                <li>• Durchschnittliche Serverleistung: 300W/Stunde</li>
                <li>• 1 Baum absorbiert ~22kg CO₂/Jahr</li>
              </ul>
            </div>
            <p className="text-xs text-gray-400">
              Quellen: IEA, EPA, Cloud Carbon Footprint Project
            </p>
          </div>
        </div>
      </div>

      {/* Certifications */}
      <div className="bg-gradient-to-r from-primary-600 to-success-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">
              🏆 Unsere Nachhaltigkeitsverpflichtungen
            </h2>
            <p className="text-primary-100">
              Wir setzen uns dafür ein, die Umweltauswirkungen des Cloud-Computings zu reduzieren.
              Jede Bereitstellung auf Kubidu trägt zu einer grüneren Zukunft bei.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
              <div className="text-2xl mb-1">🌱</div>
              <div className="text-xs font-medium">100% Erneuerbar</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
              <div className="text-2xl mb-1">🇪🇺</div>
              <div className="text-xs font-medium">EU-Standort</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
              <div className="text-2xl mb-1">🔒</div>
              <div className="text-xs font-medium">DSGVO-konform</div>
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
