import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/auth.store';
import { markAsNewUser } from '../components/OnboardingWizard';

export function Register() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const register = useAuthStore((state) => state.register);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(t('auth.register.errors.passwordTooShort'));
      return;
    }

    if (!acceptTerms) {
      setError(t('auth.register.errors.acceptTerms'));
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, name);
      // Mark as new user to trigger onboarding wizard
      markAsNewUser();
      navigate('/projects');
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.register.errors.registrationFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Visual */}
      <div className="hidden lg:block lg:flex-1 bg-gradient-to-br from-primary-600 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px]" />
        <div className="relative h-full flex flex-col items-center justify-center p-12">
          <div className="max-w-md text-center text-white">
            {/* Social proof */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm mb-6">
              <span className="flex -space-x-2">
                <span className="w-6 h-6 rounded-full bg-primary-300 flex items-center justify-center text-xs">👨‍💻</span>
                <span className="w-6 h-6 rounded-full bg-primary-400 flex items-center justify-center text-xs">👩‍💻</span>
                <span className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-xs">🧑‍💻</span>
              </span>
              <span className="font-medium">500+ developers already deploying</span>
            </div>

            <h2 className="text-3xl font-bold mb-4">
              {t('auth.register.startDeployingInMinutes')}
            </h2>
            <p className="text-primary-100 text-lg mb-8">
              {t('auth.register.joinDevelopers')}
            </p>
            
            {/* Features list */}
            <div className="space-y-4 text-left">
              {[
                { icon: '🚀', text: t('auth.register.features.deployDocker') },
                { icon: '🔒', text: t('auth.register.features.gdprCompliant') },
                { icon: '⚡', text: t('auth.register.features.autoScaling') },
                { icon: '💾', text: t('auth.register.features.storage') },
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <span className="text-2xl">{feature.icon}</span>
                  <span className="font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="text-3xl font-bold text-primary-600">Kubidu</span>
            </Link>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('auth.register.title')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('auth.register.subtitle')}
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error animate-fade-in">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Social signup */}
            <a
              href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/github`}
              className="btn btn-secondary w-full flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              {t('auth.register.signUpWithGitHub')}
            </a>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">{t('auth.register.orWithEmail')}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="input-group">
                <label htmlFor="name" className="label">
                  {t('auth.register.fullName')}
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  className="input"
                  placeholder={t('auth.register.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label htmlFor="email" className="label">
                  {t('auth.register.workEmail')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input"
                  placeholder={t('auth.login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label htmlFor="password" className="label">
                  {t('auth.register.password')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="input pr-10"
                    placeholder={t('auth.register.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  {t('auth.register.agreeToTerms')}{' '}
                  <Link to="/terms" target="_blank" className="text-primary-600 hover:underline">
                    {t('auth.register.termsOfService')}
                  </Link>{' '}
                  {t('common.and')}{' '}
                  <Link to="/privacy" target="_blank" className="text-primary-600 hover:underline">
                    {t('auth.register.privacyPolicy')}
                  </Link>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? (
                <>
                  <span className="spinner spinner-sm" />
                  {t('auth.register.creatingAccount')}
                </>
              ) : (
                t('auth.register.createAccount')
              )}
            </button>

            {/* Trust badge */}
            <p className="text-center text-xs text-gray-500">
              {t('auth.register.dataHostedInEU')}
            </p>
          </form>

          <p className="mt-8 text-center text-sm text-gray-600">
            {t('auth.register.alreadyHaveAccount')}{' '}
            <Link
              to="/login"
              className="font-semibold text-primary-600 hover:text-primary-500"
            >
              {t('auth.register.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
