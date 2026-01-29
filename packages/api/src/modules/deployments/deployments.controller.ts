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
import { DeploymentsService } from './deployments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDeploymentDto } from './dto/create-deployment.dto';
import { UpdateDeploymentDto } from './dto/update-deployment.dto';

@ApiTags('Deployments')
@Controller('deployments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeploymentsController {
  constructor(private readonly deploymentsService: DeploymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new deployment' })
  @ApiResponse({ status: 201, description: 'Deployment created successfully' })
  async create(@Req() req, @Body() createDeploymentDto: CreateDeploymentDto) {
    return this.deploymentsService.create(req.user.id, createDeploymentDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all deployments' })
  @ApiQuery({ name: 'serviceId', required: false })
  @ApiResponse({ status: 200, description: 'Deployments retrieved' })
  async findAll(@Req() req, @Query('serviceId') serviceId?: string) {
    return this.deploymentsService.findAll(req.user.id, serviceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific deployment' })
  @ApiResponse({ status: 200, description: 'Deployment retrieved' })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  async findOne(@Req() req, @Param('id') id: string) {
    return this.deploymentsService.findOne(req.user.id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a deployment' })
  @ApiResponse({ status: 200, description: 'Deployment updated successfully' })
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateDeploymentDto: UpdateDeploymentDto,
  ) {
    return this.deploymentsService.update(req.user.id, id, updateDeploymentDto);
  }

  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop a deployment' })
  @ApiResponse({ status: 200, description: 'Deployment stopped' })
  async stop(@Req() req, @Param('id') id: string) {
    await this.deploymentsService.stop(req.user.id, id);
    return { message: 'Deployment stopped successfully' };
  }

  @Post(':id/restart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restart a deployment' })
  @ApiResponse({ status: 200, description: 'Deployment restarted' })
  async restart(@Req() req, @Param('id') id: string) {
    await this.deploymentsService.restart(req.user.id, id);
    return { message: 'Deployment restarted successfully' };
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed deployment' })
  @ApiResponse({ status: 200, description: 'Deployment retry initiated' })
  async retry(@Req() req, @Param('id') id: string) {
    await this.deploymentsService.retry(req.user.id, id);
    return { message: 'Deployment retry initiated successfully' };
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get deployment runtime logs' })
  @ApiQuery({ name: 'tail', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Runtime logs retrieved' })
  async getLogs(
    @Req() req,
    @Param('id') id: string,
    @Query('tail') tail?: number,
  ) {
    const logs = await this.deploymentsService.getLogs(req.user.id, id, tail);
    return { logs };
  }

  @Get(':id/build-logs')
  @ApiOperation({ summary: 'Get deployment build logs' })
  @ApiQuery({ name: 'tail', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Build logs retrieved' })
  async getBuildLogs(
    @Req() req,
    @Param('id') id: string,
    @Query('tail') tail?: number,
  ) {
    const logs = await this.deploymentsService.getBuildLogs(req.user.id, id, tail);
    return { logs };
  }
}
