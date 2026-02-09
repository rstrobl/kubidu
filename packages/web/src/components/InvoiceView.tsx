import { GreenEnergyCertificate, GreenEnergyBadge } from './GreenImpactSummary';
import { apiService } from '../services/api.service';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  co2Saved: number;
  billingAddress: {
    name: string;
    company?: string;
    street: string;
    city: string;
    country: string;
  };
}

/**
 * Invoice View - Clean, Manager-friendly, Print-optimized
 * Designed for CFOs and finance teams with clear layout and green credentials
 */
export function InvoiceView({ invoice }: { invoice: Invoice }) {
  const statusColors = {
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  const statusLabels = {
    paid: 'Bezahlt',
    pending: 'Ausstehend',
    overdue: 'Überfällig',
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    try {
      const blob = await apiService.downloadInvoicePdf(invoice.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      // Fallback to print
      window.print();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden print:border-0 print:shadow-none">
      {/* Header - Clean and Professional */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 print:border-gray-300">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                K
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">Kubidu</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
              <p>Kubidu GmbH</p>
              <p>Musterstraße 1, 60313 Frankfurt</p>
              <p>Deutschland</p>
              <p className="pt-1">USt-IdNr.: DE123456789</p>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="text-right">
            <div className="flex items-center gap-3 justify-end mb-3">
              <GreenEnergyBadge size="small" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">RECHNUNG</h2>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p><span className="text-gray-500">Nr.:</span> <strong className="text-gray-900 dark:text-white">{invoice.number}</strong></p>
              <p><span className="text-gray-500">Datum:</span> {invoice.date}</p>
              <p><span className="text-gray-500">Fällig:</span> {invoice.dueDate}</p>
            </div>
            <div className="mt-3">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[invoice.status]}`}>
                {statusLabels[invoice.status]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Address */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 print:bg-gray-50">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Rechnungsadresse</p>
        <div className="text-sm text-gray-900 dark:text-white">
          <p className="font-semibold">{invoice.billingAddress.name}</p>
          {invoice.billingAddress.company && <p>{invoice.billingAddress.company}</p>}
          <p>{invoice.billingAddress.street}</p>
          <p>{invoice.billingAddress.city}, {invoice.billingAddress.country}</p>
        </div>
      </div>

      {/* Line Items - Clear Table Format */}
      <div className="p-6">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Beschreibung</th>
              <th className="text-center py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 w-24">Menge</th>
              <th className="text-right py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 w-32">Einzelpreis</th>
              <th className="text-right py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 w-32">Gesamt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {invoice.items.map((item, i) => (
              <tr key={i}>
                <td className="py-4 text-gray-900 dark:text-white">{item.description}</td>
                <td className="py-4 text-center text-gray-600 dark:text-gray-400">{item.quantity}</td>
                <td className="py-4 text-right text-gray-600 dark:text-gray-400">
                  {formatCurrency(item.unitPrice, invoice.currency)}
                </td>
                <td className="py-4 text-right font-medium text-gray-900 dark:text-white">
                  {formatCurrency(item.total, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-72">
            <div className="flex justify-between py-2 text-gray-600 dark:text-gray-400">
              <span>Zwischensumme</span>
              <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            <div className="flex justify-between py-2 text-gray-600 dark:text-gray-400">
              <span>MwSt. (19%)</span>
              <span>{formatCurrency(invoice.tax, invoice.currency)}</span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-gray-900 dark:border-white text-xl font-bold text-gray-900 dark:text-white">
              <span>Gesamt</span>
              <span>{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Green Energy Certificate */}
      <div className="px-6 pb-6 print:pt-4">
        <GreenEnergyCertificate co2Saved={invoice.co2Saved} />
      </div>

      {/* Payment Info - Clear and Simple */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 print:bg-gray-50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Bankverbindung</p>
            <div className="text-sm text-gray-900 dark:text-white space-y-1">
              <p><span className="text-gray-500">Bank:</span> Deutsche Bank</p>
              <p><span className="text-gray-500">IBAN:</span> DE89 3704 0044 0532 0130 00</p>
              <p><span className="text-gray-500">BIC:</span> COBADEFFXXX</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Hinweis</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Bitte geben Sie bei der Überweisung die Rechnungsnummer <strong>{invoice.number}</strong> als Verwendungszweck an.
            </p>
          </div>
        </div>
      </div>

      {/* Actions - Hidden in print */}
      <div className="px-6 py-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between print:hidden">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          🌍 Diese Rechnung ist klimaneutral
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Drucken
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            PDF herunterladen
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Invoice List - Simple overview for finance managers
 */
export function InvoiceList({ 
  invoices, 
  onViewInvoice 
}: { 
  invoices: Invoice[]; 
  onViewInvoice: (invoice: Invoice) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📄</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Rechnungen</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Übersicht aller Abrechnungen</p>
          </div>
        </div>
        <GreenEnergyBadge size="small" />
      </div>

      {/* Invoice Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Rechnung
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Datum
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Betrag
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                CO₂ eingespart
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Aktion
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {invoices.map((invoice) => (
              <InvoiceRow key={invoice.id} invoice={invoice} onView={() => onViewInvoice(invoice)} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with green summary */}
      <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-t border-green-100 dark:border-green-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <span className="text-lg">🌱</span>
            <span className="text-sm font-medium">
              Gesamte CO₂-Einsparung: <strong>{invoices.reduce((sum, inv) => sum + inv.co2Saved, 0).toFixed(1)} kg</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoiceRow({ invoice, onView }: { invoice: Invoice; onView: () => void }) {
  const statusColors = {
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  const statusLabels = {
    paid: 'Bezahlt',
    pending: 'Ausstehend',
    overdue: 'Überfällig',
  };

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white">{invoice.number}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
        {invoice.date}
      </td>
      <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">
        {formatCurrency(invoice.total, invoice.currency)}
      </td>
      <td className="px-6 py-4 text-center">
        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
          <span className="text-xs">🌱</span>
          {invoice.co2Saved.toFixed(1)} kg
        </span>
      </td>
      <td className="px-6 py-4 text-center">
        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[invoice.status]}`}>
          {statusLabels[invoice.status]}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <button
          onClick={onView}
          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium"
        >
          Anzeigen
        </button>
      </td>
    </tr>
  );
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

// Example/Demo Invoice Data
export const DEMO_INVOICE: Invoice = {
  id: 'inv-001',
  number: 'INV-2026-0042',
  date: '1. Februar 2026',
  dueDate: '15. Februar 2026',
  status: 'paid',
  currency: 'EUR',
  co2Saved: 36.8,
  billingAddress: {
    name: 'Max Mustermann',
    company: 'Musterfirma GmbH',
    street: 'Beispielstraße 123',
    city: '60313 Frankfurt',
    country: 'Deutschland',
  },
  items: [
    {
      description: 'Pro Plan - Februar 2026',
      quantity: 1,
      unitPrice: 29.00,
      total: 29.00,
    },
    {
      description: 'Zusätzlicher Speicher (20 GB)',
      quantity: 1,
      unitPrice: 5.00,
      total: 5.00,
    },
  ],
  subtotal: 34.00,
  tax: 6.46,
  total: 40.46,
};

export const DEMO_INVOICES: Invoice[] = [
  DEMO_INVOICE,
  {
    ...DEMO_INVOICE,
    id: 'inv-002',
    number: 'INV-2026-0036',
    date: '1. Januar 2026',
    dueDate: '15. Januar 2026',
    co2Saved: 34.2,
  },
  {
    ...DEMO_INVOICE,
    id: 'inv-003',
    number: 'INV-2025-0412',
    date: '1. Dezember 2025',
    dueDate: '15. Dezember 2025',
    co2Saved: 32.1,
  },
];
