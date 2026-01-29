import { Module } from '@nestjs/common';
import { DeployModule } from '../deploy/deploy.module';
import { MetricsClient } from '../k8s/metrics.client';
import { MetricsCollector } from './metrics.collector';
import { MetricsController } from './metrics.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  imports: [DeployModule],
  controllers: [MetricsController],
  providers: [PrismaService, MetricsClient, MetricsCollector],
})
export class MetricsModule {}
