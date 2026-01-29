import { Controller, Post, Body, Headers, Logger, BadRequestException, HttpCode } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { GithubWebhookHandler } from '../../handlers/github-webhook.handler';
import { GitlabWebhookHandler } from '../../handlers/gitlab-webhook.handler';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly githubHandler: GithubWebhookHandler,
    private readonly gitlabHandler: GitlabWebhookHandler,
  ) {}

  @Post('github')
  @HttpCode(200)
  async handleGithubWebhook(
    @Body() payload: any,
    @Headers('x-github-event') eventType: string,
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-github-delivery') deliveryId: string,
  ) {
    this.logger.log(`Received GitHub webhook: ${eventType} (${deliveryId})`);

    if (!signature) {
      throw new BadRequestException('Missing signature header');
    }

    try {
      await this.githubHandler.handle(payload, eventType, signature);
      return { status: 'accepted', deliveryId };
    } catch (error) {
      this.logger.error(`GitHub webhook error: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('gitlab')
  @HttpCode(200)
  async handleGitlabWebhook(
    @Body() payload: any,
    @Headers('x-gitlab-event') eventType: string,
    @Headers('x-gitlab-token') token: string,
  ) {
    this.logger.log(`Received GitLab webhook: ${eventType}`);

    if (!token) {
      throw new BadRequestException('Missing token header');
    }

    try {
      await this.gitlabHandler.handle(payload, eventType, token);
      return { status: 'accepted' };
    } catch (error) {
      this.logger.error(`GitLab webhook error: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('test')
  @HttpCode(200)
  async testWebhook(@Body() payload: any) {
    this.logger.log('Test webhook received');
    return { status: 'ok', received: payload };
  }
}
