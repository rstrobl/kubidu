import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ServicesModule } from './modules/services/services.module';
import { DeploymentsModule } from './modules/deployments/deployments.module';
import { EnvironmentsModule } from './modules/environments/environments.module';
import { DomainsModule } from './modules/domains/domains.module';
import { AuditModule } from './modules/audit/audit.module';
import { ActivityModule } from './modules/activity/activity.module';
import { HealthModule } from './modules/health/health.module';
import { GitHubModule } from './modules/github/github.module';
import { UsageStatsModule } from './modules/usage-stats/usage-stats.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { VolumesModule } from './modules/volumes/volumes.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EmailModule } from './modules/email/email.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AuditLoggerMiddleware } from './middleware/audit-logger.middleware';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import { SharedServicesModule } from './services/shared-services.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Scheduler for background jobs
    ScheduleModule.forRoot(),

    // Bull Queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host') || 'redis',
          port: configService.get('redis.port') || 6379,
          password: configService.get('redis.password') || undefined,
          maxRetriesPerRequest: 3,
          enableReadyCheck: false,
          retryStrategy: (times) => {
            if (times > 3) {
              return null; // Stop retrying
            }
            return Math.min(times * 100, 3000);
          },
        },
      }),
      inject: [ConfigService],
    }),

    // Database
    DatabaseModule,

    // Shared services (authorization, encryption, etc.)
    SharedServicesModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ProjectsModule,
    ServicesModule,
    DeploymentsModule,
    EnvironmentsModule,
    DomainsModule,
    AuditModule,
    ActivityModule,
    HealthModule,
    GitHubModule,
    UsageStatsModule,
    TemplatesModule,
    VolumesModule,
    WorkspacesModule,
    NotificationsModule,
    EmailModule,
    WebhooksModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, AuditLoggerMiddleware)
      .forRoutes('*');
  }
}
