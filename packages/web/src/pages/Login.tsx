import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/auth.store';

export function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/projects');
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.errors.invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
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
              {t('auth.login.title')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('auth.login.subtitle')}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error animate-fade-in">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="input-group">
                <label htmlFor="email" className="label">
                  {t('auth.login.email')}
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
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="label">
                    {t('auth.login.password')}
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-primary-600 hover:text-primary-500"
                  >
                    {t('auth.login.forgotPassword')}
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="input"
                  placeholder={t('auth.login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
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
                  {t('auth.login.signingIn')}
                </>
              ) : (
                t('auth.login.signIn')
              )}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">{t('auth.login.orContinueWith')}</span>
              </div>
            </div>

            {/* Social login */}
            <a
              href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/github`}
              className="btn btn-secondary w-full flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              {t('auth.login.continueWithGitHub')}
            </a>
          </form>

          <p className="mt-8 text-center text-sm text-gray-600">
            {t('auth.login.noAccount')}{' '}
            <Link
              to="/register"
              className="font-semibold text-primary-600 hover:text-primary-500"
            >
              {t('auth.login.signUpFree')}
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:block lg:flex-1 bg-gradient-to-br from-primary-600 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px]" />
        <div className="relative h-full flex flex-col items-center justify-center p-12">
          <div className="max-w-md text-center text-white">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm mb-8">
              <span className="w-2 h-2 bg-success-400 rounded-full animate-pulse" />
              <span>{t('auth.login.trustedByTeams')}</span>
            </div>
            <h2 className="text-3xl font-bold mb-4">
              {t('auth.login.deployWithConfidence')}
            </h2>
            <p className="text-primary-100 text-lg">
              {t('auth.login.loginDescription')}
            </p>
            
            {/* Trust badges */}
            <div className="mt-12 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <span className="text-2xl">🇪🇺</span>
                <div className="text-left">
                  <div className="font-semibold">{t('landing.trustBadges.euHosted')}</div>
                  <div className="text-sm text-primary-200">{t('landing.trustBadges.frankfurtGermany')}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <span className="text-2xl">🔒</span>
                <div className="text-left">
                  <div className="font-semibold">{t('auth.login.gdprReady')}</div>
                  <div className="text-sm text-primary-200">{t('auth.login.byDefault')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
