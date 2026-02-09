import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

// User-friendly mode detection (non-tech users get simpler messaging)
const isSimpleMode = () => {
  // Check if URL has ?simple or localStorage preference
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('simple')) return true;
  if (urlParams.has('dev')) return false;
  return localStorage.getItem('kubidu_simple_mode') === 'true';
};

// Icons as SVG components for better performance
const Icons = {
  Rocket: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  Globe: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  Zap: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  Code: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  ),
  Server: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m19.5 0a3 3 0 01-3 3H5.25a3 3 0 01-3-3m19.5 0a3 3 0 00-3-3H5.25a3 3 0 00-3 3m16.5 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008z" />
    </svg>
  ),
  Leaf: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21c-1.5 0-4.5-1.5-6-4.5S4.5 9 6 6c3 1.5 6 1.5 9 0s4.5 1.5 6 4.5-1.5 6-3 7.5-3 3-6 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21V12M12 12c-2-2-4-2.5-6-2M12 12c2-2 4-2.5 6-2" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  ),
  GitHub: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
    </svg>
  ),
  EU: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="bold">EU</text>
    </svg>
  ),
};

// Pricing data - Railway-competitive with Green Energy USP
// Usage-based: Kunde zahlt was er nutzt. Unbegrenzte Projekte & Services.
const pricingPlans = [
  {
    name: 'Hobby',
    price: 0,
    description: 'Für Studenten & Side Projects',
    features: [
      'Unbegrenzte Projekte & Services',
      '8 vCPU / 8 GB RAM pro Service',
      '1 GB Storage',
      '100 Build Minutes/mo',
      '5 GB Bandwidth/mo',
      '1 Custom Domain',
      'Community Support',
      '🌱 100% Green Energy',
    ],
    cta: 'Kostenlos starten',
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
      '500 Build Minutes/mo',
      '50 GB Bandwidth/mo',
      '5 Custom Domains',
      'Email Support (48h)',
      '🌱 100% Green Energy',
      '📊 CO₂-Dashboard',
    ],
    cta: 'Jetzt starten',
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
      '2.000 Build Minutes/mo',
      '200 GB Bandwidth/mo',
      'Unbegrenzte Domains',
      'Priority Support (24h)',
      '🌱 100% Green Energy',
      '📊 Erweitertes CO₂-Dashboard',
      '🏷️ Green Badge für Website',
      'Team-Zusammenarbeit',
    ],
    cta: 'Team starten',
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

// Two versions of features: technical and simple
const features = [
  {
    icon: Icons.Rocket,
    title: 'Deploy Docker Apps',
    titleSimple: 'Launch Your App',
    description: 'Push any Docker image and watch it go live. Your containers run on Kubernetes with zero config.',
    descriptionSimple: 'Get your website or app online in minutes. No server setup, no complicated configurations.',
  },
  {
    icon: Icons.Shield,
    title: 'GDPR by Default',
    titleSimple: 'Privacy Built-In',
    description: 'Data stays in the EU. Privacy-first architecture. Compliant without the headache.',
    descriptionSimple: 'Your data stays safe in Europe. Meet privacy requirements automatically.',
  },
  {
    icon: Icons.Leaf,
    title: '100% Green Energy',
    titleSimple: '100% Green Energy',
    description: 'Powered entirely by renewable energy. Deploy sustainably without compromise.',
    descriptionSimple: 'Powered by renewable energy. Good for your business, good for the planet.',
  },
  {
    icon: Icons.Server,
    title: 'EU-Hosted Infrastructure',
    titleSimple: 'Fast & Reliable',
    description: 'Your apps run in Frankfurt, Germany. Fast for European users, compliant by design.',
    descriptionSimple: 'Blazing fast servers in Germany. Your visitors get the best experience.',
  },
];

const howItWorks = [
  {
    step: 1,
    title: 'Create a Project',
    titleSimple: 'Sign Up Free',
    description: 'Sign up in seconds. Create a project to organize your services and environments.',
    descriptionSimple: 'Create your free account in 30 seconds. No credit card needed.',
  },
  {
    step: 2,
    title: 'Add Your Service',
    titleSimple: 'Choose a Template',
    description: 'Deploy any Docker image. Set environment variables and resource limits.',
    descriptionSimple: 'Pick WordPress, a blog, or your own app. We handle the technical stuff.',
  },
  {
    step: 3,
    title: 'Go Live',
    titleSimple: 'You\'re Online!',
    description: 'Your container runs on Kubernetes. Monitor logs, scale replicas, add domains.',
    descriptionSimple: 'Your site is live with a free web address. Add your own domain anytime.',
  },
];

const trustBadges = [
  { icon: '🌱', label: '100% Green Energy', sublabel: 'Renewable Powered' },
  { icon: '🇪🇺', label: 'EU Hosted', sublabel: 'Frankfurt, Germany' },
  { icon: '🔒', label: 'GDPR Compliant', sublabel: 'Privacy First' },
  { icon: '📜', label: 'ISO 27001 Ready', sublabel: 'Audit Logging' },
];

export function Landing() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [simpleMode, setSimpleMode] = useState(isSimpleMode);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Toggle between developer and simple mode
  const toggleMode = () => {
    const newMode = !simpleMode;
    setSimpleMode(newMode);
    localStorage.setItem('kubidu_simple_mode', String(newMode));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-primary-600">Kubidu</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">How It Works</a>
              <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <a href="https://docs.kubidu.io" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Docs</a>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-all hover:-translate-y-0.5 shadow-lg shadow-primary-600/25"
              >
                Start Free
                <Icons.ArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-success-50/30" />
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-primary-100/50 to-transparent rounded-bl-[100px]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-success-50 text-success-700 rounded-full text-sm font-medium mb-8 animate-fade-in">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
                🌱 100% Green Energy
              </span>
              <span className="text-success-300">|</span>
              <span>🇪🇺 EU-Hosted</span>
              <span className="text-success-300">|</span>
              <span>GDPR Compliant</span>
            </div>

            {/* Main headline - different for simple vs developer mode */}
            {simpleMode ? (
              <>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 tracking-tight animate-fade-in-up">
                  Your website.
                  <span className="block mt-2 bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                    Online in minutes.
                  </span>
                </h1>
                <p className="mt-8 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                  Start your blog, launch your business website, or build your online store. 
                  We handle the technology — you focus on what matters.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 tracking-tight animate-fade-in-up">
                  Deploy with confidence.
                  <span className="block mt-2 bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                    Stay compliant.
                  </span>
                </h1>
                <p className="mt-8 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                  The developer-first PaaS that respects your data. Push your code, we handle the rest — from builds to scaling to GDPR compliance.
                </p>
              </>
            )}

            {/* CTA buttons - different text for simple mode */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-all hover:-translate-y-1 shadow-xl shadow-primary-600/25"
              >
                {simpleMode ? 'Start Free — No Credit Card' : 'Start Deploying Free'}
                <Icons.ArrowRight />
              </Link>
              {simpleMode ? (
                <button
                  onClick={toggleMode}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all"
                >
                  <Icons.Code />
                  I'm a Developer
                </button>
              ) : (
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all"
                >
                  <Icons.ArrowRight />
                  Sign In
                </Link>
              )}
            </div>

            {/* Value props */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-2">
                <span className="text-success-600">✓</span>
                <span>No credit card required</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-gray-300" />
              <div className="flex items-center gap-2">
                <span className="text-success-600">✓</span>
                <span>Deploy in under 5 minutes</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-gray-300" />
              <div className="flex items-center gap-2">
                <span className="text-success-600">✓</span>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* Hero visual - Different for simple vs developer mode */}
          <div className="mt-16 max-w-4xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary-600 to-success-500 rounded-2xl blur-2xl opacity-20" />
              
              {simpleMode ? (
                /* Simple mode: Website preview mockup */
                <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
                  {/* Browser chrome */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 ml-4">
                      <div className="bg-white rounded-lg px-4 py-1.5 text-sm text-gray-600 flex items-center gap-2 max-w-md">
                        <span className="text-green-600">🔒</span>
                        <span>your-business.kubidu.io</span>
                      </div>
                    </div>
                  </div>
                  {/* Website preview */}
                  <div className="p-8 bg-gradient-to-br from-gray-50 to-white min-h-[280px]">
                    <div className="max-w-sm mx-auto text-center">
                      <div className="w-16 h-16 bg-primary-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                        <span className="text-3xl">🏪</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Your Business Name</h3>
                      <p className="text-gray-500 text-sm mb-6">Your website, blog, or online store — live and ready for visitors!</p>
                      <div className="flex justify-center gap-3">
                        <span className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium">Shop Now</span>
                        <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">Learn More</span>
                      </div>
                      <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><span className="text-green-500">●</span> Live</span>
                        <span>•</span>
                        <span>🔒 SSL Secure</span>
                        <span>•</span>
                        <span>🇪🇺 EU Hosted</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Developer mode: Terminal mockup */
                <div className="relative bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-800">
                  {/* Terminal header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <span className="ml-2 text-sm text-gray-400 font-mono">Terminal</span>
                  </div>
                  {/* Terminal content */}
                  <div className="p-6 font-mono text-sm leading-relaxed">
                    <div className="text-gray-400"># Deploy a Docker image</div>
                    <div className="mt-2 text-gray-300">
                      <span className="text-success-400">✓</span> Pulling nginx:latest...
                    </div>
                    <div className="text-gray-300">
                      <span className="text-success-400">✓</span> Creating Kubernetes deployment...
                    </div>
                    <div className="text-gray-300">
                      <span className="text-success-400">✓</span> Configuring service in EU-Frankfurt...
                    </div>
                    <div className="text-gray-300">
                      <span className="text-success-400">✓</span> Status: RUNNING
                    </div>
                    <div className="mt-2 text-success-400 font-semibold">
                      🚀 Deployment successful!
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-gray-500">$</span>
                      <span className="inline-block w-2 h-5 bg-primary-500 animate-pulse" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {trustBadges.map((badge, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <span className="text-3xl mb-2">{badge.icon}</span>
                <span className="font-semibold text-gray-900">{badge.label}</span>
                <span className="text-sm text-gray-500">{badge.sublabel}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Everything you need to ship fast
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Focus on your code. We handle infrastructure, security, and compliance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 bg-white rounded-2xl border border-gray-200 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-100/50 transition-all duration-300"
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-primary-100 text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                  <feature.icon />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {simpleMode ? feature.titleSimple : feature.title}
                </h3>
                <p className="mt-2 text-gray-600">
                  {simpleMode ? feature.descriptionSimple : feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 md:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              {simpleMode ? 'Get online in 3 simple steps' : 'From code to production in 3 steps'}
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              {simpleMode ? 'No technical skills needed. We guide you every step of the way.' : 'No DevOps degree required. Get your app live in minutes.'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {howItWorks.map((step, index) => (
              <div key={index} className="relative">
                {/* Connector line */}
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-primary-200 to-primary-100 -translate-x-1/2" />
                )}
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 flex items-center justify-center rounded-full bg-primary-600 text-white text-2xl font-bold shadow-lg shadow-primary-600/30">
                    {step.step}
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-gray-900">
                    {simpleMode ? step.titleSimple : step.title}
                  </h3>
                  <p className="mt-3 text-gray-600 max-w-xs">
                    {simpleMode ? step.descriptionSimple : step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Example Section - Different for simple vs developer mode */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                {simpleMode ? 'Everything you need, included' : 'Deploy any Docker image'}
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                {simpleMode 
                  ? 'No hidden fees, no complicated setup. Start with our free plan and grow at your own pace.'
                  : 'Node.js, Python, Go, Ruby, Rust — if it runs in Docker, it runs on Kubidu. Your containers, our infrastructure.'
                }
              </p>
              <ul className="mt-8 space-y-4">
                {(simpleMode ? [
                  'Free custom web address (yoursite.kubidu.io)',
                  'Automatic security (SSL/HTTPS)',
                  'Your data safe in Europe',
                  'Email support when you need help',
                  'Grow as your business grows',
                ] : [
                  'Deploy any Docker image',
                  'Encrypted environment variables',
                  'Resource limits (CPU & RAM)',
                  'Real-time deployment logs',
                  'Kubernetes-powered reliability',
                ]).map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-success-100 text-success-600">
                      <Icons.Check />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary-600 to-success-500 rounded-2xl blur-2xl opacity-10" />
              
              {simpleMode ? (
                /* Simple mode: Show use cases instead of code */
                <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Popular Templates</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { icon: '📝', name: 'WordPress Blog', desc: 'Start writing today' },
                      { icon: '🛍️', name: 'Online Store', desc: 'Sell your products' },
                      { icon: '📊', name: 'Business Site', desc: 'Professional presence' },
                      { icon: '📸', name: 'Portfolio', desc: 'Showcase your work' },
                    ].map((template, i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-xl text-center hover:bg-primary-50 transition-colors cursor-pointer">
                        <span className="text-3xl block mb-2">{template.icon}</span>
                        <span className="font-medium text-gray-900 block">{template.name}</span>
                        <span className="text-xs text-gray-500">{template.desc}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-6 text-center text-sm text-gray-500">
                    ...and many more one-click templates
                  </p>
                </div>
              ) : (
                /* Developer mode: Show code */
                <div className="relative bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-800">
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
                    <span className="text-sm text-gray-400 font-mono">kubidu.yaml</span>
                  </div>
                  <pre className="p-6 font-mono text-sm text-gray-300 overflow-x-auto">
{`# Your service configuration
image: nginx:latest
port: 80
replicas: 2

resources:
  cpu: 1
  memory: 512Mi

env:
  NODE_ENV: production
  API_URL: \${API_SERVICE_URL}

# Encrypted at rest with AES-256-GCM
secrets:
  DATABASE_URL: "encrypted..."
  API_KEY: "encrypted..."`}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Start free, scale as you grow. No hidden fees, no surprises.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`relative flex flex-col p-6 bg-white rounded-2xl border-2 ${
                  plan.popular
                    ? 'border-primary-600 shadow-xl shadow-primary-100'
                    : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary-600 text-white text-sm font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
                  <div className="mt-4">
                    {plan.price !== null ? (
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-gray-900">€{plan.price}</span>
                        <span className="ml-2 text-gray-500">/Monat{plan.name === 'Team' ? ' pro Seat' : ''}</span>
                      </div>
                    ) : (
                      <div className="text-4xl font-bold text-gray-900">Custom</div>
                    )}
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-success-100 text-success-600 mt-0.5">
                        <Icons.Check />
                      </div>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`w-full py-3 px-4 text-center font-semibold rounded-xl transition-all ${
                    plan.popular
                      ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-600/25'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-12 text-center text-gray-500">
            All plans run on 100% renewable energy in our EU datacenter.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            {simpleMode ? 'Ready to get started?' : 'Ready to deploy sustainably?'}
          </h2>
          <p className="mt-4 text-lg text-primary-100">
            {simpleMode 
              ? 'Join thousands of businesses already online with Kubidu. No technical skills required.'
              : 'Green energy. EU-hosted. GDPR compliant. Start deploying in minutes.'
            }
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-primary-600 bg-white rounded-xl hover:bg-gray-100 transition-all hover:-translate-y-1 shadow-xl"
            >
              {simpleMode ? 'Create Free Account' : 'Start Deploying Free'}
              <Icons.ArrowRight />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-white border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all"
            >
              {simpleMode ? 'Learn More' : 'Sign In'}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <span className="text-2xl font-bold text-white">Kubidu</span>
              <p className="mt-4 text-sm">
                Deploy with confidence.<br />Stay compliant.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              </ul>
            </div>

            {/* Get Started */}
            <div>
              <h4 className="font-semibold text-white mb-4">Get Started</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/register" className="hover:text-white transition-colors">Sign Up Free</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">
              © {new Date().getFullYear()} Kubidu. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              {/* Mode toggle */}
              <button
                onClick={toggleMode}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                {simpleMode ? (
                  <>
                    <Icons.Code />
                    <span>Developer Mode</span>
                  </>
                ) : (
                  <>
                    <span>👤</span>
                    <span>Simple Mode</span>
                  </>
                )}
              </button>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-success-500 rounded-full" />
                <span>All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
