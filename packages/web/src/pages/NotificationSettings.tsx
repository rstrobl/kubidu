import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore, NotificationPreferences } from '../stores/notification.store';
import { toast } from 'sonner';

export function NotificationSettings() {
  const navigate = useNavigate();
  const { preferences, loadPreferences, updatePreferences, isLoading } = useNotificationStore();
  const [localPrefs, setLocalPrefs] = useState<NotificationPreferences | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences);
    }
  }, [preferences]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    if (!localPrefs) return;
    setLocalPrefs({
      ...localPrefs,
      [key]: !localPrefs[key],
    });
  };

  const handleSave = async () => {
    if (!localPrefs) return;

    setIsSaving(true);
    try {
      await updatePreferences(localPrefs);
      toast.success('Notification preferences saved');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !localPrefs) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-0">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const notificationGroups = [
    {
      title: 'Deployments',
      description: 'Notifications about your deployment status changes',
      items: [
        {
          key: 'emailDeploySuccess' as const,
          label: 'Deployment Success',
          description: 'Get notified when a deployment completes successfully',
        },
        {
          key: 'emailDeployFailed' as const,
          label: 'Deployment Failed',
          description: 'Get notified when a deployment fails or crashes',
        },
      ],
    },
    {
      title: 'Builds',
      description: 'Notifications about your build process',
      items: [
        {
          key: 'emailBuildFailed' as const,
          label: 'Build Failed',
          description: 'Get notified when a build fails',
        },
      ],
    },
    {
      title: 'Domains',
      description: 'Notifications about your custom domains',
      items: [
        {
          key: 'emailDomainVerified' as const,
          label: 'Domain Verification',
          description: 'Get notified when domain verification succeeds or fails',
        },
      ],
    },
    {
      title: 'Workspace',
      description: 'Notifications about workspace member activity',
      items: [
        {
          key: 'emailInvitations' as const,
          label: 'Workspace Invitations',
          description: 'Get notified when someone is invited to your workspace',
        },
        {
          key: 'emailRoleChanges' as const,
          label: 'Role Changes',
          description: 'Get notified when your workspace role changes',
        },
      ],
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-0">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Notification Preferences</h1>
        <p className="mt-2 text-gray-600">
          Choose which email notifications you want to receive
        </p>
      </div>

      <div className="space-y-6">
        {notificationGroups.map((group) => (
          <div key={group.title} className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{group.title}</h2>
            <p className="text-sm text-gray-500 mb-4">{group.description}</p>

            <div className="space-y-4">
              {group.items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-medium text-gray-700">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={localPrefs[item.key]}
                    onClick={() => handleToggle(item.key)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      localPrefs[item.key] ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        localPrefs[item.key] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary"
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
