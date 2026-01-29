import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UsageStatsController } from './usage-stats.controller';
import { UsageStatsService } from './usage-stats.service';

@Module({
  imports: [HttpModule],
  controllers: [UsageStatsController],
  providers: [UsageStatsService],
})
export class UsageStatsModule {}
