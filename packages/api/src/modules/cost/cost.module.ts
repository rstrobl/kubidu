import { Module } from '@nestjs/common';
import { CostController } from './cost.controller';
import { CostService } from './cost.service';
import { DatabaseModule } from '../../database/database.module';
import { SharedServicesModule } from '../../services/shared-services.module';

@Module({
  imports: [DatabaseModule, SharedServicesModule],
  controllers: [CostController],
  providers: [CostService],
  exports: [CostService],
})
export class CostModule {}
