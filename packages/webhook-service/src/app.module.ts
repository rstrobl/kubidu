import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import configuration from './config/configuration';
import { WebhookModule } from './modules/webhook/webhook.module';
import { PrismaService } from './database/prisma.service';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Bull queue for build jobs
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      }),
      inject: [ConfigService],
    }),

    // Register build queue
    BullModule.registerQueue({
      name: 'build',
    }),

    // Feature modules
    WebhookModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
