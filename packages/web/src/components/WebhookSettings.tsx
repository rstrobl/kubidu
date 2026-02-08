import { useState, useEffect } from 'react';
import { apiService } from '../services/api.service';

interface Webhook {
  id: string;
  name: string;
  url: string;
  type: 'DISCORD' | 'SLACK' | 'CUSTOM';
  events: string[];
  enabled: boolean;
  lastDeliveryAt?: string;
  lastDeliveryOk?: boolean;
  failureCount: number;
  createdAt: string;
}

interface WebhookSettingsProps {
  projectId: string;
}

const WEBHOOK_EVENTS = [
  { value: 'deployment.started', label: 'Deployment Started', icon: '🚀' },
  { value: 'deployment.success', label: 'Deployment Succeeded', icon: '✅' },
  { value: 'deployment.failed', label: 'Deployment Failed', icon: '❌' },
  { value: 'deployment.stopped', label: 'Deployment Stopped', icon: '⏹️' },
  { value: 'build.started', label: 'Build Started', icon: '🔧' },
  { value: 'build.success', label: 'Build Succeeded', icon: '🔨' },
  { value: 'build.failed', label: 'Build Failed', icon: '💥' },
  { value: 'service.created', label: 'Service Created', icon: '⚙️' },
  { value: 'service.deleted', label: 'Service Deleted', icon: '🗑️' },
  { value: 'domain.added', label: 'Domain Added', icon: '🌐' },
  { value: 'domain.verified', label: 'Domain Verified', icon: '✓' },
];

const WEBHOOK_TYPES = [
  { value: 'DISCORD', label: 'Discord', icon: '🎮', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'SLACK', label: 'Slack', icon: '💬', color: 'bg-green-100 text-green-700' },
  { value: 'CUSTOM', label: 'Custom', icon: '🔗', color: 'bg-gray-100 text-gray-700' },
];

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function WebhookSettings({ projectId }: WebhookSettingsProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; error?: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    type: 'CUSTOM' as 'DISCORD' | 'SLACK' | 'CUSTOM',
    secret: '',
    events: ['deployment.success', 'deployment.failed'],
  });

  useEffect(() => {
    fetchWebhooks();
  }, [projectId]);

  const fetchWebhooks = async () => {
    try {
      const data = await apiService.getWebhooks(projectId);
      setWebhooks(data);
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await apiService.updateWebhook(projectId, editingId, {
          name: formData.name,
          url: formData.url,
          events: formData.events,
        });
      } else {
        await apiService.createWebhook(projectId, formData);
      }
      
      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchWebhooks();
    } catch (error) {
      console.error('Failed to save webhook:', error);
    }
  };

  const handleEdit = (webhook: Webhook) => {
    setFormData({
      name: webhook.name,
      url: webhook.url,
      type: webhook.type,
      secret: '',
      events: webhook.events,
    });
    setEditingId(webhook.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    
    try {
      await apiService.deleteWebhook(projectId, id);
      fetchWebhooks();
    } catch (error) {
      console.error('Failed to delete webhook:', error);
    }
  };

  const handleToggle = async (webhook: Webhook) => {
    try {
      await apiService.updateWebhook(projectId, webhook.id, {
        enabled: !webhook.enabled,
      });
      fetchWebhooks();
    } catch (error) {
      console.error('Failed to toggle webhook:', error);
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    setTestResult(null);
    
    try {
      const result = await apiService.testWebhook(projectId, id);
      setTestResult({ id, success: result.success, error: result.error });
    } catch (error: any) {
      setTestResult({ id, success: false, error: error.message });
    } finally {
      setTesting(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      type: 'CUSTOM',
      secret: '',
      events: ['deployment.success', 'deployment.failed'],
    });
  };

  const toggleEvent = (event: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span>🔔</span>
            Webhooks
          </h2>
          <p className="text-sm text-gray-500">
            Get notified in Discord, Slack, or custom endpoints
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingId(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          + Add Webhook
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {editingId ? 'Edit Webhook' : 'New Webhook'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Production Alerts"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <div className="flex gap-2">
                    {WEBHOOK_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type.value as any })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
                          formData.type === type.value
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span>{type.icon}</span>
                        <span className="text-sm font-medium">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder={
                      formData.type === 'DISCORD'
                        ? 'https://discord.com/api/webhooks/...'
                        : formData.type === 'SLACK'
                        ? 'https://hooks.slack.com/services/...'
                        : 'https://your-server.com/webhook'
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                    required
                  />
                </div>

                {/* Secret (only for custom) */}
                {formData.type === 'CUSTOM' && !editingId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Secret (optional)
                    </label>
                    <input
                      type="password"
                      value={formData.secret}
                      onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                      placeholder="Used to sign webhook payloads"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      We'll include an HMAC signature in X-Kubidu-Signature header
                    </p>
                  </div>
                )}

                {/* Events */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Events to receive
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {WEBHOOK_EVENTS.map((event) => (
                      <label
                        key={event.value}
                        className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                          formData.events.includes(event.value)
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.events.includes(event.value)}
                          onChange={() => toggleEvent(event.value)}
                          className="sr-only"
                        />
                        <span>{event.icon}</span>
                        <span className="text-sm">{event.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formData.events.length === 0}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {editingId ? 'Save Changes' : 'Create Webhook'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Webhooks List */}
      {webhooks.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 text-center">
          <span className="text-5xl mb-4 block">🔔</span>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No webhooks configured
          </h3>
          <p className="text-gray-500 mb-4">
            Add webhooks to receive notifications in Discord, Slack, or custom endpoints
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
          >
            Add Your First Webhook
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => {
            const typeInfo = WEBHOOK_TYPES.find((t) => t.value === webhook.type);
            const isTestSuccess = testResult?.id === webhook.id;
            
            return (
              <div
                key={webhook.id}
                className={`bg-white rounded-xl border p-4 transition-all ${
                  webhook.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">{webhook.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo?.color}`}>
                        {typeInfo?.icon} {typeInfo?.label}
                      </span>
                      {!webhook.enabled && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 font-mono truncate mb-2">
                      {webhook.url}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.slice(0, 4).map((event) => {
                        const eventInfo = WEBHOOK_EVENTS.find((e) => e.value === event);
                        return (
                          <span
                            key={event}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
                          >
                            {eventInfo?.icon} {eventInfo?.label || event}
                          </span>
                        );
                      })}
                      {webhook.events.length > 4 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                          +{webhook.events.length - 4} more
                        </span>
                      )}
                    </div>
                    
                    {/* Status */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                      {webhook.lastDeliveryAt && (
                        <span className="flex items-center gap-1">
                          {webhook.lastDeliveryOk ? '✅' : '❌'}
                          Last: {formatRelativeTime(webhook.lastDeliveryAt)}
                        </span>
                      )}
                      {webhook.failureCount > 0 && (
                        <span className="text-red-500">
                          {webhook.failureCount} failures
                        </span>
                      )}
                    </div>
                    
                    {/* Test result */}
                    {isTestSuccess && testResult && (
                      <div className={`mt-2 text-sm ${testResult.success ? 'text-success-600' : 'text-red-600'}`}>
                        {testResult.success
                          ? '✅ Test delivery successful!'
                          : `❌ Test failed: ${testResult.error}`}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTest(webhook.id)}
                      disabled={testing === webhook.id}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Send test"
                    >
                      {testing === webhook.id ? (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      ) : (
                        '🧪'
                      )}
                    </button>
                    <button
                      onClick={() => handleToggle(webhook)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title={webhook.enabled ? 'Disable' : 'Enable'}
                    >
                      {webhook.enabled ? '🔔' : '🔕'}
                    </button>
                    <button
                      onClick={() => handleEdit(webhook)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(webhook.id)}
                      className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Help */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
          <span>💡</span>
          Quick Setup
        </h4>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div>
            <h5 className="font-medium text-gray-900 mb-1">🎮 Discord</h5>
            <p>Server Settings → Integrations → Webhooks → New Webhook</p>
          </div>
          <div>
            <h5 className="font-medium text-gray-900 mb-1">💬 Slack</h5>
            <p>Apps → Create App → Incoming Webhooks → Activate</p>
          </div>
          <div>
            <h5 className="font-medium text-gray-900 mb-1">🔗 Custom</h5>
            <p>Any HTTPS endpoint. We'll POST JSON with HMAC signature</p>
          </div>
        </div>
      </div>
    </div>
  );
}
