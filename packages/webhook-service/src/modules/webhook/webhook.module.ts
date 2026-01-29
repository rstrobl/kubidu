import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { GithubWebhookHandler } from '../../handlers/github-webhook.handler';
import { GitlabWebhookHandler } from '../../handlers/gitlab-webhook.handler';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'build',
    }),
  ],
  controllers: [WebhookController],
  providers: [PrismaService, WebhookService, GithubWebhookHandler, GitlabWebhookHandler],
})
export class WebhookModule {}
