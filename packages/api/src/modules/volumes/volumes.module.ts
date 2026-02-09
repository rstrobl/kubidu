import { Module } from '@nestjs/common';
import { VolumesController } from './volumes.controller';
import { VolumesService } from './volumes.service';
import { DatabaseModule } from '../../database/database.module';
import { SharedServicesModule } from '../../services/shared-services.module';

@Module({
  imports: [DatabaseModule, SharedServicesModule],
  controllers: [VolumesController],
  providers: [VolumesService],
  exports: [VolumesService],
})
export class VolumesModule {}
