import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { DeploymentsService } from './deployments.service';
import { JwtService } from '@nestjs/jwt';

const getCorsOrigin = () => {
  const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  return origin.includes(',') ? origin.split(',').map(o => o.trim()) : origin;
};

@WebSocketGateway({
  cors: {
    origin: getCorsOrigin(),
    credentials: true,
  },
  namespace: '/deployments',
})
export class DeploymentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DeploymentsGateway.name);
  private readonly logStreams = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly deploymentsService: DeploymentsService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Authenticate the socket connection
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const user = await this.jwtService.verifyAsync(token);
      client.data.userId = user.id;

      this.logger.log(`Client connected: ${client.id} (user: ${user.id})`);
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Clean up any active log streams for this client
    const streamKey = `${client.id}:logs`;
    const interval = this.logStreams.get(streamKey);
    if (interval) {
      clearInterval(interval);
      this.logStreams.delete(streamKey);
    }
  }

  @SubscribeMessage('subscribe:deployment')
  async handleSubscribeDeployment(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deploymentId: string },
  ) {
    const userId = client.data.userId;
    const { deploymentId } = data;

    try {
      // Verify user has access to this deployment
      await this.deploymentsService.findOne(userId, deploymentId);

      // Join room for this deployment
      client.join(`deployment:${deploymentId}`);

      this.logger.log(`Client ${client.id} subscribed to deployment ${deploymentId}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to subscribe to deployment: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('unsubscribe:deployment')
  async handleUnsubscribeDeployment(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deploymentId: string },
  ) {
    const { deploymentId } = data;
    client.leave(`deployment:${deploymentId}`);

    this.logger.log(`Client ${client.id} unsubscribed from deployment ${deploymentId}`);

    return { success: true };
  }

  @SubscribeMessage('subscribe:logs')
  async handleSubscribeLogs(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deploymentId: string },
  ) {
    const userId = client.data.userId;
    const { deploymentId } = data;

    try {
      // Verify user has access to this deployment
      const deployment = await this.deploymentsService.findOne(userId, deploymentId);

      // Send initial logs
      const logs = await this.deploymentsService.getLogs(userId, deploymentId);
      client.emit('logs:data', { deploymentId, logs });

      // Set up polling for log updates (every 2 seconds)
      const streamKey = `${client.id}:logs`;
      const interval = setInterval(async () => {
        try {
          const latestLogs = await this.deploymentsService.getLogs(userId, deploymentId);
          client.emit('logs:data', { deploymentId, logs: latestLogs });
        } catch (error) {
          this.logger.error(`Error streaming logs: ${error.message}`);
        }
      }, 2000);

      this.logStreams.set(streamKey, interval);

      this.logger.log(`Client ${client.id} subscribed to logs for deployment ${deploymentId}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to subscribe to logs: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('unsubscribe:logs')
  async handleUnsubscribeLogs(
    @ConnectedSocket() client: Socket,
  ) {
    const streamKey = `${client.id}:logs`;
    const interval = this.logStreams.get(streamKey);

    if (interval) {
      clearInterval(interval);
      this.logStreams.delete(streamKey);
      this.logger.log(`Client ${client.id} unsubscribed from logs`);
    }

    return { success: true };
  }

  /**
   * Emit deployment status update to all subscribed clients
   */
  emitDeploymentUpdate(deploymentId: string, deployment: any) {
    this.server.to(`deployment:${deploymentId}`).emit('deployment:update', {
      deploymentId,
      deployment,
    });
  }
}
