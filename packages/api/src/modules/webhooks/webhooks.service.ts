import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../database/prisma.service';
import { WebhookType } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  project: {
    id: string;
    name: string;
    slug: string;
  };
  service?: {
    id: string;
    name: string;
    type: string;
  };
  deployment?: {
    id: string;
    name: string;
    status: string;
    gitCommitSha?: string;
    gitCommitMessage?: string;
    gitAuthor?: string;
    url?: string;
  };
  build?: {
    id: string;
    status: string;
    duration?: number;
  };
  actor?: {
    id: string;
    name: string;
    email: string;
  };
}

export const WEBHOOK_EVENTS = [
  'deployment.started',
  'deployment.success',
  'deployment.failed',
  'deployment.stopped',
  'build.started',
  'build.success',
  'build.failed',
  'service.created',
  'service.updated',
  'service.deleted',
  'domain.added',
  'domain.verified',
  'domain.removed',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  async create(projectId: string, data: {
    name: string;
    url: string;
    type?: WebhookType;
    secret?: string;
    events: string[];
  }) {
    return this.prisma.webhook.create({
      data: {
        projectId,
        name: data.name,
        url: data.url,
        type: data.type || 'CUSTOM',
        secret: data.secret,
        events: data.events,
      },
    });
  }

  async findAll(projectId: string) {
    return this.prisma.webhook.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.webhook.findUnique({
      where: { id },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async update(id: string, data: {
    name?: string;
    url?: string;
    events?: string[];
    enabled?: boolean;
  }) {
    return this.prisma.webhook.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.webhook.delete({
      where: { id },
    });
  }

  async trigger(projectId: string, event: WebhookEvent, payload: WebhookPayload) {
    // Find all enabled webhooks for this project that subscribe to this event
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        projectId,
        enabled: true,
        events: { has: event },
      },
    });

    // Trigger each webhook in parallel
    const results = await Promise.allSettled(
      webhooks.map((webhook) => this.deliver(webhook, event, payload)),
    );

    // Log results
    results.forEach((result, idx) => {
      if (result.status === 'rejected') {
        this.logger.error(
          `Webhook ${webhooks[idx].name} delivery failed: ${result.reason}`,
        );
      }
    });

    return results;
  }

  async deliver(
    webhook: { id: string; url: string; type: string; secret?: string | null; name: string },
    event: string,
    payload: WebhookPayload,
  ) {
    const startTime = Date.now();
    
    try {
      // Build the request body based on webhook type
      const body = this.buildRequestBody(webhook.type as WebhookType, event, payload);
      
      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Kubidu-Webhook/1.0',
        'X-Kubidu-Event': event,
        'X-Kubidu-Delivery': crypto.randomUUID(),
      };

      // Add HMAC signature if secret is set
      if (webhook.secret) {
        const signature = crypto
          .createHmac('sha256', webhook.secret)
          .update(JSON.stringify(body))
          .digest('hex');
        headers['X-Kubidu-Signature'] = `sha256=${signature}`;
      }

      // Make the request
      const response = await firstValueFrom(
        this.httpService.post(webhook.url, body, {
          headers,
          timeout: 10000,
          validateStatus: () => true, // Don't throw on non-2xx
        }),
      );

      const duration = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 300;

      // Log the delivery
      await this.prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload: payload as any,
          statusCode: response.status,
          response: typeof response.data === 'string'
            ? response.data.slice(0, 1000)
            : JSON.stringify(response.data).slice(0, 1000),
          duration,
        },
      });

      // Update webhook stats
      await this.prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastDeliveryAt: new Date(),
          lastDeliveryOk: success,
          failureCount: success ? 0 : { increment: 1 },
        },
      });

      if (!success) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      return { success: true, statusCode: response.status, duration };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Log the failed delivery
      await this.prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload: payload as any,
          error: error.message,
          duration,
        },
      });

      // Update webhook stats
      await this.prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastDeliveryAt: new Date(),
          lastDeliveryOk: false,
          failureCount: { increment: 1 },
        },
      });

      throw error;
    }
  }

  private buildRequestBody(
    type: WebhookType,
    event: string,
    payload: WebhookPayload,
  ): any {
    switch (type) {
      case 'DISCORD':
        return this.buildDiscordPayload(event, payload);
      case 'SLACK':
        return this.buildSlackPayload(event, payload);
      default:
        return { event, ...payload };
    }
  }

  private buildDiscordPayload(event: string, payload: WebhookPayload) {
    const colors: Record<string, number> = {
      'deployment.success': 0x22c55e, // green
      'deployment.failed': 0xef4444, // red
      'deployment.started': 0x3b82f6, // blue
      'deployment.stopped': 0x6b7280, // gray
      'build.success': 0x22c55e,
      'build.failed': 0xef4444,
      'build.started': 0x3b82f6,
      'service.created': 0x8b5cf6, // purple
      'service.deleted': 0xef4444,
      'domain.verified': 0x22c55e,
    };

    const icons: Record<string, string> = {
      'deployment.success': '✅',
      'deployment.failed': '❌',
      'deployment.started': '🚀',
      'deployment.stopped': '⏹️',
      'build.success': '🔨',
      'build.failed': '💥',
      'build.started': '🔧',
      'service.created': '⚙️',
      'service.deleted': '🗑️',
      'domain.verified': '🌐',
    };

    const title = this.formatEventTitle(event, payload);
    const description = this.formatEventDescription(event, payload);

    return {
      embeds: [
        {
          title: `${icons[event] || '📦'} ${title}`,
          description,
          color: colors[event] || 0x6b7280,
          fields: [
            ...(payload.service
              ? [{ name: 'Service', value: payload.service.name, inline: true }]
              : []),
            ...(payload.deployment?.gitCommitSha
              ? [
                  {
                    name: 'Commit',
                    value: `\`${payload.deployment.gitCommitSha.slice(0, 7)}\``,
                    inline: true,
                  },
                ]
              : []),
            ...(payload.actor
              ? [{ name: 'Triggered by', value: payload.actor.name, inline: true }]
              : []),
          ],
          footer: {
            text: `Kubidu • ${payload.project.name}`,
          },
          timestamp: payload.timestamp,
        },
      ],
    };
  }

  private buildSlackPayload(event: string, payload: WebhookPayload) {
    const colors: Record<string, string> = {
      'deployment.success': 'good',
      'deployment.failed': 'danger',
      'deployment.started': '#3b82f6',
      'deployment.stopped': '#6b7280',
      'build.success': 'good',
      'build.failed': 'danger',
    };

    const title = this.formatEventTitle(event, payload);
    const description = this.formatEventDescription(event, payload);

    return {
      attachments: [
        {
          color: colors[event] || '#6b7280',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${title}*\n${description}`,
              },
            },
            ...(payload.service
              ? [
                  {
                    type: 'context',
                    elements: [
                      {
                        type: 'mrkdwn',
                        text: `*Project:* ${payload.project.name} | *Service:* ${payload.service.name}`,
                      },
                    ],
                  },
                ]
              : []),
            ...(payload.deployment?.url
              ? [
                  {
                    type: 'actions',
                    elements: [
                      {
                        type: 'button',
                        text: { type: 'plain_text', text: 'View Deployment' },
                        url: payload.deployment.url,
                      },
                    ],
                  },
                ]
              : []),
          ],
        },
      ],
    };
  }

  private formatEventTitle(event: string, payload: WebhookPayload): string {
    const templates: Record<string, string> = {
      'deployment.success': `Deployment succeeded`,
      'deployment.failed': `Deployment failed`,
      'deployment.started': `Deployment started`,
      'deployment.stopped': `Deployment stopped`,
      'build.success': `Build completed`,
      'build.failed': `Build failed`,
      'build.started': `Build started`,
      'service.created': `Service created`,
      'service.updated': `Service updated`,
      'service.deleted': `Service deleted`,
      'domain.added': `Domain added`,
      'domain.verified': `Domain verified`,
      'domain.removed': `Domain removed`,
    };
    return templates[event] || event;
  }

  private formatEventDescription(event: string, payload: WebhookPayload): string {
    if (payload.deployment?.gitCommitMessage) {
      return payload.deployment.gitCommitMessage;
    }
    if (payload.service) {
      return `Service: ${payload.service.name}`;
    }
    return '';
  }

  async test(webhookId: string) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id: webhookId },
      include: { project: true },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const testPayload: WebhookPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      project: {
        id: webhook.project.id,
        name: webhook.project.name,
        slug: webhook.project.slug,
      },
      service: {
        id: 'test-service',
        name: 'Test Service',
        type: 'GITHUB',
      },
      deployment: {
        id: 'test-deployment',
        name: 'test-v1',
        status: 'RUNNING',
        gitCommitSha: 'abc123def456',
        gitCommitMessage: 'This is a test webhook delivery',
        gitAuthor: 'Kubidu',
      },
    };

    return this.deliver(webhook, 'test', testPayload);
  }
}
