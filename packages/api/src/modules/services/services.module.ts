import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { DeploymentsModule } from '../deployments/deployments.module';
import { GitHubModule } from '../github/github.module';
import { EncryptionService } from '../../services/encryption.service';
import { DockerInspectorService } from './docker-inspector.service';

@Module({
  imports: [
    forwardRef(() => DeploymentsModule),
    GitHubModule,
    BullModule.registerQueue({ name: 'build' }),
  ],
  controllers: [ServicesController],
  providers: [ServicesService, EncryptionService, DockerInspectorService],
  exports: [ServicesService],
})
export class ServicesModule {}
