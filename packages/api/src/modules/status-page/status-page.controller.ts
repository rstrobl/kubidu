import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StatusPageService } from './status-page.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Public endpoints - no auth required
@Controller('status')
export class StatusPageController {
  constructor(private readonly statusPageService: StatusPageService) {}

  // PUBLIC: Get status page
  @Get(':workspaceSlug/:projectSlug')
  async getPublicStatus(
    @Param('workspaceSlug') workspaceSlug: string,
    @Param('projectSlug') projectSlug: string,
  ) {
    return this.statusPageService.getPublicStatus(workspaceSlug, projectSlug);
  }

  // PUBLIC: Subscribe to updates
  @Post(':workspaceSlug/:projectSlug/subscribe')
  async subscribe(
    @Param('workspaceSlug') workspaceSlug: string,
    @Param('projectSlug') projectSlug: string,
    @Body('email') email: string,
  ) {
    return this.statusPageService.subscribe(workspaceSlug, projectSlug, email);
  }

  // PUBLIC: Confirm subscription
  @Get('confirm/:token')
  async confirmSubscription(@Param('token') token: string) {
    return this.statusPageService.confirmSubscription(token);
  }
}

// Admin endpoints - auth required
@Controller('projects/:projectId/incidents')
@UseGuards(JwtAuthGuard)
export class IncidentsController {
  constructor(private readonly statusPageService: StatusPageService) {}

  @Post()
  async createIncident(
    @Param('projectId') projectId: string,
    @Request() req,
    @Body() body: {
      title: string;
      message: string;
      severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
      affectedServiceIds: string[];
    },
  ) {
    return this.statusPageService.createIncident(projectId, req.user.id, body);
  }

  @Patch(':incidentId')
  async updateIncident(
    @Param('incidentId') incidentId: string,
    @Body() body: {
      status: 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED';
      message?: string;
    },
  ) {
    return this.statusPageService.updateIncident(incidentId, body);
  }
}
