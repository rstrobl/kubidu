import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { DeployModule } from './deploy/deploy.module';
import { MetricsModule } from './metrics/metrics.module';
import { PrismaService } from './database/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisConfig = {
          host: configService.get<string>('redis.host') || 'redis',
          port: configService.get<number>('redis.port') || 6379,
          password: configService.get<string>('redis.password'),
          maxRetriesPerRequest: 3,
          enableReadyCheck: false,
          retryStrategy: (times) => {
            if (times > 3) {
              return null; // Stop retrying
            }
            return Math.min(times * 100, 3000);
          },
        };
        console.log('[Bull] Redis config:', JSON.stringify({
          host: redisConfig.host,
          port: redisConfig.port,
          hasPassword: !!redisConfig.password
        }));
        return { redis: redisConfig };
      },
      inject: [ConfigService],
    }),
    DeployModule,
    MetricsModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
