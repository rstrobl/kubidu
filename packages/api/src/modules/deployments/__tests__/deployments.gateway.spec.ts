import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { DeploymentsGateway } from '../deployments.gateway';
import { DeploymentsService } from '../deployments.service';
import { Server, Socket } from 'socket.io';

describe('DeploymentsGateway', () => {
  let gateway: DeploymentsGateway;
  let deploymentsService: DeploymentsService;
  let jwtService: JwtService;

  const mockDeploymentsService = {
    findOne: jest.fn(),
    getLogs: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const createMockSocket = (overrides: Partial<Socket> = {}): Socket => ({
    id: 'socket-123',
    data: {},
    handshake: {
      auth: { token: 'valid-token' },
      headers: {},
    },
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    ...overrides,
  } as any);

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeploymentsGateway,
        { provide: DeploymentsService, useValue: mockDeploymentsService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    gateway = module.get<DeploymentsGateway>(DeploymentsGateway);
    deploymentsService = module.get(DeploymentsService);
    jwtService = module.get(JwtService);

    // Set the server
    gateway.server = mockServer as any;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('handleConnection', () => {
    it('should authenticate client with valid token from auth', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ id: 'user-123' });
      const client = createMockSocket();

      await gateway.handleConnection(client);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
      expect(client.data.userId).toBe('user-123');
    });

    it('should authenticate client with token from authorization header', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ id: 'user-123' });
      const client = createMockSocket({
        handshake: {
          auth: {},
          headers: { authorization: 'Bearer header-token' },
        },
      } as any);

      await gateway.handleConnection(client);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('header-token');
    });

    it('should disconnect client with no token', async () => {
      const client = createMockSocket({
        handshake: {
          auth: {},
          headers: {},
        },
      } as any);

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should disconnect client with invalid token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));
      const client = createMockSocket();

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should clean up log stream on disconnect', async () => {
      // First subscribe to logs to create a stream
      mockJwtService.verifyAsync.mockResolvedValue({ id: 'user-123' });
      const client = createMockSocket();
      client.data.userId = 'user-123';

      mockDeploymentsService.findOne.mockResolvedValue({ id: 'deploy-123' });
      mockDeploymentsService.getLogs.mockResolvedValue('Initial logs');

      await gateway.handleSubscribeLogs(client, { deploymentId: 'deploy-123' });

      // Now disconnect
      gateway.handleDisconnect(client);

      // Verify no more logs are emitted after disconnect
      jest.advanceTimersByTime(5000);
      expect(client.emit).toHaveBeenCalledTimes(1); // Only initial logs
    });

    it('should handle disconnect without active log stream', () => {
      const client = createMockSocket();

      // Should not throw
      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  describe('handleSubscribeDeployment', () => {
    it('should join deployment room on valid subscription', async () => {
      const client = createMockSocket();
      client.data.userId = 'user-123';
      mockDeploymentsService.findOne.mockResolvedValue({ id: 'deploy-123' });

      const result = await gateway.handleSubscribeDeployment(client, {
        deploymentId: 'deploy-123',
      });

      expect(result).toEqual({ success: true });
      expect(client.join).toHaveBeenCalledWith('deployment:deploy-123');
      expect(mockDeploymentsService.findOne).toHaveBeenCalledWith('user-123', 'deploy-123');
    });

    it('should return error when deployment not accessible', async () => {
      const client = createMockSocket();
      client.data.userId = 'user-123';
      mockDeploymentsService.findOne.mockRejectedValue(new Error('Not found'));

      const result = await gateway.handleSubscribeDeployment(client, {
        deploymentId: 'deploy-123',
      });

      expect(result).toEqual({ success: false, error: 'Not found' });
      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('handleUnsubscribeDeployment', () => {
    it('should leave deployment room', async () => {
      const client = createMockSocket();

      const result = await gateway.handleUnsubscribeDeployment(client, {
        deploymentId: 'deploy-123',
      });

      expect(result).toEqual({ success: true });
      expect(client.leave).toHaveBeenCalledWith('deployment:deploy-123');
    });
  });

  describe('handleSubscribeLogs', () => {
    it('should send initial logs and set up polling', async () => {
      const client = createMockSocket();
      client.data.userId = 'user-123';
      mockDeploymentsService.findOne.mockResolvedValue({ id: 'deploy-123' });
      mockDeploymentsService.getLogs.mockResolvedValue('Initial logs\nLine 2');

      const result = await gateway.handleSubscribeLogs(client, {
        deploymentId: 'deploy-123',
      });

      expect(result).toEqual({ success: true });
      expect(client.emit).toHaveBeenCalledWith('logs:data', {
        deploymentId: 'deploy-123',
        logs: 'Initial logs\nLine 2',
      });
    });

    it('should poll for log updates', async () => {
      const client = createMockSocket();
      client.data.userId = 'user-123';
      mockDeploymentsService.findOne.mockResolvedValue({ id: 'deploy-123' });
      mockDeploymentsService.getLogs
        .mockResolvedValueOnce('Initial logs')
        .mockResolvedValueOnce('Updated logs');

      await gateway.handleSubscribeLogs(client, { deploymentId: 'deploy-123' });

      // Clear initial emit
      jest.clearAllMocks();

      // Advance timer to trigger poll
      jest.advanceTimersByTime(2000);
      await Promise.resolve(); // Flush promises

      expect(mockDeploymentsService.getLogs).toHaveBeenCalled();
    });

    it('should return error when deployment not accessible', async () => {
      const client = createMockSocket();
      client.data.userId = 'user-123';
      mockDeploymentsService.findOne.mockRejectedValue(new Error('Forbidden'));

      const result = await gateway.handleSubscribeLogs(client, {
        deploymentId: 'deploy-123',
      });

      expect(result).toEqual({ success: false, error: 'Forbidden' });
    });

    it('should handle errors during log polling', async () => {
      const client = createMockSocket();
      client.data.userId = 'user-123';
      mockDeploymentsService.findOne.mockResolvedValue({ id: 'deploy-123' });
      mockDeploymentsService.getLogs
        .mockResolvedValueOnce('Initial logs')
        .mockRejectedValueOnce(new Error('Stream error'));

      await gateway.handleSubscribeLogs(client, { deploymentId: 'deploy-123' });

      // Advance timer to trigger poll
      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      // Should not throw, error is logged
    });
  });

  describe('handleUnsubscribeLogs', () => {
    it('should clear log polling interval', async () => {
      const client = createMockSocket();
      client.data.userId = 'user-123';
      mockDeploymentsService.findOne.mockResolvedValue({ id: 'deploy-123' });
      mockDeploymentsService.getLogs.mockResolvedValue('logs');

      // Subscribe first
      await gateway.handleSubscribeLogs(client, { deploymentId: 'deploy-123' });

      // Then unsubscribe
      const result = await gateway.handleUnsubscribeLogs(client);

      expect(result).toEqual({ success: true });
    });

    it('should handle unsubscribe when not subscribed', async () => {
      const client = createMockSocket();

      const result = await gateway.handleUnsubscribeLogs(client);

      expect(result).toEqual({ success: true });
    });
  });

  describe('emitDeploymentUpdate', () => {
    it('should emit update to deployment room', () => {
      const deployment = { id: 'deploy-123', status: 'RUNNING' };

      gateway.emitDeploymentUpdate('deploy-123', deployment);

      expect(mockServer.to).toHaveBeenCalledWith('deployment:deploy-123');
      expect(mockServer.emit).toHaveBeenCalledWith('deployment:update', {
        deploymentId: 'deploy-123',
        deployment,
      });
    });
  });
});
