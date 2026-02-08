import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { DeployTemplateDto } from './dto/deploy-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  async findAll(@Query('category') category?: string) {
    if (category) {
      return this.templatesService.findByCategory(category);
    }
    return this.templatesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.templatesService.findBySlug(slug);
  }
}

@Controller('projects/:projectId/templates')
@UseGuards(JwtAuthGuard)
export class ProjectTemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post('deploy')
  async deploy(
    @Request() req,
    @Param('projectId') projectId: string,
    @Body() dto: DeployTemplateDto,
  ) {
    return this.templatesService.deploy(req.user.id, projectId, dto);
  }

  @Get('deployments')
  async getDeployments(@Request() req, @Param('projectId') projectId: string) {
    return this.templatesService.getProjectDeployments(req.user.id, projectId);
  }

  @Get('deployments/:deploymentId')
  async getDeployment(
    @Request() req,
    @Param('projectId') projectId: string,
    @Param('deploymentId') deploymentId: string,
  ) {
    return this.templatesService.getDeployment(
      req.user.id,
      projectId,
      deploymentId,
    );
  }
}
