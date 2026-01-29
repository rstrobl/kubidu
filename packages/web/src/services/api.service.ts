import axios, { AxiosInstance } from 'axios';
import { RepositoryProvider, ServiceType } from '@kubidu/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

    // Add response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Clear tokens and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
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

  // Project endpoints
  async getProjects() {
    const response = await this.client.get('/projects');
    return response.data;
  }

  async getProject(id: string) {
    const response = await this.client.get(`/projects/${id}`);
    return response.data;
  }

  async createProject(data: {
    name: string;
    description?: string;
  }) {
    const response = await this.client.post('/projects', data);
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
  }>) {
    const response = await this.client.put(`/projects/${projectId}/services/${serviceId}`, data);
    return response.data;
  }

  async deleteService(projectId: string, serviceId: string) {
    const response = await this.client.delete(`/projects/${projectId}/services/${serviceId}`);
    return response.data;
  }

  // Deployment endpoints
  async getDeployments(serviceId?: string) {
    const params = new URLSearchParams();
    if (serviceId) params.append('serviceId', serviceId);
    const query = params.toString();
    const response = await this.client.get(`/deployments${query ? `?${query}` : ''}`);
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
    data: { key: string; value: string; isSecret: boolean; serviceId?: string; deploymentId?: string }
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
}

export const apiService = new ApiService();
