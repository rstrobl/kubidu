import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { NotificationsGateway } from '../notifications.gateway';
import { Socket, Server } from 'socket.io';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let jwtService: jest.Mocked<JwtService>;

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  const createMockSocket = (options: {
    id?: string;
    token?: string;
    userId?: string;
    authorizationHeader?: string;
  } = {}): Socket => {
    return {
      id: options.id || 'socket-123',
      handshake: {
        auth: { token: options.token },
        headers: { authorization: options.authorizationHeader },
      },
      data: { userId: options.userId },
      join: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as Socket;
  };

  beforeEach(async () => {
    const mockJwtService = {
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);
    jwtService = module.get(JwtService);
    gateway.server = mockServer as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should authenticate and connect client with valid token from auth', async () => {
      const client = createMockSocket({ token: 'valid-token' });
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });

      await gateway.handleConnection(client);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
      expect(client.join).toHaveBeenCalledWith('user:user-123');
      expect(client.data.userId).toBe('user-123');
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should authenticate using authorization header', async () => {
      const client = createMockSocket({ authorizationHeader: 'Bearer header-token' });
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });

      await gateway.handleConnection(client);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('header-token');
      expect(client.data.userId).toBe('user-123');
    });

    it('should disconnect client without token', async () => {
      const client = createMockSocket({});

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should disconnect client with invalid token', async () => {
      const client = createMockSocket({ token: 'invalid-token' });
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should track multiple connections for same user', async () => {
      const client1 = createMockSocket({ id: 'socket-1', token: 'token' });
      const client2 = createMockSocket({ id: 'socket-2', token: 'token' });
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });

      await gateway.handleConnection(client1);
      await gateway.handleConnection(client2);

      expect(gateway.isUserConnected('user-123')).toBe(true);
    });
  });

  describe('handleDisconnect', () => {
    it('should clean up user tracking on disconnect', async () => {
      const client = createMockSocket({ token: 'token', userId: 'user-123' });
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });

      await gateway.handleConnection(client);
      expect(gateway.isUserConnected('user-123')).toBe(true);

      gateway.handleDisconnect(client);
      expect(gateway.isUserConnected('user-123')).toBe(false);
    });

    it('should handle disconnect for client without userId', () => {
      const client = createMockSocket({});

      // Should not throw
      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });

    it('should keep user connected if other sockets remain', async () => {
      const client1 = createMockSocket({ id: 'socket-1', token: 'token' });
      const client2 = createMockSocket({ id: 'socket-2', token: 'token', userId: 'user-123' });
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });

      await gateway.handleConnection(client1);
      await gateway.handleConnection(client2);

      gateway.handleDisconnect(client1);
      expect(gateway.isUserConnected('user-123')).toBe(true);
    });
  });

  describe('handleSubscribe', () => {
    it('should subscribe authenticated client to notifications', async () => {
      const client = createMockSocket({ userId: 'user-123' });

      const result = await gateway.handleSubscribe(client);

      expect(result).toEqual({ success: true });
      expect(client.join).toHaveBeenCalledWith('user:user-123');
    });

    it('should reject unauthenticated client', async () => {
      const client = createMockSocket({});

      const result = await gateway.handleSubscribe(client);

      expect(result).toEqual({ success: false, error: 'Not authenticated' });
    });
  });

  describe('handleMarkRead', () => {
    it('should acknowledge mark-read request', async () => {
      const client = createMockSocket({ userId: 'user-123' });

      const result = await gateway.handleMarkRead(client, { notificationId: 'notif-123' });

      expect(result).toEqual({ success: true, notificationId: 'notif-123' });
    });
  });

  describe('emitNotification', () => {
    it('should emit notification to user room', () => {
      const notification = {
        id: 'notif-123',
        category: 'DEPLOYMENT',
        title: 'Deployment Complete',
        message: 'Your service has been deployed',
        actionUrl: '/projects/123',
        metadata: { serviceId: 'service-123' },
        isRead: false,
        createdAt: new Date(),
      };

      gateway.emitNotification('user-123', notification as any);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-123');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:new', expect.objectContaining({
        id: 'notif-123',
        title: 'Deployment Complete',
      }));
    });
  });

  describe('emitUnreadCount', () => {
    it('should emit unread count to user room', () => {
      gateway.emitUnreadCount('user-123', 5);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-123');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:unread-count', { count: 5 });
    });
  });

  describe('isUserConnected', () => {
    it('should return false for disconnected user', () => {
      expect(gateway.isUserConnected('unknown-user')).toBe(false);
    });
  });
});
