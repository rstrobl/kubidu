import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsageStatsService } from './usage-stats.service';

@Controller('projects/:projectId/stats')
@UseGuards(JwtAuthGuard)
export class UsageStatsController {
  constructor(private readonly usageStatsService: UsageStatsService) {}

  @Get()
  async getAllocationStats(
    @Request() req: any,
    @Param('projectId') projectId: string,
  ) {
    return this.usageStatsService.getAllocationStats(req.user.id, projectId);
  }

  @Get('live')
  async getLiveMetrics(
    @Request() req: any,
    @Param('projectId') projectId: string,
  ) {
    return this.usageStatsService.getLiveMetrics(req.user.id, projectId);
  }
}
