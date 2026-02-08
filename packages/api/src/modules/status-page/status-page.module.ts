import { Module } from '@nestjs/common';
import { StatusPageController } from './status-page.controller';
import { StatusPageService } from './status-page.service';
import { DatabaseModule } from '../../database/database.module';
import { SharedServicesModule } from '../../services/shared-services.module';

@Module({
  imports: [DatabaseModule, SharedServicesModule],
  controllers: [StatusPageController],
  providers: [StatusPageService],
  exports: [StatusPageService],
})
export class StatusPageModule {}
