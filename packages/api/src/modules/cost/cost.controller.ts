import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CostService } from './cost.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class CostController {
  constructor(private readonly costService: CostService) {}

  @Get('workspaces/:workspaceId/cost')
  async getWorkspaceCost(
    @Param('workspaceId') workspaceId: string,
    @Request() req,
  ) {
    return this.costService.getCostEstimate(workspaceId, req.user.id);
  }

  @Get('projects/:projectId/cost')
  async getProjectCost(
    @Param('projectId') projectId: string,
    @Request() req,
  ) {
    return this.costService.getProjectCost(projectId, req.user.id);
  }
}
