import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WebhooksService, WEBHOOK_EVENTS } from './webhooks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../database/prisma.service';

class CreateWebhookDto {
  name: string;
  url: string;
  type?: 'DISCORD' | 'SLACK' | 'CUSTOM';
  secret?: string;
  events: string[];
}

class UpdateWebhookDto {
  name?: string;
  url?: string;
  events?: string[];
  enabled?: boolean;
}

@ApiTags('Webhooks')
@Controller('projects/:projectId/webhooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly prisma: PrismaService,
  ) {}

  private async verifyProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!project) {
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }

    if (project.workspace.members.length === 0) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    return project;
  }

  @Get()
  @ApiOperation({ summary: 'List all webhooks for a project' })
  @ApiResponse({ status: 200, description: 'Webhooks list retrieved' })
  async findAll(@Req() req, @Param('projectId') projectId: string) {
    await this.verifyProjectAccess(req.user.id, projectId);
    return this.webhooksService.findAll(projectId);
  }

  @Get('events')
  @ApiOperation({ summary: 'Get available webhook events' })
  @ApiResponse({ status: 200, description: 'Events list retrieved' })
  async getEvents() {
    return {
      events: WEBHOOK_EVENTS,
      categories: {
        deployment: WEBHOOK_EVENTS.filter((e) => e.startsWith('deployment.')),
        build: WEBHOOK_EVENTS.filter((e) => e.startsWith('build.')),
        service: WEBHOOK_EVENTS.filter((e) => e.startsWith('service.')),
        domain: WEBHOOK_EVENTS.filter((e) => e.startsWith('domain.')),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a webhook by ID' })
  @ApiResponse({ status: 200, description: 'Webhook retrieved' })
  async findOne(
    @Req() req,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    await this.verifyProjectAccess(req.user.id, projectId);
    
    const webhook = await this.webhooksService.findOne(id);
    if (!webhook || webhook.projectId !== projectId) {
      throw new HttpException('Webhook not found', HttpStatus.NOT_FOUND);
    }
    
    return webhook;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new webhook' })
  @ApiResponse({ status: 201, description: 'Webhook created' })
  async create(
    @Req() req,
    @Param('projectId') projectId: string,
    @Body() data: CreateWebhookDto,
  ) {
    await this.verifyProjectAccess(req.user.id, projectId);

    // Validate URL
    try {
      new URL(data.url);
    } catch {
      throw new HttpException('Invalid webhook URL', HttpStatus.BAD_REQUEST);
    }

    // Validate events
    const invalidEvents = data.events.filter(
      (e) => !WEBHOOK_EVENTS.includes(e as any),
    );
    if (invalidEvents.length > 0) {
      throw new HttpException(
        `Invalid events: ${invalidEvents.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.webhooksService.create(projectId, data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a webhook' })
  @ApiResponse({ status: 200, description: 'Webhook updated' })
  async update(
    @Req() req,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() data: UpdateWebhookDto,
  ) {
    await this.verifyProjectAccess(req.user.id, projectId);

    const webhook = await this.webhooksService.findOne(id);
    if (!webhook || webhook.projectId !== projectId) {
      throw new HttpException('Webhook not found', HttpStatus.NOT_FOUND);
    }

    // Validate URL if provided
    if (data.url) {
      try {
        new URL(data.url);
      } catch {
        throw new HttpException('Invalid webhook URL', HttpStatus.BAD_REQUEST);
      }
    }

    // Validate events if provided
    if (data.events) {
      const invalidEvents = data.events.filter(
        (e) => !WEBHOOK_EVENTS.includes(e as any),
      );
      if (invalidEvents.length > 0) {
        throw new HttpException(
          `Invalid events: ${invalidEvents.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return this.webhooksService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiResponse({ status: 200, description: 'Webhook deleted' })
  async delete(
    @Req() req,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    await this.verifyProjectAccess(req.user.id, projectId);

    const webhook = await this.webhooksService.findOne(id);
    if (!webhook || webhook.projectId !== projectId) {
      throw new HttpException('Webhook not found', HttpStatus.NOT_FOUND);
    }

    return this.webhooksService.delete(id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Send a test webhook delivery' })
  @ApiResponse({ status: 200, description: 'Test delivery sent' })
  async test(
    @Req() req,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    await this.verifyProjectAccess(req.user.id, projectId);

    const webhook = await this.webhooksService.findOne(id);
    if (!webhook || webhook.projectId !== projectId) {
      throw new HttpException('Webhook not found', HttpStatus.NOT_FOUND);
    }

    try {
      const result = await this.webhooksService.test(id);
      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
