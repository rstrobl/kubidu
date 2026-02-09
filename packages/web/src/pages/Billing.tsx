import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api.service';
import { useWorkspaceStore } from '../stores/workspace.store';
import { CostCalculator } from '../components/CostCalculator';
import { GreenImpactSummary, GreenEnergyBadge } from '../components/GreenImpactSummary';
import { InvoiceView, InvoiceList, DEMO_INVOICES, Invoice } from '../components/InvoiceView';

// Fallback demo invoices if API returns empty

// Usage-based Pricing: Kunde zahlt was er nutzt. Unbegrenzte Projekte & Services.
const PLANS = [
  {
    name: 'Hobby',
    price: 0,
    description: 'Für Studenten & Side Projects',
    features: [
      'Unbegrenzte Projekte & Services',
      '8 vCPU / 8 GB RAM pro Service',
      '1 GB Storage',
      '100 Build Minutes/Monat',
      'Community Support',
      '🌱 100% Green Energy',
    ],
    cta: 'Aktueller Plan',
    popular: false,
  },
  {
    name: 'Pro',
    price: 5,
    description: 'Für Indie Devs & Freelancer',
    features: [
      'Unbegrenzte Projekte & Services',
      '32 vCPU / 32 GB RAM pro Service',
      '10 GB Storage',
      '500 Build Minutes/Monat',
      'Email Support (48h)',
      '5 Custom Domains',
      '🌱 100% Green Energy',
      '📊 CO₂-Dashboard',
    ],
    cta: 'Upgrade',
    popular: false,
  },
  {
    name: 'Team',
    price: 20,
    description: 'Für Startups & Teams',
    features: [
      'Unbegrenzte Projekte & Services',
      '32 vCPU / 32 GB RAM pro Service',
      '100 GB Storage',
      '2.000 Build Minutes/Monat',
      'Priority Support (24h)',
      'Unbegrenzte Domains',
      '🌱 100% Green Energy',
      '📊 Erweitertes CO₂-Dashboard',
      '🏷️ Green Badge für Website',
      'Team-Zusammenarbeit',
    ],
    cta: 'Upgrade',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: null,
    description: 'Für große Unternehmen',
    features: [
      'Unbegrenzte Projekte & Services',
      'Unlimited vCPU & RAM pro Service',
      'Unbegrenzter Storage',
      'Dedicated Support + Slack',
      'SLA 99.95%',
      'SSO/SAML',
      'SOC 2 & HIPAA',
      '🌱 100% Green Energy',
      '📜 Green Certificate (PDF)',
      '📈 ESG-Reporting',
      'On-Premise Option',
    ],
    cta: 'Sales kontaktieren',
    popular: false,
  },
];

type TabType = 'overview' | 'invoices' | 'plans';

export function Billing() {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const { data: workspaceData } = useQuery({
    queryKey: ['workspace', currentWorkspace?.id],
    queryFn: () => apiService.getWorkspace(currentWorkspace!.id),
    enabled: !!currentWorkspace?.id,
  });

  // Fetch invoices from API
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => apiService.getInvoices(),
  });

  // Use API invoices or fallback to demo data
  const invoices: Invoice[] = invoicesData && invoicesData.length > 0 ? invoicesData : DEMO_INVOICES;

  const currentPlan = workspaceData?.subscription?.plan || 'FREE';

  // If viewing a specific invoice
  if (selectedInvoice) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button
          onClick={() => setSelectedInvoice(null)}
          className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t('billing.backToOverview')}
        </button>
        <InvoiceView invoice={selectedInvoice} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with Green Energy Badge */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <span className="text-3xl">📋</span>
            {t('billing.title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t('billing.subtitle')}
          </p>
        </div>
        <GreenEnergyBadge size="default" />
      </div>

      {/* Tab Navigation - Simple for managers */}
      <div className="mb-8">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-8">
            <TabButton
              active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              icon="📊"
              label={t('billing.tabs.overview')}
            />
            <TabButton
              active={activeTab === 'invoices'}
              onClick={() => setActiveTab('invoices')}
              icon="📄"
              label={t('billing.tabs.invoices')}
            />
            <TabButton
              active={activeTab === 'plans'}
              onClick={() => setActiveTab('plans')}
              icon="⭐"
              label={t('billing.tabs.plans')}
            />
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Green Impact Summary - Top Priority for CFOs */}
          <GreenImpactSummary />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Cost Overview */}
            <div className="space-y-6">
              <CostCalculator />

              {/* Quick Stats - Manager friendly */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="text-xl">📈</span>
                  Nutzung diesen Monat
                </h3>
                <div className="space-y-4">
                  <StatRow label="Bereitstellungen" value="47" limit="200" />
                  <StatRow label="Speicher genutzt" value="12.4 GB" limit="50 GB" />
                  <StatRow label="Bandbreite" value="2.4 GB" limit="100 GB" />
                </div>
              </div>
            </div>

            {/* Current Plan & Payment */}
            <div className="space-y-6">
              {/* Current Plan */}
              <div className="bg-gradient-to-br from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 rounded-xl border border-primary-200 dark:border-primary-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Ihr aktueller Tarif</h3>
                  <span className="px-3 py-1 bg-primary-600 text-white text-sm font-medium rounded-full">
                    {currentPlan === 'FREE' ? 'Hobby' : currentPlan}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">€0</span>
                  <span className="text-gray-500 dark:text-gray-400">/Monat</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Ideal für erste Projekte und Experimente. Jederzeit upgraden möglich.
                </p>
                <button 
                  onClick={() => setActiveTab('plans')}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                >
                  Tarife vergleichen
                </button>
              </div>

              {/* Payment Method */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="text-xl">💳</span>
                  Zahlungsmethode
                </h3>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="w-14 h-9 rounded bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-center shadow">
                    <span className="text-white text-xs font-bold tracking-wide">VISA</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">•••• •••• •••• 4242</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Läuft ab 12/25</p>
                  </div>
                  <button className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">
                    Ändern
                  </button>
                </div>
                <button className="mt-4 text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Weitere Zahlungsmethode hinzufügen
                </button>
              </div>

              {/* Recent Invoices Preview */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="text-xl">📄</span>
                    Letzte Rechnungen
                  </h3>
                  <button 
                    onClick={() => setActiveTab('invoices')}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
                  >
                    Alle anzeigen →
                  </button>
                </div>
                <div className="space-y-3">
                  {invoices.slice(0, 3).map((invoice) => (
                    <div 
                      key={invoice.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{invoice.number}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{invoice.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          €{invoice.total.toFixed(2)}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <span>🌱</span> {invoice.co2Saved.toFixed(1)}kg gespart
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <InvoiceList 
          invoices={invoices} 
          onViewInvoice={setSelectedInvoice}
        />
      )}

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className="space-y-8">
          {/* Billing Period Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm ${billingPeriod === 'monthly' ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500'}`}>
              Monatlich
            </span>
            <button
              onClick={() => setBillingPeriod(bp => bp === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                billingPeriod === 'yearly' ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform shadow ${
                  billingPeriod === 'yearly' ? 'translate-x-7' : ''
                }`}
              />
            </button>
            <span className={`text-sm ${billingPeriod === 'yearly' ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500'}`}>
              Jährlich
              <span className="ml-1.5 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
                20% sparen
              </span>
            </span>
          </div>

          {/* Green Promise Banner */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-3xl">
                🌍
              </div>
              <div>
                <h3 className="font-bold text-lg">Alle Tarife mit 100% grüner Energie</h3>
                <p className="text-green-100 text-sm">
                  Egal welchen Tarif Sie wählen – Ihre Dienste laufen immer auf erneuerbarer Energie.
                </p>
              </div>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => {
              const isCurrentPlan = plan.name.toUpperCase() === currentPlan;
              const price = plan.price === null 
                ? null 
                : billingPeriod === 'yearly' 
                  ? Math.round(plan.price * 12 * 0.8) 
                  : plan.price;
              
              return (
                <div
                  key={plan.name}
                  className={`relative rounded-xl border-2 p-6 transition-all ${
                    plan.popular
                      ? 'border-primary-500 shadow-lg shadow-primary-500/10'
                      : isCurrentPlan
                        ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded-full whitespace-nowrap">
                      Beliebteste Wahl
                    </span>
                  )}
                  {isCurrentPlan && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-full whitespace-nowrap">
                      Ihr Tarif
                    </span>
                  )}
                  
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-6">
                    {price !== null ? (
                      <>
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                          €{price}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          /{billingPeriod === 'yearly' ? 'Jahr' : 'Monat'}{plan.name === 'Team' ? ' pro Seat' : ''}
                        </span>
                      </>
                    ) : (
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        Custom
                      </span>
                    )}
                  </div>

                  <ul className="space-y-2.5 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                    <li className="flex items-start gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
                      <span className="text-lg">🌱</span>
                      100% Grüne Energie inklusive
                    </li>
                  </ul>

                  <button
                    disabled={isCurrentPlan}
                    className={`w-full py-2.5 rounded-lg font-medium transition-colors ${
                      isCurrentPlan
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                        : plan.popular
                          ? 'bg-primary-600 hover:bg-primary-700 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    {isCurrentPlan ? 'Ihr aktueller Tarif' : plan.cta}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Enterprise Contact */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Benötigen Sie eine maßgeschneiderte Lösung?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Unser Team berät Sie gerne zu Enterprise-Optionen, Compliance und individuellen Anforderungen.
            </p>
            <button className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
              Beratungsgespräch vereinbaren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ 
  active, 
  onClick, 
  icon, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: string; 
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 py-4 border-b-2 font-medium transition-colors ${
        active
          ? 'border-primary-600 text-primary-600 dark:text-primary-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      <span className="text-lg">{icon}</span>
      {label}
    </button>
  );
}

function StatRow({ label, value, limit }: { label: string; value: string; limit: string }) {
  // Extract numeric value for progress calculation
  const numericValue = parseFloat(value.replace(/[^\d.]/g, ''));
  const numericLimit = parseFloat(limit.replace(/[^\d.]/g, ''));
  const percentage = Math.min((numericValue / numericLimit) * 100, 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {value} <span className="text-gray-400 dark:text-gray-500">/ {limit}</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary-500 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
