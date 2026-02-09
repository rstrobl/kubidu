import { useState, useEffect, useMemo } from 'react';
import { Template, TemplateEnvValue, TemplateServiceDef } from '@kubidu/shared';
import { apiService } from '../services/api.service';

interface TemplateDeployModalProps {
  projectId: string;
  template: Template;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface InputField {
  key: string;
  envKey: string;
  serviceName: string;
  label: string;
  default?: string;
  required?: boolean;
  isGenerated?: boolean;
  type: 'text' | 'password' | 'url' | 'email';
}

// Generate a secure random password
function generatePassword(length = 24): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

// Extract input fields from template definition
function extractInputFields(template: Template): InputField[] {
  const definition = template.definition as { services: TemplateServiceDef[] };
  const fields: InputField[] = [];
  
  if (!definition?.services) return fields;

  for (const service of definition.services) {
    if (!service.env) continue;
    
    for (const [envKey, value] of Object.entries(service.env)) {
      if (typeof value === 'object' && value !== null) {
        // Handle input fields - these are user-configurable
        if ('input' in value && value.input) {
          const input = value.input as { label: string; default?: string; required?: boolean };
          const label = input.label;
          
          // Determine input type based on label/key
          let type: 'text' | 'password' | 'url' | 'email' = 'text';
          const lowerLabel = label.toLowerCase();
          const lowerKey = envKey.toLowerCase();
          
          if (lowerLabel.includes('password') || lowerKey.includes('password') || lowerKey.includes('secret')) {
            type = 'password';
          } else if (lowerLabel.includes('url') || lowerLabel.includes('site url') || lowerKey.includes('url')) {
            type = 'url';
          } else if (lowerLabel.includes('email') || lowerKey.includes('email')) {
            type = 'email';
          }

          fields.push({
            key: `${service.name}.${envKey}`,
            envKey,
            serviceName: service.name,
            label: input.label,
            default: input.default,
            required: input.required !== false,
            type,
          });
        }
        
        // Handle generated fields - show them but mark as auto-generated
        if ('generate' in value && value.generate === 'secret') {
          const lowerKey = envKey.toLowerCase();
          // Only show if it's a "main" password field users might want to customize
          const isMainPassword = lowerKey.includes('password') || 
                                  lowerKey.includes('root_password') ||
                                  envKey === 'MINIO_ROOT_PASSWORD' ||
                                  envKey === 'ADMIN_PASSWORD';
          
          if (isMainPassword) {
            // Create human-friendly labels
            let label = envKey
              .replace(/_/g, ' ')
              .replace(/([A-Z])/g, ' $1')
              .trim()
              .split(' ')
              .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(' ');
            
            // Clean up common patterns
            label = label
              .replace('Postgres ', '')
              .replace('Mysql ', 'MySQL ')
              .replace('Mongo Initdb ', '')
              .replace('Minio ', 'MinIO ')
              .replace('Admin ', 'Admin ');
            
            fields.push({
              key: `${service.name}.${envKey}`,
              envKey,
              serviceName: service.name,
              label: label,
              default: undefined,
              required: false,
              isGenerated: true,
              type: 'password',
            });
          }
        }
      }
    }
  }

  return fields;
}

export function TemplateDeployModal({ 
  projectId, 
  template, 
  isOpen, 
  onClose, 
  onSuccess 
}: TemplateDeployModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [generatedPasswords, setGeneratedPasswords] = useState<Record<string, string>>({});

  const inputFields = useMemo(() => extractInputFields(template), [template]);
  const definition = template.definition as { services: TemplateServiceDef[] };
  const serviceCount = definition?.services?.length || 0;

  // Initialize default values and generate passwords for secret fields
  useEffect(() => {
    const defaults: Record<string, string> = {};
    const generated: Record<string, string> = {};
    
    for (const field of inputFields) {
      if (field.default) {
        defaults[field.key] = field.default;
      }
      if (field.isGenerated) {
        generated[field.key] = generatePassword();
      }
    }
    
    setValues(defaults);
    setGeneratedPasswords(generated);
  }, [inputFields]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);

  const handleSubmit = async () => {
    setError('');
    
    // Validate required fields
    for (const field of inputFields) {
      if (field.required && !field.isGenerated) {
        const value = values[field.key];
        if (!value || value.trim() === '') {
          setError(`${field.label} is required`);
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      // Merge user values with generated passwords
      // Only send non-generated values - the backend handles generation
      const inputs: Record<string, string> = {};
      
      for (const field of inputFields) {
        if (!field.isGenerated && values[field.key]) {
          // Use just the envKey as the key, not the full path
          inputs[field.envKey] = values[field.key];
        }
        // For generated fields that user customized, also include them
        if (field.isGenerated && values[field.key]) {
          inputs[field.envKey] = values[field.key];
        }
      }

      await apiService.deployTemplate(projectId, {
        templateId: template.id,
        inputs,
      });
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to deploy template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneratePassword = (fieldKey: string) => {
    const newPassword = generatePassword();
    setGeneratedPasswords(prev => ({ ...prev, [fieldKey]: newPassword }));
    setValues(prev => ({ ...prev, [fieldKey]: newPassword }));
  };

  const toggleShowPassword = (fieldKey: string) => {
    setShowPasswords(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const renderTemplateIcon = () => {
    const icon = template.icon;
    if (icon && (icon.startsWith('http://') || icon.startsWith('https://'))) {
      return <img src={icon} alt={template.name} className="w-12 h-12" />;
    }
    if (icon) {
      return <span className="text-4xl">{icon}</span>;
    }
    const defaultIcons: Record<string, string> = {
      database: '🗄️',
      cms: '📝',
      cache: '⚡',
      messaging: '📨',
      monitoring: '📊',
      automation: '🔄',
      storage: '💾',
    };
    return <span className="text-4xl">{defaultIcons[template.category || ''] || '📦'}</span>;
  };

  if (!isOpen) return null;

  const hasInputFields = inputFields.length > 0;
  const userInputFields = inputFields.filter(f => !f.isGenerated);
  const generatedFields = inputFields.filter(f => f.isGenerated);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
          {/* Header with template info */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-5 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                {renderTemplateIcon()}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{template.name}</h2>
                <p className="text-primary-100 text-sm mt-0.5">
                  {template.description}
                </p>
              </div>
              <button
                onClick={() => !isSubmitting && onClose()}
                className="text-white/70 hover:text-white p-1"
                disabled={isSubmitting}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* What will be created */}
            <div className="mb-5 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Will create {serviceCount} service{serviceCount > 1 ? 's' : ''}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {definition?.services?.map((svc, i) => (
                  <span 
                    key={i} 
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {svc.name}
                  </span>
                ))}
              </div>
            </div>

            {!hasInputFields ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-600">
                  No configuration needed. Click Deploy to get started!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* User input fields */}
                {userInputFields.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Configuration
                    </h3>
                    {userInputFields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <div className="relative">
                          <input
                            type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                            value={values[field.key] || ''}
                            onChange={(e) => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                            placeholder={field.default || `Enter ${field.label.toLowerCase()}`}
                            className="input pr-10"
                          />
                          {field.type === 'password' && (
                            <button
                              type="button"
                              onClick={() => toggleShowPassword(field.key)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPasswords[field.key] ? (
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
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Generated fields (collapsible) */}
                {generatedFields.length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <details className="group">
                      <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700">
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Auto-generated passwords ({generatedFields.length})
                        </span>
                        <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="mt-3 space-y-3 text-sm text-gray-500">
                        <p>These passwords will be auto-generated. You can customize them if needed:</p>
                        {generatedFields.map((field) => (
                          <div key={field.key}>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                              {field.label}
                            </label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <input
                                  type={showPasswords[field.key] ? 'text' : 'password'}
                                  value={values[field.key] || generatedPasswords[field.key] || ''}
                                  onChange={(e) => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                                  className="input text-sm font-mono pr-10"
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleShowPassword(field.key)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  {showPasswords[field.key] ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleGeneratePassword(field.key)}
                                className="btn btn-secondary text-sm px-3"
                                title="Regenerate password"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deploying...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 -ml-1 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Deploy {template.name}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
