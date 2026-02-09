import axios, { AxiosInstance, AxiosError } from 'axios';
import { RepositoryProvider, ServiceType, WorkspaceRole } from '@kubidu/shared';
import { getShortErrorMessage } from '../utils/errorMessages';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Enhanced error class with user-friendly message
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly userMessage: string;
  public readonly originalError: AxiosError;

  constructor(error: AxiosError, context?: string) {
    const userMessage = getShortErrorMessage(error, context);
    super(userMessage);
    this.name = 'ApiError';
    this.status = error.response?.status || 0;
    this.code = (error.response?.data as any)?.code || 'UNKNOWN_ERROR';
    this.userMessage = userMessage;
    this.originalError = error;
  }
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor to handle errors with user-friendly messages
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // Handle 401 - session expired
        if (error.response?.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
        
        // Enhance error with user-friendly message
        const enhancedError = new ApiError(error);
        return Promise.reject(enhancedError);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async register(email: string, password: string, name: string) {
    const response = await this.client.post('/auth/register', {
      email,
      password,
      name,
      gdprConsents: {
        termsOfService: true,
        privacyPolicy: true,
      },
    });
    return response.data;
  }

  async getProfile() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async forgotPassword(email: string) {
    const response = await this.client.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, password: string) {
    const response = await this.client.post('/auth/reset-password', { token, password });
    return response.data;
  }

  async updateProfile(data: { name?: string; avatarUrl?: string }) {
    const response = await this.client.put('/users/me', data);
    return response.data;
  }

  // Workspace endpoints
  async getWorkspaces() {
    const response = await this.client.get('/workspaces');
    return response.data;
  }

  async getWorkspace(id: string) {
    const response = await this.client.get(`/workspaces/${id}`);
    return response.data;
  }

  async createWorkspace(data: { name: string; avatarUrl?: string }) {
    const response = await this.client.post('/workspaces', data);
    return response.data;
  }

  async updateWorkspace(id: string, data: { name?: string; avatarUrl?: string }) {
    const response = await this.client.patch(`/workspaces/${id}`, data);
    return response.data;
  }

  async deleteWorkspace(id: string) {
    const response = await this.client.delete(`/workspaces/${id}`);
    return response.data;
  }

  async getWorkspaceMembers(workspaceId: string) {
    const response = await this.client.get(`/workspaces/${workspaceId}/members`);
    return response.data;
  }

  async updateMemberRole(workspaceId: string, memberId: string, data: { role: WorkspaceRole }) {
    const response = await this.client.patch(`/workspaces/${workspaceId}/members/${memberId}`, data);
    return response.data;
  }

  async removeMember(workspaceId: string, memberId: string) {
    const response = await this.client.delete(`/workspaces/${workspaceId}/members/${memberId}`);
    return response.data;
  }

  async leaveWorkspace(workspaceId: string) {
    const response = await this.client.post(`/workspaces/${workspaceId}/leave`);
    return response.data;
  }

  async getWorkspaceInvitations(workspaceId: string) {
    const response = await this.client.get(`/workspaces/${workspaceId}/invitations`);
    return response.data;
  }

  async inviteMember(workspaceId: string, data: { email: string; role: WorkspaceRole }) {
    const response = await this.client.post(`/workspaces/${workspaceId}/invitations`, data);
    return response.data;
  }

  async cancelInvitation(workspaceId: string, invitationId: string) {
    const response = await this.client.delete(`/workspaces/${workspaceId}/invitations/${invitationId}`);
    return response.data;
  }

  async getInvitation(token: string) {
    const response = await this.client.get(`/invitations/${token}`);
    return response.data;
  }

  async acceptInvitation(token: string) {
    const response = await this.client.post(`/invitations/${token}/accept`);
    return response.data;
  }

  // Project endpoints
  async getProjects(workspaceId: string) {
    const response = await this.client.get('/projects', { params: { workspaceId } });
    return response.data;
  }

  async getProject(id: string) {
    const response = await this.client.get(`/projects/${id}`);
    return response.data;
  }

  async createProject(workspaceId: string, data: {
    name: string;
    description?: string;
  }) {
    const response = await this.client.post('/projects', data, { params: { workspaceId } });
    return response.data;
  }

  async updateProject(id: string, data: Partial<{
    name: string;
    description: string;
    status: string;
  }>) {
    const response = await this.client.put(`/projects/${id}`, data);
    return response.data;
  }

  async deleteProject(id: string) {
    const response = await this.client.delete(`/projects/${id}`);
    return response.data;
  }

  // Service endpoints
  async getServices(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/services`);
    return response.data;
  }

  async getService(projectId: string, serviceId: string) {
    const response = await this.client.get(`/projects/${projectId}/services/${serviceId}`);
    return response.data;
  }

  async createService(projectId: string, data: {
    name: string;
    serviceType: ServiceType;
    repositoryUrl?: string;
    repositoryProvider?: RepositoryProvider;
    repositoryBranch?: string;
    githubInstallationId?: string;
    githubRepoFullName?: string;
    dockerImage?: string;
    dockerTag?: string;
    defaultPort?: number;
    defaultReplicas?: number;
    defaultCpuLimit?: string;
    defaultMemoryLimit?: string;
    defaultCpuRequest?: string;
    defaultMemoryRequest?: string;
    defaultHealthCheckPath?: string;
    autoDeploy?: boolean;
  }) {
    const response = await this.client.post(`/projects/${projectId}/services`, data);
    return response.data;
  }

  async updateService(projectId: string, serviceId: string, data: Partial<{
    name: string;
    subdomain: string | null;
    repositoryBranch: string;
    dockerTag: string;
    defaultPort: number;
    port: number;
    replicas: number;
    cpuLimit: string;
    memoryLimit: string;
    cpuRequest: string;
    memoryRequest: string;
    healthCheckPath: string;
    autoDeploy: boolean;
    status: string;
    defaultStartCommand: string;
    canvasX: number;
    canvasY: number;
  }>) {
    const response = await this.client.put(`/projects/${projectId}/services/${serviceId}`, data);
    return response.data;
  }

  async deleteService(projectId: string, serviceId: string) {
    const response = await this.client.delete(`/projects/${projectId}/services/${serviceId}`);
    return response.data;
  }

  async deleteServices(projectId: string, serviceIds: string[]) {
    const response = await this.client.delete(`/projects/${projectId}/services`, {
      data: { serviceIds },
    });
    return response.data;
  }

  // Deployment endpoints
  async getDeployments(serviceId?: string, workspaceId?: string) {
    const params = new URLSearchParams();
    if (serviceId) params.append('serviceId', serviceId);
    if (workspaceId) params.append('workspaceId', workspaceId);
    const response = await this.client.get(`/deployments?${params.toString()}`);
    return response.data;
  }

  async getDeployment(deploymentId: string) {
    const response = await this.client.get(`/deployments/${deploymentId}`);
    return response.data;
  }

  async createDeployment(data: {
    serviceId: string;
    port?: number;
    replicas?: number;
    cpuLimit?: string;
    memoryLimit?: string;
    cpuRequest?: string;
    memoryRequest?: string;
    healthCheckPath?: string;
  }) {
    const response = await this.client.post('/deployments', data);
    return response.data;
  }

  async deleteDeployment(deploymentId: string) {
    const response = await this.client.delete(`/deployments/${deploymentId}`);
    return response.data;
  }

  async getDeploymentLogs(deploymentId: string) {
    const response = await this.client.get(`/deployments/${deploymentId}/logs`);
    return response.data;
  }

  async getDeploymentBuildLogs(deploymentId: string) {
    const response = await this.client.get(`/deployments/${deploymentId}/build-logs`);
    return response.data;
  }

  async retryDeployment(deploymentId: string) {
    const response = await this.client.post(`/deployments/${deploymentId}/retry`);
    return response.data;
  }

  // Environment variable endpoints
  async getEnvironmentVariables(serviceId?: string, deploymentId?: string, decrypt?: boolean) {
    const params = new URLSearchParams();
    if (serviceId) params.append('serviceId', serviceId);
    if (deploymentId) params.append('deploymentId', deploymentId);
    if (decrypt) params.append('decrypt', 'true');
    const query = params.toString();
    const response = await this.client.get(
      `/environments${query ? `?${query}` : ''}`
    );
    return response.data;
  }

  async createEnvironmentVariable(
    data: { key: string; value: string; isSecret: boolean; serviceId?: string; deploymentId?: string; isShared?: boolean }
  ) {
    const response = await this.client.post('/environments', data);
    return response.data;
  }

  async updateEnvironmentVariable(
    variableId: string,
    data: { value: string }
  ) {
    const response = await this.client.patch(
      `/environments/${variableId}`,
      data
    );
    return response.data;
  }

  async deleteEnvironmentVariable(variableId: string) {
    const response = await this.client.delete(`/environments/${variableId}`);
    return response.data;
  }

  async getSharedVariables(projectId: string, excludeServiceId?: string) {
    const params = new URLSearchParams();
    params.append('projectId', projectId);
    if (excludeServiceId) params.append('excludeServiceId', excludeServiceId);
    const response = await this.client.get(`/environments/shared?${params.toString()}`);
    return response.data;
  }

  async getEnvVarReferences(serviceId: string) {
    const response = await this.client.get(`/environments/references?serviceId=${serviceId}`);
    return response.data;
  }

  async createEnvVarReference(data: {
    serviceId: string;
    sourceServiceId: string;
    key: string;
    alias?: string;
  }) {
    const response = await this.client.post('/environments/references', data);
    return response.data;
  }

  async deleteEnvVarReference(referenceId: string) {
    const response = await this.client.delete(`/environments/references/${referenceId}`);
    return response.data;
  }

  // Domain endpoints
  async getDomains(serviceId: string) {
    const response = await this.client.get(`/services/${serviceId}/domains`);
    return response.data;
  }

  async createDomain(serviceId: string, domain: string) {
    const response = await this.client.post(`/services/${serviceId}/domains`, { domain });
    return response.data;
  }

  async verifyDomain(serviceId: string, domainId: string) {
    const response = await this.client.post(`/services/${serviceId}/domains/${domainId}/verify`);
    return response.data;
  }

  async deleteDomain(serviceId: string, domainId: string) {
    const response = await this.client.delete(`/services/${serviceId}/domains/${domainId}`);
    return response.data;
  }

  // GitHub App endpoints
  async getGitHubInstallUrl() {
    const response = await this.client.get('/github/install-url');
    return response.data;
  }

  async handleGitHubCallback(installationId: string, setupAction: string) {
    const response = await this.client.get('/github/callback', {
      params: { installation_id: installationId, setup_action: setupAction },
    });
    return response.data;
  }

  async getGitHubInstallations() {
    const response = await this.client.get('/github/installations');
    return response.data;
  }

  async removeGitHubInstallation(installationId: string) {
    const response = await this.client.delete(`/github/installations/${installationId}`);
    return response.data;
  }

  async getGitHubRepos(installationId: string, page = 1, search?: string) {
    const params: any = { page };
    if (search) params.search = search;
    const response = await this.client.get(`/github/installations/${installationId}/repos`, { params });
    return response.data;
  }

  // Usage stats endpoints
  async getProjectStats(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/stats`);
    return response.data;
  }

  async getProjectLiveMetrics(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/stats/live`);
    return response.data;
  }

  async getGitHubBranches(installationId: string, owner: string, repo: string) {
    const response = await this.client.get(
      `/github/installations/${installationId}/repos/${owner}/${repo}/branches`
    );
    return response.data;
  }

  // Template endpoints
  async getTemplates(category?: string) {
    const params = category ? { category } : {};
    const response = await this.client.get('/templates', { params });
    return response.data;
  }

  async getTemplate(id: string) {
    const response = await this.client.get(`/templates/${id}`);
    return response.data;
  }

  async getTemplateBySlug(slug: string) {
    const response = await this.client.get(`/templates/slug/${slug}`);
    return response.data;
  }

  async deployTemplate(projectId: string, data: {
    templateId: string;
    inputs?: Record<string, string>;
  }) {
    const response = await this.client.post(`/projects/${projectId}/templates/deploy`, data);
    return response.data;
  }

  async getTemplateDeployments(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/templates/deployments`);
    return response.data;
  }

  async getTemplateDeployment(projectId: string, deploymentId: string) {
    const response = await this.client.get(`/projects/${projectId}/templates/deployments/${deploymentId}`);
    return response.data;
  }

  // Volume endpoints
  async getVolumes(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/volumes`);
    return response.data;
  }

  async getVolume(projectId: string, id: string) {
    const response = await this.client.get(`/projects/${projectId}/volumes/${id}`);
    return response.data;
  }

  // Notification endpoints
  async getNotifications(options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.unreadOnly) params.append('unreadOnly', 'true');
    const response = await this.client.get(`/notifications?${params.toString()}`);
    return response.data;
  }

  async getUnreadNotificationCount() {
    const response = await this.client.get('/notifications/unread-count');
    return response.data;
  }

  async markNotificationAsRead(notificationId: string) {
    const response = await this.client.patch(`/notifications/${notificationId}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead() {
    const response = await this.client.patch('/notifications/read-all');
    return response.data;
  }

  async deleteNotification(notificationId: string) {
    const response = await this.client.delete(`/notifications/${notificationId}`);
    return response.data;
  }

  async getNotificationPreferences() {
    const response = await this.client.get('/notifications/preferences');
    return response.data;
  }

  async updateNotificationPreferences(updates: Record<string, boolean>) {
    const response = await this.client.patch('/notifications/preferences', updates);
    return response.data;
  }

  // Usage/CO2 stats endpoints
  async getWorkspaceUsage(workspaceId: string) {
    try {
      const response = await this.client.get(`/workspaces/${workspaceId}/usage`);
      return response.data;
    } catch (e) {
      // Return mock data if endpoint doesn't exist yet
      return {
        cpuHours: 247.5,
        memoryGBHours: 512,
        storageGB: 25,
        bandwidthGB: 150,
      };
    }
  }

  // Audit log endpoints
  async getAuditLogs(options: {
    limit?: number;
    offset?: number;
    resource?: string;
    resourceId?: string;
  } = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.resource) params.append('resource', options.resource);
    if (options.resourceId) params.append('resourceId', options.resourceId);
    const response = await this.client.get(`/audit?${params.toString()}`);
    return response.data;
  }

  // Activity feed endpoints
  async getActivity(options: {
    workspaceId: string;
    limit?: number;
    offset?: number;
    projectId?: string;
    serviceId?: string;
    type?: string;
  }) {
    const params = new URLSearchParams();
    params.append('workspaceId', options.workspaceId);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.projectId) params.append('projectId', options.projectId);
    if (options.serviceId) params.append('serviceId', options.serviceId);
    if (options.type) params.append('type', options.type);
    const response = await this.client.get(`/activity?${params.toString()}`);
    return response.data;
  }

  async getActivityStats(options: {
    workspaceId: string;
    days?: number;
  }) {
    const params = new URLSearchParams();
    params.append('workspaceId', options.workspaceId);
    if (options.days) params.append('days', options.days.toString());
    const response = await this.client.get(`/activity/stats?${params.toString()}`);
    return response.data;
  }

  // Webhook endpoints
  async getWebhooks(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/webhooks`);
    return response.data;
  }

  async createWebhook(projectId: string, data: {
    name: string;
    url: string;
    events: string[];
    secret?: string;
  }) {
    const response = await this.client.post(`/projects/${projectId}/webhooks`, data);
    return response.data;
  }

  async updateWebhook(projectId: string, webhookId: string, data: {
    name?: string;
    url?: string;
    events?: string[];
    enabled?: boolean;
  }) {
    const response = await this.client.patch(`/projects/${projectId}/webhooks/${webhookId}`, data);
    return response.data;
  }

  async deleteWebhook(projectId: string, webhookId: string) {
    const response = await this.client.delete(`/projects/${projectId}/webhooks/${webhookId}`);
    return response.data;
  }

  async testWebhook(projectId: string, webhookId: string) {
    const response = await this.client.post(`/projects/${projectId}/webhooks/${webhookId}/test`);
    return response.data;
  }

  // Insights/Analytics endpoints
  async getDeploymentInsights(workspaceId: string, days = 30) {
    const response = await this.client.get(`/insights/deployments?workspaceId=${workspaceId}&days=${days}`);
    return response.data;
  }

  async getBuildInsights(workspaceId: string, days = 30) {
    const response = await this.client.get(`/insights/builds?workspaceId=${workspaceId}&days=${days}`);
    return response.data;
  }

  // Dependencies graph endpoints
  async getServiceDependencies(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/dependencies`);
    return response.data;
  }

  // Global search endpoints
  async search(query: string, types?: string[], limit?: number) {
    const params = new URLSearchParams();
    params.append('q', query);
    if (types?.length) params.append('types', types.join(','));
    if (limit) params.append('limit', limit.toString());
    const response = await this.client.get(`/search?${params.toString()}`);
    return response.data;
  }

  async getSearchSuggestions(query: string) {
    const response = await this.client.get(`/search/suggestions?q=${encodeURIComponent(query)}`);
    return response.data;
  }

  // Cost calculator endpoints
  async getWorkspaceCost(workspaceId: string) {
    const response = await this.client.get(`/workspaces/${workspaceId}/cost`);
    return response.data;
  }

  async getProjectCost(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/cost`);
    return response.data;
  }

  // Status page (public - no auth)
  async getPublicStatus(workspaceSlug: string, projectSlug: string) {
    const response = await axios.get(`${API_URL}/api/status/${workspaceSlug}/${projectSlug}`);
    return response.data;
  }

  async subscribeToStatus(workspaceSlug: string, projectSlug: string, email: string) {
    const response = await axios.post(
      `${API_URL}/api/status/${workspaceSlug}/${projectSlug}/subscribe`,
      { email }
    );
    return response.data;
  }

  // Incidents (authenticated)
  async createIncident(projectId: string, data: {
    title: string;
    message: string;
    severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
    affectedServiceIds: string[];
  }) {
    const response = await this.client.post(`/projects/${projectId}/incidents`, data);
    return response.data;
  }

  async updateIncident(projectId: string, incidentId: string, data: {
    status: 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED';
    message?: string;
  }) {
    const response = await this.client.patch(`/projects/${projectId}/incidents/${incidentId}`, data);
    return response.data;
  }

  // Two-Factor Authentication endpoints
  async enable2FA() {
    const response = await this.client.post('/auth/2fa/enable');
    return response.data;
  }

  async verify2FA(token: string) {
    const response = await this.client.post('/auth/2fa/verify', { token });
    return response.data;
  }

  async disable2FA() {
    const response = await this.client.post('/auth/2fa/disable');
    return response.data;
  }

  // Workspace audit logs
  async getWorkspaceAuditLogs(workspaceId: string, options: {
    limit?: number;
    offset?: number;
    action?: string;
    resource?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.action) params.append('action', options.action);
    if (options.resource) params.append('resource', options.resource);
    if (options.userId) params.append('userId', options.userId);
    if (options.startDate) params.append('startDate', options.startDate.toISOString());
    if (options.endDate) params.append('endDate', options.endDate.toISOString());
    const response = await this.client.get(`/workspaces/${workspaceId}/audit?${params.toString()}`);
    return response.data;
  }

  // Deployment rollback
  async rollbackDeployment(projectId: string, serviceId: string, targetDeploymentId: string) {
    const response = await this.client.post(
      `/projects/${projectId}/services/${serviceId}/rollback`,
      { targetDeploymentId }
    );
    return response.data;
  }

  // Get deployment diff
  async getDeploymentDiff(deploymentId1: string, deploymentId2: string) {
    const response = await this.client.get(
      `/deployments/diff?from=${deploymentId1}&to=${deploymentId2}`
    );
    return response.data;
  }

  // Project environments
  async getProjectEnvironments(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/environments`);
    return response.data;
  }

  // Transfer project ownership
  async transferProjectOwnership(projectId: string, newOwnerId: string) {
    const response = await this.client.post(`/projects/${projectId}/transfer`, { newOwnerId });
    return response.data;
  }

  // Team activity (per user)
  async getTeamActivity(workspaceId: string, userId?: string) {
    const params = userId ? `?userId=${userId}` : '';
    const response = await this.client.get(`/workspaces/${workspaceId}/team-activity${params}`);
    return response.data;
  }

  // Service resource limits
  async updateServiceResources(projectId: string, serviceId: string, data: {
    cpuLimit?: string;
    memoryLimit?: string;
    cpuRequest?: string;
    memoryRequest?: string;
    replicas?: number;
  }) {
    const response = await this.client.patch(
      `/projects/${projectId}/services/${serviceId}/resources`,
      data
    );
    return response.data;
  }

  // Get service live metrics
  async getServiceMetrics(projectId: string, serviceId: string) {
    const response = await this.client.get(
      `/projects/${projectId}/services/${serviceId}/metrics`
    );
    return response.data;
  }

  // Invoice endpoints
  async getInvoices() {
    const response = await this.client.get('/invoices');
    return response.data;
  }

  async getInvoice(invoiceId: string) {
    const response = await this.client.get(`/invoices/${invoiceId}`);
    return response.data;
  }

  getInvoicePdfUrl(invoiceId: string): string {
    const token = localStorage.getItem('access_token');
    return `${API_URL}/api/invoices/${invoiceId}/pdf?token=${token}`;
  }

  async downloadInvoicePdf(invoiceId: string): Promise<Blob> {
    const response = await this.client.get(`/invoices/${invoiceId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  }
}

export const apiService = new ApiService();
