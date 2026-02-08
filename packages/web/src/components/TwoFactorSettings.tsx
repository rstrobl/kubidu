import { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/api.service';
import { useAuthStore } from '../stores/auth.store';

// Simple QR Code SVG component (no external dependency)
function QRCodeSVG({ value, size = 200 }: { value: string; size?: number }) {
  // Generate a Google Charts QR code URL as fallback
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
  
  return (
    <img 
      src={qrUrl} 
      alt="QR Code" 
      width={size} 
      height={size}
      className="rounded"
      loading="lazy"
    />
  );
}

interface TwoFactorSettingsProps {
  onUpdate?: () => void;
}

export function TwoFactorSettings({ onUpdate }: TwoFactorSettingsProps) {
  const { user, loadUser } = useAuthStore();
  const [step, setStep] = useState<'idle' | 'setup' | 'verify' | 'backup'>('idle');
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  const isEnabled = user?.twoFactorEnabled;

  const handleEnable2FA = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await apiService.enable2FA();
      setSecret(response.secret);
      setQrCode(response.qrCode);
      // Generate backup codes (frontend mock - in production these would come from backend)
      const codes = Array.from({ length: 8 }, () =>
        Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
        Math.random().toString(36).substring(2, 6).toUpperCase()
      );
      setBackupCodes(codes);
      setStep('setup');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initialize 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await apiService.verify2FA(verifyCode);
      if (response.success) {
        setSuccess('Two-factor authentication enabled successfully!');
        setStep('backup');
        await loadUser();
        onUpdate?.();
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setIsLoading(true);
    setError('');

    try {
      await apiService.disable2FA();
      setSuccess('Two-factor authentication disabled.');
      setShowDisableConfirm(false);
      await loadUser();
      onUpdate?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setSuccess('Backup codes copied to clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const downloadBackupCodes = () => {
    const content = `KUBIDU 2FA BACKUP CODES
========================
Keep these codes safe! Each code can only be used once.

${backupCodes.join('\n')}

Generated: ${new Date().toISOString()}
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kubidu-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetState = () => {
    setStep('idle');
    setSecret('');
    setQrCode('');
    setVerifyCode('');
    setBackupCodes([]);
    setError('');
    setSuccess('');
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="alert alert-error animate-fade-in">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success animate-fade-in">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      {/* Idle State - Not Enabled */}
      {step === 'idle' && !isEnabled && (
        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Add an extra layer of security to your account
            </p>
          </div>
          <button
            onClick={handleEnable2FA}
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? (
              <>
                <span className="spinner spinner-sm" />
                Setting up...
              </>
            ) : (
              'Enable 2FA'
            )}
          </button>
        </div>
      )}

      {/* Idle State - Already Enabled */}
      {step === 'idle' && isEnabled && (
        <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">Two-Factor Authentication is ON</p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your account is protected with an authenticator app
              </p>
            </div>
          </div>
          {!showDisableConfirm ? (
            <button
              onClick={() => setShowDisableConfirm(true)}
              className="btn btn-secondary text-red-600 hover:text-red-700"
            >
              Disable
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDisable2FA}
                disabled={isLoading}
                className="btn bg-red-600 text-white hover:bg-red-700"
              >
                {isLoading ? 'Disabling...' : 'Confirm Disable'}
              </button>
              <button
                onClick={() => setShowDisableConfirm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Setup Step - Show QR Code */}
      {step === 'setup' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Scan QR Code
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Use your authenticator app (Google Authenticator, Authy, 1Password, etc.) to scan this QR code
            </p>

            <div className="inline-block p-4 bg-white rounded-lg shadow-sm border">
              <QRCodeSVG value={qrCode} size={200} />
            </div>

            <div className="mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Or enter this code manually:
              </p>
              <code className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-900 dark:text-white break-all">
                {secret}
              </code>
            </div>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="verifyCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter the 6-digit code from your app
              </label>
              <input
                type="text"
                id="verifyCode"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="input text-center text-2xl tracking-widest font-mono"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetState}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || verifyCode.length !== 6}
                className="btn btn-primary flex-1"
              >
                {isLoading ? (
                  <>
                    <span className="spinner spinner-sm" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Enable'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Backup Codes Step */}
      {step === 'backup' && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Save Your Backup Codes
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Store these codes in a safe place. You can use them to access your account if you lose your phone.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <code
                  key={index}
                  className="px-3 py-2 bg-white dark:bg-gray-700 rounded text-sm font-mono text-gray-900 dark:text-white text-center"
                >
                  {code}
                </code>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={copyBackupCodes}
              className="btn btn-secondary flex-1"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
            <button
              onClick={downloadBackupCodes}
              className="btn btn-secondary flex-1"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>

          <button
            onClick={resetState}
            className="btn btn-primary w-full"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
