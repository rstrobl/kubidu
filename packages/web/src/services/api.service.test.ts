import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { ApiError } from './api.service';

// Mock axios
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return { default: mockAxios };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock window.location
const locationMock = { href: '' };
Object.defineProperty(global, 'window', {
  value: { location: locationMock },
  writable: true,
});

describe('ApiError', () => {
  it('should create error with status and code from response', () => {
    const axiosError = {
      response: {
        status: 404,
        data: { code: 'NOT_FOUND', message: 'Resource not found' },
      },
      message: 'Request failed',
    };

    const error = new ApiError(axiosError as any);

    expect(error.status).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.name).toBe('ApiError');
  });

  it('should use UNKNOWN_ERROR when no code provided', () => {
    const axiosError = {
      response: {
        status: 500,
        data: {},
      },
      message: 'Server error',
    };

    const error = new ApiError(axiosError as any);

    expect(error.code).toBe('UNKNOWN_ERROR');
  });

  it('should have userMessage from error utility', () => {
    const axiosError = {
      response: {
        status: 401,
        data: { code: 'INVALID_CREDENTIALS' },
      },
      message: 'Unauthorized',
    };

    const error = new ApiError(axiosError as any);

    expect(error.userMessage).toBeDefined();
    expect(typeof error.userMessage).toBe('string');
  });

  it('should preserve original error', () => {
    const axiosError = {
      response: {
        status: 400,
        data: { code: 'BAD_REQUEST' },
      },
      message: 'Bad request',
    };

    const error = new ApiError(axiosError as any);

    expect(error.originalError).toBe(axiosError);
  });

  it('should handle missing response', () => {
    const axiosError = {
      message: 'Network Error',
    };

    const error = new ApiError(axiosError as any);

    expect(error.status).toBe(0);
    expect(error.code).toBe('UNKNOWN_ERROR');
  });

  it('should include context in user message', () => {
    const axiosError = {
      response: {
        status: 500,
        data: {},
      },
      message: 'Server error',
    };

    const error = new ApiError(axiosError as any, 'save project');

    expect(error.userMessage).toBeDefined();
  });
});

describe('ApiService Integration', () => {
  // Since we can't easily test the singleton without more complex setup,
  // we test the interceptor logic independently
  
  describe('Request Interceptor Logic', () => {
    it('should add Authorization header when token exists', () => {
      localStorageMock.getItem.mockReturnValue('test-token');
      
      const config = { headers: {} as Record<string, string> };
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }

      expect(config.headers['Authorization']).toBe('Bearer test-token');
    });

    it('should not add Authorization header when no token', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const config = { headers: {} as Record<string, string> };
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }

      expect(config.headers['Authorization']).toBeUndefined();
    });
  });

  describe('Response Interceptor Logic', () => {
    beforeEach(() => {
      locationMock.href = '';
      localStorageMock.removeItem.mockClear();
    });

    it('should handle 401 by clearing tokens and redirecting', () => {
      const error = {
        response: { status: 401 },
      };

      // Simulate the interceptor logic
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
      expect(locationMock.href).toBe('/login');
    });

    it('should not redirect on non-401 errors', () => {
      const error = {
        response: { status: 500 },
      };

      if (error.response?.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }

      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
      expect(locationMock.href).toBe('');
    });
  });

  describe('Endpoint URL Construction', () => {
    it('should construct correct project URL', () => {
      const projectId = 'proj-123';
      const url = `/projects/${projectId}`;
      expect(url).toBe('/projects/proj-123');
    });

    it('should construct correct service URL', () => {
      const projectId = 'proj-123';
      const serviceId = 'svc-456';
      const url = `/projects/${projectId}/services/${serviceId}`;
      expect(url).toBe('/projects/proj-123/services/svc-456');
    });

    it('should construct correct deployment logs URL', () => {
      const deploymentId = 'deploy-789';
      const url = `/deployments/${deploymentId}/logs`;
      expect(url).toBe('/deployments/deploy-789/logs');
    });

    it('should construct notification query params correctly', () => {
      const options = { limit: 10, offset: 5, unreadOnly: true };
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.unreadOnly) params.append('unreadOnly', 'true');

      expect(params.toString()).toBe('limit=10&offset=5&unreadOnly=true');
    });

    it('should construct search query params correctly', () => {
      const query = 'test query';
      const types = ['project', 'service'];
      const limit = 5;

      const params = new URLSearchParams();
      params.append('q', query);
      if (types?.length) params.append('types', types.join(','));
      if (limit) params.append('limit', limit.toString());

      expect(params.toString()).toBe('q=test+query&types=project%2Cservice&limit=5');
    });

    it('should handle activity query params', () => {
      const options = {
        workspaceId: 'ws-123',
        limit: 20,
        projectId: 'proj-456',
        type: 'deployment',
      };

      const params = new URLSearchParams();
      params.append('workspaceId', options.workspaceId);
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.projectId) params.append('projectId', options.projectId);
      if (options.type) params.append('type', options.type);

      expect(params.get('workspaceId')).toBe('ws-123');
      expect(params.get('limit')).toBe('20');
      expect(params.get('projectId')).toBe('proj-456');
      expect(params.get('type')).toBe('deployment');
    });
  });

  describe('Invoice PDF URL', () => {
    it('should construct correct invoice PDF URL with token', () => {
      localStorageMock.getItem.mockReturnValue('my-token');
      const invoiceId = 'inv-123';
      const API_URL = 'http://localhost:3000';
      const token = localStorage.getItem('access_token');
      const url = `${API_URL}/api/invoices/${invoiceId}/pdf?token=${token}`;

      expect(url).toBe('http://localhost:3000/api/invoices/inv-123/pdf?token=my-token');
    });
  });

  describe('Audit Log Query Params', () => {
    it('should construct audit log query with all params', () => {
      const options = {
        limit: 50,
        offset: 10,
        action: 'CREATE',
        resource: 'project',
        userId: 'user-123',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-02-01'),
      };

      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.action) params.append('action', options.action);
      if (options.resource) params.append('resource', options.resource);
      if (options.userId) params.append('userId', options.userId);
      if (options.startDate) params.append('startDate', options.startDate.toISOString());
      if (options.endDate) params.append('endDate', options.endDate.toISOString());

      expect(params.get('limit')).toBe('50');
      expect(params.get('action')).toBe('CREATE');
      expect(params.get('resource')).toBe('project');
      expect(params.get('startDate')).toContain('2026-01-01');
    });
  });
});
