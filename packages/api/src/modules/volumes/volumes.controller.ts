import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VolumesService } from './volumes.service';
import { CreateVolumeDto } from './dto/create-volume.dto';
import { UpdateVolumeDto } from './dto/update-volume.dto';
import { AttachVolumeDto } from './dto/attach-volume.dto';

@ApiTags('Volumes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/volumes')
export class VolumesController {
  constructor(private readonly volumesService: VolumesService) {}

  @Get()
  @ApiOperation({ summary: 'List all volumes for a project' })
  @ApiResponse({ status: 200, description: 'Volumes retrieved' })
  async findAll(
    @Request() req: any,
    @Param('projectId') projectId: string,
  ) {
    return this.volumesService.findAll(req.user.id, projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific volume' })
  @ApiResponse({ status: 200, description: 'Volume retrieved' })
  @ApiResponse({ status: 404, description: 'Volume not found' })
  async findOne(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.volumesService.findOne(req.user.id, projectId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new volume' })
  @ApiResponse({ status: 201, description: 'Volume created successfully' })
  @ApiResponse({ status: 409, description: 'Volume with this name already exists' })
  async create(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Body() createVolumeDto: CreateVolumeDto,
  ) {
    return this.volumesService.create(req.user.id, projectId, createVolumeDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a volume (rename, resize)' })
  @ApiResponse({ status: 200, description: 'Volume updated successfully' })
  @ApiResponse({ status: 404, description: 'Volume not found' })
  @ApiResponse({ status: 400, description: 'Invalid update (e.g., size decrease)' })
  async update(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() updateVolumeDto: UpdateVolumeDto,
  ) {
    return this.volumesService.update(req.user.id, projectId, id, updateVolumeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a volume' })
  @ApiResponse({ status: 204, description: 'Volume deleted successfully' })
  @ApiResponse({ status: 404, description: 'Volume not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete attached volume' })
  async remove(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    await this.volumesService.remove(req.user.id, projectId, id);
  }

  @Post(':id/attach')
  @ApiOperation({ summary: 'Attach a volume to a service' })
  @ApiResponse({ status: 200, description: 'Volume attached successfully' })
  @ApiResponse({ status: 404, description: 'Volume or service not found' })
  @ApiResponse({ status: 409, description: 'Volume already attached or mount path in use' })
  async attach(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() attachVolumeDto: AttachVolumeDto,
  ) {
    return this.volumesService.attach(req.user.id, projectId, id, attachVolumeDto);
  }

  @Post(':id/detach')
  @ApiOperation({ summary: 'Detach a volume from its service' })
  @ApiResponse({ status: 200, description: 'Volume detached successfully' })
  @ApiResponse({ status: 404, description: 'Volume not found' })
  @ApiResponse({ status: 400, description: 'Volume is not attached' })
  async detach(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.volumesService.detach(req.user.id, projectId, id);
  }
}
