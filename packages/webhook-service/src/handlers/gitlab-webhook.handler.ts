import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from '../modules/webhook/webhook.service';
import { RepositoryProvider } from '@kubidu/shared';

@Injectable()
export class GitlabWebhookHandler {
  private readonly logger = new Logger(GitlabWebhookHandler.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.get<string>('gitlab.webhookSecret');
  }

  async handle(payload: any, eventType: string, token: string): Promise<void> {
    // Verify token
    this.verifyToken(token);

    // Handle different event types
    if (eventType === 'Push Hook') {
      await this.handlePushEvent(payload, token);
    } else {
      this.logger.log(`Ignoring GitLab event type: ${eventType}`);
    }
  }

  private async handlePushEvent(payload: any, token: string): Promise<void> {
    const repositoryUrl = payload.project?.git_http_url || payload.repository?.url;
    const ref = payload.ref; // e.g., "refs/heads/main"
    const branch = ref?.replace('refs/heads/', '');
    const commits = payload.commits || [];
    const headCommit = commits[commits.length - 1];

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
      RepositoryProvider.GITLAB,
      'push',
      payload,
      token,
    );

    try {
      // Enqueue build (pass the service object)
      await this.webhookService.enqueueBuild(
        service,
        headCommit.id,
        headCommit.message,
        branch,
        headCommit.author?.name || 'Unknown',
      );

      await this.webhookService.markWebhookProcessed(webhookEvent.id);
      this.logger.log(`Successfully processed webhook: ${webhookEvent.id}`);
    } catch (error) {
      await this.webhookService.markWebhookProcessed(webhookEvent.id, error.message);
      throw error;
    }
  }

  private verifyToken(token: string): void {
    if (!this.webhookSecret) {
      this.logger.warn('GitLab webhook secret not configured, skipping token verification');
      return;
    }

    if (token !== this.webhookSecret) {
      throw new UnauthorizedException('Invalid webhook token');
    }
  }
}
