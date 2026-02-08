import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { NotificationCategory } from '@prisma/client';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface NotificationEmailData {
  userId: string;
  email: string;
  category: NotificationCategory;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly apiKey: string | null;
  private readonly appUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {
    this.fromEmail = this.configService.get<string>('email.from', 'noreply@kubidu.io');
    this.fromName = this.configService.get<string>('email.fromName', 'Kubidu');
    this.apiKey = this.configService.get<string>('email.resendApiKey', null);
    this.appUrl = this.configService.get<string>('app.url', 'http://localhost:5173');
  }

  async queueNotificationEmail(data: NotificationEmailData): Promise<void> {
    await this.emailQueue.add('send-notification', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
    this.logger.log(`Queued notification email for user ${data.userId}`);
  }

  async sendNotificationEmail(data: NotificationEmailData): Promise<boolean> {
    const { email, category, title, message, actionUrl, metadata } = data;

    const html = this.buildNotificationHtml({
      title,
      message,
      actionUrl: actionUrl ? `${this.appUrl}${actionUrl}` : undefined,
      category,
      metadata,
    });

    const text = this.buildNotificationText({
      title,
      message,
      actionUrl: actionUrl ? `${this.appUrl}${actionUrl}` : undefined,
    });

    return this.sendEmail({
      to: email,
      subject: `[Kubidu] ${title}`,
      html,
      text,
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('Email sending skipped - no API key configured');
      this.logger.debug(`Would send email to ${options.to}: ${options.subject}`);
      return false;
    }

    try {
      // Using Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Failed to send email: ${error}`);
        return false;
      }

      const result = await response.json();
      this.logger.log(`Email sent successfully: ${result.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      return false;
    }
  }

  private buildNotificationHtml(params: {
    title: string;
    message: string;
    actionUrl?: string;
    category: NotificationCategory;
    metadata?: Record<string, any>;
  }): string {
    const { title, message, actionUrl, category } = params;

    const categoryColors: Record<NotificationCategory, string> = {
      DEPLOYMENT: '#10B981',
      BUILD: '#F59E0B',
      DOMAIN: '#8B5CF6',
      SERVICE: '#3B82F6',
      WORKSPACE: '#6366F1',
    };

    const categoryIcons: Record<NotificationCategory, string> = {
      DEPLOYMENT: '&#128640;', // rocket
      BUILD: '&#128736;', // wrench
      DOMAIN: '&#127760;', // globe
      SERVICE: '&#9881;', // gear
      WORKSPACE: '&#128101;', // people
    };

    const color = categoryColors[category] || '#6366F1';
    const icon = categoryIcons[category] || '&#128276;';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; border-bottom: 1px solid #e5e7eb;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <span style="font-size: 24px; font-weight: bold; color: #4F46E5;">Kubidu</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 12px; background-color: ${color}20; color: ${color}; border-radius: 16px; font-size: 12px; font-weight: 500;">
                      ${icon} ${category}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111827;">${title}</h1>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #4b5563;">${message}</p>

              ${actionUrl ? `
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <a href="${actionUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">View Details</a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
                You received this email because you have notifications enabled for ${category.toLowerCase()} events.
                <br>
                <a href="${this.appUrl}/settings/notifications" style="color: #4F46E5; text-decoration: none;">Manage notification preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  private buildNotificationText(params: {
    title: string;
    message: string;
    actionUrl?: string;
  }): string {
    const { title, message, actionUrl } = params;

    let text = `${title}\n\n${message}`;
    if (actionUrl) {
      text += `\n\nView details: ${actionUrl}`;
    }
    text += `\n\n---\nKubidu - Your cloud platform\nManage preferences: ${this.appUrl}/settings/notifications`;

    return text;
  }

  // Specific email templates

  async sendDeploymentSuccessEmail(
    email: string,
    data: {
      serviceName: string;
      projectName: string;
      deploymentUrl?: string;
      actionUrl: string;
    },
  ): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: `[Kubidu] ${data.serviceName} deployed successfully`,
      html: this.buildDeploymentSuccessHtml(data),
      text: `Your service ${data.serviceName} in project ${data.projectName} has been deployed successfully.${data.deploymentUrl ? ` Visit: ${data.deploymentUrl}` : ''}`,
    });
  }

  async sendDeploymentFailedEmail(
    email: string,
    data: {
      serviceName: string;
      projectName: string;
      errorMessage?: string;
      actionUrl: string;
    },
  ): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: `[Kubidu] Deployment failed for ${data.serviceName}`,
      html: this.buildDeploymentFailedHtml(data),
      text: `Deployment failed for ${data.serviceName} in project ${data.projectName}.${data.errorMessage ? ` Error: ${data.errorMessage}` : ''} View details: ${this.appUrl}${data.actionUrl}`,
    });
  }

  async sendWorkspaceInvitationEmail(
    email: string,
    data: {
      workspaceName: string;
      inviterName: string;
      inviteUrl: string;
      role: string;
    },
  ): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: `[Kubidu] You've been invited to join ${data.workspaceName}`,
      html: this.buildInvitationHtml(data),
      text: `${data.inviterName} has invited you to join ${data.workspaceName} as ${data.role}. Accept invitation: ${data.inviteUrl}`,
    });
  }

  private buildDeploymentSuccessHtml(data: {
    serviceName: string;
    projectName: string;
    deploymentUrl?: string;
    actionUrl: string;
  }): string {
    return this.buildNotificationHtml({
      title: 'Deployment Successful',
      message: `Your service <strong>${data.serviceName}</strong> in project <strong>${data.projectName}</strong> has been deployed successfully.${data.deploymentUrl ? ` Your service is now available at <a href="${data.deploymentUrl}" style="color: #4F46E5;">${data.deploymentUrl}</a>.` : ''}`,
      actionUrl: `${this.appUrl}${data.actionUrl}`,
      category: 'DEPLOYMENT',
    });
  }

  private buildDeploymentFailedHtml(data: {
    serviceName: string;
    projectName: string;
    errorMessage?: string;
    actionUrl: string;
  }): string {
    return this.buildNotificationHtml({
      title: 'Deployment Failed',
      message: `Deployment for <strong>${data.serviceName}</strong> in project <strong>${data.projectName}</strong> has failed.${data.errorMessage ? `<br><br><strong>Error:</strong> ${data.errorMessage}` : ''}`,
      actionUrl: `${this.appUrl}${data.actionUrl}`,
      category: 'DEPLOYMENT',
    });
  }

  private buildInvitationHtml(data: {
    workspaceName: string;
    inviterName: string;
    inviteUrl: string;
    role: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workspace Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center;">
              <span style="font-size: 28px; font-weight: bold; color: #4F46E5;">Kubidu</span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #111827; text-align: center;">You're invited!</h1>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #4b5563; text-align: center;">
                <strong>${data.inviterName}</strong> has invited you to join <strong>${data.workspaceName}</strong> as <strong>${data.role}</strong>.
              </p>

              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${data.inviteUrl}" style="display: inline-block; padding: 14px 32px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">Accept Invitation</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; text-align: center;">
                This invitation will expire in 7 days.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}
