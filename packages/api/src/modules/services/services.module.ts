import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { DeploymentsModule } from '../deployments/deployments.module';
import { GitHubModule } from '../github/github.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EncryptionService } from '../../services/encryption.service';
import { DockerInspectorService } from './docker-inspector.service';

@Module({
  imports: [
    forwardRef(() => DeploymentsModule),
    forwardRef(() => NotificationsModule),
    GitHubModule,
    BullModule.registerQueue({ name: 'build' }),
    BullModule.registerQueue({ name: 'deploy' }),
  ],
  controllers: [ServicesController],
  providers: [ServicesService, EncryptionService, DockerInspectorService],
  exports: [ServicesService],
})
export class ServicesModule {}
