import axios, { AxiosInstance, AxiosError } from 'axios';
import config from './config';

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  name: string;
  projectId: string;
  status: 'pending' | 'building' | 'deploying' | 'running' | 'failed' | 'stopped';
  replicas: number;
  image?: string;
  port?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Deployment {
  id: string;
  serviceId: string;
  status: 'pending' | 'building' | 'deploying' | 'success' | 'failed';
  commitSha?: string;
  commitMessage?: string;
  createdAt: string;
  finishedAt?: string;
}

export interface EnvVar {
  key: string;
  value: string;
  isSecret: boolean;
}

export interface Domain {
  id: string;
  domain: string;
  serviceId: string;
  status: 'pending' | 'active' | 'failed';
  sslStatus: 'pending' | 'active' | 'failed';
  createdAt: string;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source?: string;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': '@kubidu/cli',
      },
    });

    // Add auth token to all requests
    this.client.interceptors.request.use((reqConfig) => {
      const token = config.getApiToken();
      if (token) {
        reqConfig.headers.Authorization = `Bearer ${token}`;
      }
      reqConfig.baseURL = config.getApiUrl();
      return reqConfig;
    });

    // Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<{ message?: string }>) => {
        if (error.response?.status === 401) {
          throw new Error('Authentication required. Please run: kubidu login');
        }
        if (error.response?.status === 403) {
          throw new Error('Access denied. You do not have permission for this action.');
        }
        if (error.response?.status === 404) {
          throw new Error('Resource not found.');
        }
        const message = error.response?.data?.message || error.message;
        throw new Error(message);
      }
    );
  }

  // Auth
  async getAuthUrl(): Promise<{ url: string; token: string }> {
    const { data } = await this.client.post('/auth/cli/init');
    return data;
  }

  async pollAuthStatus(token: string): Promise<{ apiToken: string; user: User } | null> {
    try {
      const { data } = await this.client.get(`/auth/cli/status/${token}`);
      return data;
    } catch {
      return null;
    }
  }

  async getCurrentUser(): Promise<User> {
    const { data } = await this.client.get('/users/me');
    return data;
  }

  // Projects
  async listProjects(): Promise<Project[]> {
    const { data } = await this.client.get('/projects');
    return data;
  }

  async getProject(id: string): Promise<Project> {
    const { data } = await this.client.get(`/projects/${id}`);
    return data;
  }

  async createProject(name: string, description?: string): Promise<Project> {
    const { data } = await this.client.post('/projects', { name, description });
    return data;
  }

  // Services
  async listServices(projectId: string): Promise<Service[]> {
    const { data } = await this.client.get(`/projects/${projectId}/services`);
    return data;
  }

  async getService(projectId: string, serviceId: string): Promise<Service> {
    const { data } = await this.client.get(`/projects/${projectId}/services/${serviceId}`);
    return data;
  }

  async createService(projectId: string, name: string, config?: Partial<Service>): Promise<Service> {
    const { data } = await this.client.post(`/projects/${projectId}/services`, { name, ...config });
    return data;
  }

  async scaleService(projectId: string, serviceId: string, replicas: number): Promise<Service> {
    const { data } = await this.client.patch(`/projects/${projectId}/services/${serviceId}`, { replicas });
    return data;
  }

  // Deployments
  async deploy(projectId: string, serviceId: string, archive: Buffer): Promise<Deployment> {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('archive', archive, { filename: 'source.tar.gz', contentType: 'application/gzip' });

    const { data } = await this.client.post(
      `/projects/${projectId}/services/${serviceId}/deploy`,
      form,
      { headers: form.getHeaders() }
    );
    return data;
  }

  async getDeployment(projectId: string, serviceId: string, deploymentId: string): Promise<Deployment> {
    const { data } = await this.client.get(
      `/projects/${projectId}/services/${serviceId}/deployments/${deploymentId}`
    );
    return data;
  }

  async listDeployments(projectId: string, serviceId: string): Promise<Deployment[]> {
    const { data } = await this.client.get(`/projects/${projectId}/services/${serviceId}/deployments`);
    return data;
  }

  // Environment Variables
  async listEnvVars(projectId: string, serviceId: string): Promise<EnvVar[]> {
    const { data } = await this.client.get(`/projects/${projectId}/services/${serviceId}/env`);
    return data;
  }

  async setEnvVar(projectId: string, serviceId: string, key: string, value: string, isSecret = false): Promise<void> {
    await this.client.post(`/projects/${projectId}/services/${serviceId}/env`, { key, value, isSecret });
  }

  async deleteEnvVar(projectId: string, serviceId: string, key: string): Promise<void> {
    await this.client.delete(`/projects/${projectId}/services/${serviceId}/env/${key}`);
  }

  // Domains
  async listDomains(projectId: string, serviceId: string): Promise<Domain[]> {
    const { data } = await this.client.get(`/projects/${projectId}/services/${serviceId}/domains`);
    return data;
  }

  async addDomain(projectId: string, serviceId: string, domain: string): Promise<Domain> {
    const { data } = await this.client.post(`/projects/${projectId}/services/${serviceId}/domains`, { domain });
    return data;
  }

  async deleteDomain(projectId: string, serviceId: string, domainId: string): Promise<void> {
    await this.client.delete(`/projects/${projectId}/services/${serviceId}/domains/${domainId}`);
  }

  // Logs
  getLogsStreamUrl(projectId: string, serviceId: string): string {
    const baseUrl = config.getApiUrl().replace('http', 'ws');
    const token = config.getApiToken();
    return `${baseUrl}/projects/${projectId}/services/${serviceId}/logs/stream?token=${token}`;
  }

  async getLogs(projectId: string, serviceId: string, lines = 100): Promise<LogEntry[]> {
    const { data } = await this.client.get(
      `/projects/${projectId}/services/${serviceId}/logs?lines=${lines}`
    );
    return data;
  }

  // Status
  async getServiceStatus(projectId: string, serviceId: string): Promise<{
    service: Service;
    deployment?: Deployment;
    metrics?: { cpu: number; memory: number };
  }> {
    const { data } = await this.client.get(`/projects/${projectId}/services/${serviceId}/status`);
    return data;
  }
}

export const api = new ApiClient();
export default api;
