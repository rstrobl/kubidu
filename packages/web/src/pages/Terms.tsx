import { Link } from 'react-router-dom';

export function Terms() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/" className="text-2xl font-bold text-primary-600">
            Kubidu
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: February 9, 2025</p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-600 mb-4">
              By accessing or using Kubidu ("the Service"), you agree to be bound by these Terms of Service. 
              Kubidu is a Platform-as-a-Service (PaaS) operated within the European Union, designed to help 
              developers and businesses deploy applications with full GDPR compliance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-600 mb-4">
              Kubidu provides cloud hosting and deployment services for containerized applications. Our services include:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Docker-based application hosting</li>
              <li>Automated deployments via Git integration</li>
              <li>SSL/TLS certificates and custom domain support</li>
              <li>Managed databases and storage</li>
              <li>Monitoring, logging, and analytics</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Account Registration</h2>
            <p className="text-gray-600 mb-4">
              To use the Service, you must create an account with accurate and complete information. 
              You are responsible for maintaining the security of your account credentials and for all 
              activities that occur under your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
            <p className="text-gray-600 mb-4">You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Distribute malware or engage in malicious activities</li>
              <li>Send spam or unauthorized communications</li>
              <li>Attempt to gain unauthorized access to systems</li>
              <li>Host content that is illegal, harmful, or violates third-party rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Payment Terms</h2>
            <p className="text-gray-600 mb-4">
              Paid plans are billed in advance on a monthly or annual basis. All fees are non-refundable 
              except as required by law. We reserve the right to modify pricing with 30 days notice.
              Usage beyond your plan limits will be billed according to our published overage rates.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Service Level & Availability</h2>
            <p className="text-gray-600 mb-4">
              We strive to maintain 99.9% uptime for paid plans. Scheduled maintenance will be 
              communicated in advance. We are not liable for downtime caused by factors outside 
              our control, including third-party services, network issues, or force majeure events.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Data & Security</h2>
            <p className="text-gray-600 mb-4">
              All data is stored in EU-based data centers and processed in accordance with GDPR. 
              You retain ownership of your data. We implement industry-standard security measures 
              but cannot guarantee absolute security. You are responsible for backing up your data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h2>
            <p className="text-gray-600 mb-4">
              To the maximum extent permitted by law, Kubidu shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages, including loss of profits, 
              data, or business opportunities. Our total liability shall not exceed the fees paid 
              by you in the 12 months preceding the claim.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Termination</h2>
            <p className="text-gray-600 mb-4">
              You may terminate your account at any time. We may suspend or terminate accounts that 
              violate these terms. Upon termination, your data will be retained for 30 days before 
              permanent deletion, unless legally required otherwise.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Changes to Terms</h2>
            <p className="text-gray-600 mb-4">
              We may update these terms from time to time. Material changes will be communicated 
              via email or through the Service. Continued use after changes constitutes acceptance 
              of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Governing Law</h2>
            <p className="text-gray-600 mb-4">
              These terms are governed by the laws of the European Union and the member state where 
              Kubidu is registered. Any disputes shall be resolved in the competent courts of that jurisdiction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Contact</h2>
            <p className="text-gray-600">
              For questions about these Terms of Service, please contact us at:{' '}
              <a href="mailto:legal@kubidu.io" className="text-primary-600 hover:underline">
                legal@kubidu.io
              </a>
            </p>
          </section>
        </div>

        {/* Back link */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link to="/" className="text-primary-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
