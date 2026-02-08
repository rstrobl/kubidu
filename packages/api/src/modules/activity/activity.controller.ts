import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Activity')
@Controller('activity')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ActivityController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get activity feed for workspace' })
  @ApiQuery({ name: 'workspaceId', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'serviceId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Activity feed retrieved' })
  async getActivity(
    @Req() req,
    @Query('workspaceId') workspaceId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
    @Query('projectId') projectId?: string,
    @Query('serviceId') serviceId?: string,
    @Query('type') type?: string,
  ) {
    // Verify user has access to workspace
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user.id,
          workspaceId,
        },
      },
    });

    if (!member) {
      return { activities: [], total: 0 };
    }

    return this.activityService.getWorkspaceActivity(workspaceId, {
      limit,
      offset,
      projectId,
      serviceId,
      type,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get activity statistics' })
  @ApiQuery({ name: 'workspaceId', required: true, type: String })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Activity statistics retrieved' })
  async getStats(
    @Req() req,
    @Query('workspaceId') workspaceId: string,
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    // Verify user has access to workspace
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user.id,
          workspaceId,
        },
      },
    });

    if (!member) {
      return {
        deploymentsByStatus: {},
        dailyDeployments: [],
        totalDeployments: 0,
        successRate: 0,
      };
    }

    return this.activityService.getActivityStats(workspaceId, days || 30);
  }
}
