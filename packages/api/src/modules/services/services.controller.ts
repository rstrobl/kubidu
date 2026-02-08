import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { DockerInspectorService } from './docker-inspector.service';

@ApiTags('Services')
@Controller('projects/:projectId/services')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ServicesController {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly dockerInspector: DockerInspectorService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new service in a project' })
  @ApiResponse({ status: 201, description: 'Service created successfully' })
  @ApiResponse({ status: 409, description: 'Service with this name already exists' })
  async create(
    @Req() req,
    @Param('projectId') projectId: string,
    @Body() createServiceDto: CreateServiceDto,
  ) {
    return this.servicesService.create(req.user.id, projectId, createServiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all services for a project' })
  @ApiResponse({ status: 200, description: 'Services retrieved' })
  async findAll(@Req() req, @Param('projectId') projectId: string) {
    return this.servicesService.findAll(req.user.id, projectId);
  }

  @Get('inspect-docker-image')
  @ApiOperation({ summary: 'Inspect a Docker image to detect exposed ports' })
  @ApiQuery({ name: 'image', required: true, description: 'Docker image name (e.g., nginx:latest)' })
  @ApiResponse({ status: 200, description: 'Image inspected successfully' })
  async inspectDockerImage(@Query('image') image: string) {
    if (!image) {
      return { error: 'Image parameter is required' };
    }

    const exposedPort = await this.dockerInspector.getExposedPort(image);
    const allPorts = await this.dockerInspector.getAllExposedPorts(image);

    return {
      image,
      detectedPort: exposedPort,
      allPorts,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific service' })
  @ApiResponse({ status: 200, description: 'Service retrieved' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async findOne(
    @Req() req,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.servicesService.findOne(req.user.id, projectId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a service' })
  @ApiResponse({ status: 200, description: 'Service updated successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async update(
    @Req() req,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return this.servicesService.update(req.user.id, projectId, id, updateServiceDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a service' })
  @ApiResponse({ status: 204, description: 'Service deleted successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async remove(
    @Req() req,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    await this.servicesService.remove(req.user.id, projectId, id);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete multiple services' })
  @ApiResponse({ status: 200, description: 'Services deleted successfully' })
  @ApiResponse({ status: 404, description: 'One or more services not found' })
  async removeMany(
    @Req() req,
    @Param('projectId') projectId: string,
    @Body() body: { serviceIds: string[] },
  ) {
    return this.servicesService.removeMany(req.user.id, projectId, body.serviceIds);
  }
}
