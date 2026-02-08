import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { DatabaseModule } from '../../database/database.module';
import { SharedServicesModule } from '../../services/shared-services.module';

@Module({
  imports: [DatabaseModule, SharedServicesModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
