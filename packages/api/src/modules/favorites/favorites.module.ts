import { Module } from '@nestjs/common';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { DatabaseModule } from '../../database/database.module';
import { SharedServicesModule } from '../../services/shared-services.module';

@Module({
  imports: [DatabaseModule, SharedServicesModule],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}
