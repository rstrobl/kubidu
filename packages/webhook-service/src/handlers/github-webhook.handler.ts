import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from '../modules/webhook/webhook.service';
import { RepositoryProvider } from '@kubidu/shared';
import * as crypto from 'crypto';

@Injectable()
export class GithubWebhookHandler {
  private readonly logger = new Logger(GithubWebhookHandler.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.get<string>('github.webhookSecret');
  }

  async handle(payload: any, eventType: string, signature: string): Promise<void> {
    // Verify signature
    this.verifySignature(JSON.stringify(payload), signature);

    // Handle different event types
    if (eventType === 'push') {
      await this.handlePushEvent(payload, signature);
    } else if (eventType === 'ping') {
      this.logger.log('GitHub ping event received');
    } else {
      this.logger.log(`Ignoring GitHub event type: ${eventType}`);
    }
  }

  private async handlePushEvent(payload: any, signature: string): Promise<void> {
    const repositoryUrl = payload.repository?.clone_url || payload.repository?.url;
    const ref = payload.ref; // e.g., "refs/heads/main"
    const branch = ref?.replace('refs/heads/', '');
    const headCommit = payload.head_commit;

    if (!repositoryUrl || !headCommit) {
      throw new BadRequestException('Invalid push payload');
    }

    this.logger.log(`Push event for ${repositoryUrl} on branch ${branch}`);

    // Find matching service
    const service = await this.webhookService.findServiceByRepositoryUrl(repositoryUrl);

    if (!service) {
      this.logger.warn(`No service found for repository: ${repositoryUrl}`);
      return;
    }

    // Save webhook event
    const webhookEvent = await this.webhookService.saveWebhookEvent(
      service.id,
      RepositoryProvider.GITHUB,
      'push',
      payload,
      signature,
    );

    try {
      // Enqueue build (pass the service object)
      await this.webhookService.enqueueBuild(
        service,
        headCommit.id,
        headCommit.message,
        branch,
        headCommit.author?.name || headCommit.author?.username || 'Unknown',
      );

      await this.webhookService.markWebhookProcessed(webhookEvent.id);
      this.logger.log(`Successfully processed webhook: ${webhookEvent.id}`);
    } catch (error) {
      await this.webhookService.markWebhookProcessed(webhookEvent.id, error.message);
      throw error;
    }
  }

  private verifySignature(payload: string, signature: string): void {
    if (!this.webhookSecret) {
      this.logger.warn('GitHub webhook secret not configured, skipping signature verification');
      return;
    }

    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }
}
