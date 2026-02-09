import { AuditLoggerMiddleware } from '../audit-logger.middleware';
import { PrismaService } from '../../database/prisma.service';

// Mock the shared package
jest.mock('@kubidu/shared', () => ({
  maskSensitiveData: jest.fn((data) => ({ ...data, password: '***' })),
}));

describe('AuditLoggerMiddleware', () => {
  let middleware: AuditLoggerMiddleware;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;
  let originalSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    } as any;

    middleware = new AuditLoggerMiddleware(mockPrisma);

    originalSend = jest.fn().mockReturnThis();
    mockRequest = {
      method: 'POST',
      path: '/api/projects/123e4567-e89b-12d3-a456-426614174000',
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      headers: { 'user-agent': 'test-agent' },
      query: { test: 'query' },
      body: { name: 'test', password: 'secret' },
      user: { id: 'user-123' },
    };
    mockResponse = {
      send: originalSend,
      statusCode: 200,
    };
    mockNext = jest.fn();
  });

  describe('use', () => {
    it('should call next function', () => {
      middleware.use(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should override response send function', () => {
      middleware.use(mockRequest, mockResponse, mockNext);
      expect(mockResponse.send).not.toBe(originalSend);
    });

    it('should audit POST requests', async () => {
      middleware.use(mockRequest, mockResponse, mockNext);

      // Call the overridden send function
      mockResponse.send('response data');

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          action: 'POST /api/projects/123e4567-e89b-12d3-a456-426614174000',
          resource: 'projects',
          resourceId: '123e4567-e89b-12d3-a456-426614174000',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          metadata: expect.objectContaining({
            statusCode: 200,
          }),
        }),
      });
    });

    it('should audit PUT requests', async () => {
      mockRequest.method = 'PUT';
      middleware.use(mockRequest, mockResponse, mockNext);
      mockResponse.send('response data');

      await new Promise(resolve => setImmediate(resolve));

      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should audit PATCH requests', async () => {
      mockRequest.method = 'PATCH';
      middleware.use(mockRequest, mockResponse, mockNext);
      mockResponse.send('response data');

      await new Promise(resolve => setImmediate(resolve));

      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should audit DELETE requests', async () => {
      mockRequest.method = 'DELETE';
      middleware.use(mockRequest, mockResponse, mockNext);
      mockResponse.send('response data');

      await new Promise(resolve => setImmediate(resolve));

      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should NOT audit GET requests', async () => {
      mockRequest.method = 'GET';
      middleware.use(mockRequest, mockResponse, mockNext);
      mockResponse.send('response data');

      await new Promise(resolve => setImmediate(resolve));

      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('should NOT audit health check endpoints', async () => {
      mockRequest.path = '/api/health';
      middleware.use(mockRequest, mockResponse, mockNext);
      mockResponse.send('response data');

      await new Promise(resolve => setImmediate(resolve));

      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('should handle requests without user', async () => {
      mockRequest.user = undefined;
      middleware.use(mockRequest, mockResponse, mockNext);
      mockResponse.send('response data');

      await new Promise(resolve => setImmediate(resolve));

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
        }),
      });
    });

    it('should use socket.remoteAddress when ip is not available', async () => {
      mockRequest.ip = undefined;
      middleware.use(mockRequest, mockResponse, mockNext);
      mockResponse.send('response data');

      await new Promise(resolve => setImmediate(resolve));

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: '127.0.0.1',
        }),
      });
    });

    it('should handle missing IP address gracefully', async () => {
      mockRequest.ip = undefined;
      mockRequest.socket = {};
      middleware.use(mockRequest, mockResponse, mockNext);
      mockResponse.send('response data');

      await new Promise(resolve => setImmediate(resolve));

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: null,
        }),
      });
    });

    it('should handle missing user-agent header', async () => {
      mockRequest.headers = {};
      middleware.use(mockRequest, mockResponse, mockNext);
      mockResponse.send('response data');

      await new Promise(resolve => setImmediate(resolve));

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userAgent: null,
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.auditLog.create = jest.fn().mockRejectedValue(new Error('DB error'));

      middleware.use(mockRequest, mockResponse, mockNext);
      mockResponse.send('response data');

      // Should not throw
      await new Promise(resolve => setImmediate(resolve));

      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should return original send return value', () => {
      const sendResult = { success: true };
      originalSend.mockReturnValue(sendResult);

      middleware.use(mockRequest, mockResponse, mockNext);
      const result = mockResponse.send('response data');

      expect(result).toBe(sendResult);
    });
  });

  describe('extractResourceType', () => {
    it('should extract resource type from path', async () => {
      mockRequest.path = '/api/projects/123';
      middleware.use(mockRequest, mockResponse, mockNext);
      mockResponse.send('data');

      await new Promise(resolve => setImmediate(resolve));

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          resource: 'projects',
        }),
      });
    });

    it('should return null for paths without resource', async () => {
      mockRequest.path = '/';
      middleware.use(mockRequest, mockResponse, mockNext);
      mockResponse.send('data');

      await new Promise(resolve => setImmediate(resolve));

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          resource: 'unknown',
        }),
      });
    });
  });

  describe('extractResourceId', () => {
    it('should extract UUID from path', async () => {
      mockRequest.path = '/api/users/550e8400-e29b-41d4-a716-446655440000/profile';
      middleware.use(mockRequest, mockResponse, mockNext);
      mockResponse.send('data');

      await new Promise(resolve => setImmediate(resolve));

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          resourceId: '550e8400-e29b-41d4-a716-446655440000',
        }),
      });
    });

    it('should return null when no UUID in path', async () => {
      mockRequest.path = '/api/health';
      mockRequest.method = 'POST'; // Make it auditable
      middleware.use(mockRequest, mockResponse, mockNext);
      mockResponse.send('data');

      // Health endpoint is skipped, test a different path
      mockRequest.path = '/api/users/list';
      middleware.use(mockRequest, mockResponse, mockNext);
      mockResponse.send('data');

      await new Promise(resolve => setImmediate(resolve));

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          resourceId: null,
        }),
      });
    });
  });
});
