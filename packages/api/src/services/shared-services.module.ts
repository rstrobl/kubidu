import { Module, Global } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { EncryptionService } from './encryption.service';

@Global()
@Module({
  providers: [AuthorizationService, EncryptionService],
  exports: [AuthorizationService, EncryptionService],
})
export class SharedServicesModule {}
