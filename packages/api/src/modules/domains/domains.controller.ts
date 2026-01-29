import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DomainsService } from './domains.service';
import { CreateDomainDto } from './dto/create-domain.dto';

@ApiTags('domains')
@ApiBearerAuth()
@Controller('services/:serviceId/domains')
@UseGuards(JwtAuthGuard)
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a custom domain to a service' })
  async create(
    @Request() req: any,
    @Param('serviceId') serviceId: string,
    @Body() createDomainDto: CreateDomainDto,
  ) {
    return this.domainsService.create(req.user.id, serviceId, createDomainDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all domains for a service' })
  async findAll(@Request() req: any, @Param('serviceId') serviceId: string) {
    return this.domainsService.findAll(req.user.id, serviceId);
  }

  @Post(':domainId/verify')
  @ApiOperation({ summary: 'Verify domain ownership via DNS' })
  async verify(@Request() req: any, @Param('domainId') domainId: string) {
    return this.domainsService.verify(req.user.id, domainId);
  }

  @Delete(':domainId')
  @ApiOperation({ summary: 'Delete a custom domain' })
  async delete(@Request() req: any, @Param('domainId') domainId: string) {
    await this.domainsService.delete(req.user.id, domainId);
    return { message: 'Domain deleted successfully' };
  }
}
