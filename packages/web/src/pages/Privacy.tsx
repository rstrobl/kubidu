import { Link } from 'react-router-dom';

export function Privacy() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: February 9, 2025</p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600 mb-4">
              Kubidu ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, and safeguard your personal data in compliance with the 
              General Data Protection Regulation (GDPR) and other applicable data protection laws.
            </p>
            <p className="text-gray-600 mb-4">
              <strong>Kubidu is an EU-hosted platform.</strong> All data is processed and stored 
              exclusively within the European Union.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Data Controller</h2>
            <p className="text-gray-600 mb-4">
              Kubidu acts as the data controller for personal data collected through our platform. 
              For inquiries, contact us at:{' '}
              <a href="mailto:legal@kubidu.io" className="text-primary-600 hover:underline">
                legal@kubidu.io
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Data We Collect</h2>
            <p className="text-gray-600 mb-4">We collect the following categories of personal data:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, password (hashed)</li>
              <li><strong>Billing Information:</strong> Payment details processed via secure third-party providers (Stripe)</li>
              <li><strong>Usage Data:</strong> Service usage, deployment logs, performance metrics</li>
              <li><strong>Technical Data:</strong> IP addresses, browser type, device information</li>
              <li><strong>Communication Data:</strong> Support tickets, feedback, correspondence</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Legal Basis for Processing</h2>
            <p className="text-gray-600 mb-4">We process your data based on:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Contract Performance:</strong> To provide our services to you</li>
              <li><strong>Legitimate Interests:</strong> To improve our services and ensure security</li>
              <li><strong>Legal Obligations:</strong> To comply with applicable laws</li>
              <li><strong>Consent:</strong> For marketing communications (where applicable)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. How We Use Your Data</h2>
            <p className="text-gray-600 mb-4">Your data is used to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process payments and manage subscriptions</li>
              <li>Communicate with you about your account and services</li>
              <li>Ensure platform security and prevent abuse</li>
              <li>Comply with legal obligations</li>
              <li>Send service updates and (with consent) marketing communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data Storage & Security</h2>
            <p className="text-gray-600 mb-4">
              <strong>All data is stored in EU-based data centers.</strong> We implement robust 
              security measures including:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Encryption at rest and in transit (TLS 1.3)</li>
              <li>Regular security audits and penetration testing</li>
              <li>Access controls and authentication</li>
              <li>Automated backups with encryption</li>
              <li>Incident response procedures</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Data Sharing</h2>
            <p className="text-gray-600 mb-4">
              We do not sell your personal data. We may share data with:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Service Providers:</strong> Payment processors (Stripe), email services — all GDPR-compliant</li>
              <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In case of merger or acquisition (with notice)</li>
            </ul>
            <p className="text-gray-600 mt-4">
              No data is transferred outside the EU without appropriate safeguards (Standard Contractual Clauses).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Your Rights (GDPR)</h2>
            <p className="text-gray-600 mb-4">Under GDPR, you have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Restriction:</strong> Limit how we process your data</li>
              <li><strong>Portability:</strong> Receive your data in a structured format</li>
              <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent at any time</li>
            </ul>
            <p className="text-gray-600 mt-4">
              To exercise these rights, contact us at{' '}
              <a href="mailto:legal@kubidu.io" className="text-primary-600 hover:underline">
                legal@kubidu.io
              </a>. We will respond within 30 days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Data Retention</h2>
            <p className="text-gray-600 mb-4">
              We retain your data only as long as necessary for the purposes described in this policy:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Account data: Until account deletion + 30 days</li>
              <li>Billing records: 7 years (legal requirement)</li>
              <li>Logs and analytics: 90 days</li>
              <li>Backups: 30 days after deletion</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Cookies</h2>
            <p className="text-gray-600 mb-4">
              We use essential cookies for authentication and security. Analytics cookies are only 
              used with your consent. You can manage cookie preferences in your browser settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Children's Privacy</h2>
            <p className="text-gray-600 mb-4">
              Our services are not directed to individuals under 16. We do not knowingly collect 
              personal data from children. If you believe we have collected such data, please contact us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Changes to This Policy</h2>
            <p className="text-gray-600 mb-4">
              We may update this Privacy Policy periodically. Material changes will be communicated 
              via email or through the Service. The "Last updated" date indicates when the policy 
              was last revised.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Contact & Complaints</h2>
            <p className="text-gray-600 mb-4">
              For privacy-related inquiries or to exercise your rights, contact us at:{' '}
              <a href="mailto:legal@kubidu.io" className="text-primary-600 hover:underline">
                legal@kubidu.io
              </a>
            </p>
            <p className="text-gray-600">
              You also have the right to lodge a complaint with your local data protection authority 
              if you believe we have not handled your data appropriately.
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
