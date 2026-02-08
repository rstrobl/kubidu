import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EmailService, NotificationEmailData } from './email.service';
import { PrismaService } from '../../database/prisma.service';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('send-notification')
  async handleSendNotification(job: Job<NotificationEmailData>) {
    const { userId, email, category, title, message, actionUrl, metadata } = job.data;

    this.logger.log(`Processing notification email for user ${userId}`);

    try {
      // Check user preferences before sending
      const preferences = await this.prisma.notificationPreference.findUnique({
        where: { userId },
      });

      if (!this.shouldSendEmail(category, title, preferences)) {
        this.logger.log(`Email skipped for user ${userId} - disabled in preferences`);
        return { skipped: true, reason: 'disabled in preferences' };
      }

      const success = await this.emailService.sendNotificationEmail({
        userId,
        email,
        category,
        title,
        message,
        actionUrl,
        metadata,
      });

      if (success) {
        this.logger.log(`Notification email sent to ${email}`);
      }

      return { success };
    } catch (error) {
      this.logger.error(`Failed to send notification email: ${error.message}`);
      throw error;
    }
  }

  private shouldSendEmail(
    category: string,
    title: string,
    preferences: any,
  ): boolean {
    if (!preferences) return true;

    switch (category) {
      case 'DEPLOYMENT':
        if (title.includes('Successful') || title.includes('Running')) {
          return preferences.emailDeploySuccess;
        }
        if (title.includes('Failed') || title.includes('Crashed')) {
          return preferences.emailDeployFailed;
        }
        return true;
      case 'BUILD':
        if (title.includes('Failed')) {
          return preferences.emailBuildFailed;
        }
        return true;
      case 'DOMAIN':
        return preferences.emailDomainVerified;
      case 'WORKSPACE':
        if (title.includes('Invited')) {
          return preferences.emailInvitations;
        }
        if (title.includes('Role')) {
          return preferences.emailRoleChanges;
        }
        return true;
      default:
        return true;
    }
  }
}
