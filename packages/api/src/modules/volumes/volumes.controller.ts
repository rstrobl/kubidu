import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VolumesService } from './volumes.service';

@ApiTags('volumes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/volumes')
export class VolumesController {
  constructor(private readonly volumesService: VolumesService) {}

  @Get()
  @ApiOperation({ summary: 'List all volumes for a project' })
  async findAll(
    @Request() req: any,
    @Param('projectId') projectId: string,
  ) {
    return this.volumesService.findAll(req.user.id, projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific volume' })
  async findOne(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.volumesService.findOne(req.user.id, projectId, id);
  }
}
