import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Notification } from '@prisma/client';

const getCorsOrigin = () => {
  const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  return origin.includes(',') ? origin.split(',').map(o => o.trim()) : origin;
};

@WebSocketGateway({
  cors: {
    origin: getCorsOrigin(),
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub;
      client.data.userId = userId;

      // Join user's personal room
      client.join(`user:${userId}`);

      // Track socket for this user
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      this.logger.log(`Client ${client.id} connected for user ${userId}`);
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('notification:subscribe')
  async handleSubscribe(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    client.join(`user:${userId}`);
    this.logger.log(`Client ${client.id} subscribed to notifications for user ${userId}`);
    return { success: true };
  }

  @SubscribeMessage('notification:mark-read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    data: { notificationId: string },
  ) {
    // This will be handled by the controller/service
    // Just acknowledge the message here
    return { success: true, notificationId: data.notificationId };
  }

  emitNotification(userId: string, notification: Notification) {
    this.server.to(`user:${userId}`).emit('notification:new', {
      id: notification.id,
      category: notification.category,
      title: notification.title,
      message: notification.message,
      actionUrl: notification.actionUrl,
      metadata: notification.metadata,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    });
  }

  emitUnreadCount(userId: string, count: number) {
    this.server.to(`user:${userId}`).emit('notification:unread-count', { count });
  }

  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }
}
