import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api.service';
import { useWorkspaceStore } from '../stores/workspace.store';
import { CostCalculator } from '../components/CostCalculator';

const PLANS = [
  {
    name: 'Free',
    price: 0,
    description: 'For hobby projects and experiments',
    features: [
      '2 services included',
      '10 deployments/month',
      '512MB RAM per service',
      '1GB storage',
      'Community support',
    ],
    cta: 'Current Plan',
    popular: false,
  },
  {
    name: 'Starter',
    price: 9,
    description: 'For small teams getting started',
    features: [
      '5 services included',
      '50 deployments/month',
      '2GB RAM per service',
      '10GB storage',
      'Email support',
      'Custom domains',
    ],
    cta: 'Upgrade',
    popular: false,
  },
  {
    name: 'Pro',
    price: 29,
    description: 'For growing teams and businesses',
    features: [
      '20 services included',
      '200 deployments/month',
      '4GB RAM per service',
      '50GB storage',
      'Priority support',
      'Custom domains',
      'Advanced analytics',
      'Team collaboration',
    ],
    cta: 'Upgrade',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 99,
    description: 'For large organizations',
    features: [
      'Unlimited services',
      'Unlimited deployments',
      '16GB RAM per service',
      '500GB storage',
      '24/7 dedicated support',
      'SLA guarantee',
      'Custom integrations',
      'On-premise option',
      'Security compliance',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export function Billing() {
  const { currentWorkspace } = useWorkspaceStore();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const { data: workspaceData } = useQuery({
    queryKey: ['workspace', currentWorkspace?.id],
    queryFn: () => apiService.getWorkspace(currentWorkspace!.id),
    enabled: !!currentWorkspace?.id,
  });

  const currentPlan = workspaceData?.subscription?.plan || 'FREE';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          💳 Billing & Plans
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage your subscription and view usage costs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Cost Calculator */}
        <div className="lg:col-span-1">
          <CostCalculator />

          {/* Quick Stats */}
          <div className="mt-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              📊 This Month
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Deployments</span>
                <span className="font-medium text-gray-900 dark:text-white">47</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Build minutes</span>
                <span className="font-medium text-gray-900 dark:text-white">124 min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Bandwidth</span>
                <span className="font-medium text-gray-900 dark:text-white">2.4 GB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Plans */}
        <div className="lg:col-span-2">
          {/* Billing Period Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`text-sm ${billingPeriod === 'monthly' ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingPeriod(bp => bp === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                billingPeriod === 'yearly' ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  billingPeriod === 'yearly' ? 'translate-x-7' : ''
                }`}
              />
            </button>
            <span className={`text-sm ${billingPeriod === 'yearly' ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500'}`}>
              Yearly
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
                Save 20%
              </span>
            </span>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLANS.map((plan) => {
              const isCurrentPlan = plan.name.toUpperCase() === currentPlan;
              const price = billingPeriod === 'yearly' 
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
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded-full">
                      Most Popular
                    </span>
                  )}
                  {isCurrentPlan && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
                      Current Plan
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
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      ${price}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      /{billingPeriod === 'yearly' ? 'year' : 'month'}
                    </span>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
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
                    {isCurrentPlan ? 'Current Plan' : plan.cta}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Payment Methods */}
          <div className="mt-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              💳 Payment Methods
            </h3>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="w-12 h-8 rounded bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-center">
                <span className="text-white text-xs font-bold">VISA</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">•••• •••• •••• 4242</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Expires 12/25</p>
              </div>
              <button className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                Edit
              </button>
            </div>
            <button className="mt-4 text-sm text-primary-600 dark:text-primary-400 hover:underline">
              + Add payment method
            </button>
          </div>

          {/* Invoices */}
          <div className="mt-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                🧾 Recent Invoices
              </h3>
              <button className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                View all
              </button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {[
                { date: 'Feb 1, 2026', amount: 0, status: 'Paid' },
                { date: 'Jan 1, 2026', amount: 0, status: 'Paid' },
                { date: 'Dec 1, 2025', amount: 0, status: 'Paid' },
              ].map((invoice, i) => (
                <div key={i} className="px-6 py-3 flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{invoice.date}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${invoice.amount.toFixed(2)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
                    {invoice.status}
                  </span>
                  <button className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
