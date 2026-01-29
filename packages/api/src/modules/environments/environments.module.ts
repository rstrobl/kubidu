import { Module, forwardRef } from '@nestjs/common';
import { EnvironmentsController } from './environments.controller';
import { EnvironmentsService } from './environments.service';
import { EncryptionService } from '../../services/encryption.service';
import { DeploymentsModule } from '../deployments/deployments.module';

@Module({
  imports: [forwardRef(() => DeploymentsModule)],
  controllers: [EnvironmentsController],
  providers: [EnvironmentsService, EncryptionService],
  exports: [EnvironmentsService],
})
export class EnvironmentsModule {}
