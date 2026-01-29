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
  @ApiQuery({ name: 'projectId', required: false })
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an environment variable' })
  @ApiResponse({ status: 204, description: 'Environment variable deleted successfully' })
  async deleteVariable(@Req() req, @Param('id') id: string) {
    await this.environmentsService.deleteVariable(req.user.id, id);
  }
}
