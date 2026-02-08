import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EnvironmentsService } from './environments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SetEnvironmentVariableDto } from './dto/set-environment-variable.dto';
import { CreateEnvVarReferenceDto } from './dto/create-env-var-reference.dto';

@ApiTags('Environment Variables')
@Controller('environments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Set an environment variable' })
  @ApiResponse({ status: 201, description: 'Environment variable set successfully' })
  async setVariable(@Req() req, @Body() setEnvVarDto: SetEnvironmentVariableDto) {
    return this.environmentsService.setVariable(req.user.id, setEnvVarDto);
  }

  @Get()
  @ApiOperation({ summary: 'List environment variables' })
  @ApiQuery({ name: 'serviceId', required: false })
  @ApiQuery({ name: 'deploymentId', required: false })
  @ApiQuery({ name: 'decrypt', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Environment variables retrieved' })
  async getVariables(
    @Req() req,
    @Query('serviceId') serviceId?: string,
    @Query('deploymentId') deploymentId?: string,
    @Query('decrypt', new ParseBoolPipe({ optional: true })) decrypt?: boolean,
  ) {
    return this.environmentsService.getVariables(
      req.user.id,
      serviceId,
      deploymentId,
      decrypt,
    );
  }

  @Get('shared')
  @ApiOperation({ summary: 'Get shareable variables from other services in a project' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'excludeServiceId', required: false })
  @ApiResponse({ status: 200, description: 'Shared variables retrieved' })
  async getSharedVariables(
    @Req() req,
    @Query('projectId') projectId: string,
    @Query('excludeServiceId') excludeServiceId?: string,
  ) {
    return this.environmentsService.getSharedVariables(
      req.user.id,
      projectId,
      excludeServiceId,
    );
  }

  @Post('references')
  @ApiOperation({ summary: 'Create an environment variable reference' })
  @ApiResponse({ status: 201, description: 'Reference created successfully' })
  async createReference(@Req() req, @Body() dto: CreateEnvVarReferenceDto) {
    return this.environmentsService.createReference(req.user.id, dto);
  }

  @Get('references')
  @ApiOperation({ summary: 'Get environment variable references for a service' })
  @ApiQuery({ name: 'serviceId', required: true })
  @ApiResponse({ status: 200, description: 'References retrieved' })
  async getReferences(
    @Req() req,
    @Query('serviceId') serviceId: string,
  ) {
    return this.environmentsService.getReferences(req.user.id, serviceId);
  }

  @Delete('references/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an environment variable reference' })
  @ApiResponse({ status: 204, description: 'Reference deleted successfully' })
  async deleteReference(@Req() req, @Param('id') id: string) {
    await this.environmentsService.deleteReference(req.user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an environment variable' })
  @ApiResponse({ status: 204, description: 'Environment variable deleted successfully' })
  async deleteVariable(@Req() req, @Param('id') id: string) {
    await this.environmentsService.deleteVariable(req.user.id, id);
  }
}
