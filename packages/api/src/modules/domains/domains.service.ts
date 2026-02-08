import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Domain, WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateDomainDto } from './dto/create-domain.dto';
import { NotificationsService } from '../notifications/notifications.service';
import * as crypto from 'crypto';
import * as dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);

@Injectable()
export class DomainsService {
  private readonly logger = new Logger(DomainsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Check if user has access to a workspace with required roles
   */
  private async checkWorkspaceAccess(
    userId: string,
    workspaceId: string,
    allowedRoles: WorkspaceRole[],
  ): Promise<void> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
    });

    if (!member || !allowedRoles.includes(member.role)) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }
  }

  async create(
    userId: string,
    serviceId: string,
    createDomainDto: CreateDomainDto,
  ): Promise<Domain> {
    // Verify service ownership via workspace
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { project: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    await this.checkWorkspaceAccess(userId, service.project.workspaceId, [
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
    ]);

    // Check if domain already exists
    const existing = await this.prisma.domain.findUnique({
      where: { domain: createDomainDto.domain },
    });

    if (existing) {
      throw new BadRequestException('Domain already exists');
    }

    // Generate verification code
    const verificationCode = crypto.randomBytes(16).toString('hex');

    const domain = await this.prisma.domain.create({
      data: {
        serviceId,
        domain: createDomainDto.domain,
        verificationCode,
        isVerified: false,
      },
    });

    this.logger.log(`Domain ${domain.domain} created for service ${serviceId}`);
    return domain;
  }

  async findAll(userId: string, serviceId: string): Promise<Domain[]> {
    // Verify service ownership via workspace
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { project: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    await this.checkWorkspaceAccess(userId, service.project.workspaceId, [
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
      WorkspaceRole.DEPLOYER,
    ]);

    return this.prisma.domain.findMany({
      where: { serviceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verify(userId: string, domainId: string): Promise<Domain> {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      include: { service: { include: { project: true } } },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    await this.checkWorkspaceAccess(userId, domain.service.project.workspaceId, [
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
    ]);

    if (domain.isVerified) {
      return domain;
    }

    // Verify DNS records
    let verified = false;
    const verificationString = `kubidu-verification=${domain.verificationCode}`;

    try {
      // Try TXT record verification
      const txtRecords = await resolveTxt(domain.domain);
      const flatRecords = txtRecords.flat();

      if (flatRecords.some(record => record === verificationString)) {
        verified = true;
        this.logger.log(`Domain ${domain.domain} verified via TXT record`);
      }
    } catch (error) {
      this.logger.warn(`Failed to verify domain ${domain.domain} via TXT record: ${error.message}`);
    }

    if (!verified) {
      try {
        // Try CNAME verification (should point to the auto-generated subdomain)
        const cnameRecords = await resolveCname(domain.domain);

        // Get the auto-generated subdomain from the service URL
        const service = await this.prisma.service.findUnique({
          where: { id: domain.serviceId },
          select: { url: true },
        });

        if (service?.url) {
          const expectedCname = new URL(service.url).hostname;
          if (cnameRecords.some(record => record === expectedCname)) {
            verified = true;
            this.logger.log(`Domain ${domain.domain} verified via CNAME record`);
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to verify domain ${domain.domain} via CNAME record: ${error.message}`);
      }
    }

    if (!verified) {
      throw new BadRequestException(
        'Domain verification failed. Please ensure you have added the TXT record: ' +
        verificationString +
        ' or CNAME pointing to your auto-generated domain',
      );
    }

    // Update domain as verified
    const updatedDomain = await this.prisma.domain.update({
      where: { id: domainId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    this.logger.log(`Domain ${domain.domain} successfully verified`);

    // Send notification for domain verification
    await this.sendDomainNotification(updatedDomain, domain.service);

    return updatedDomain;
  }

  private async sendDomainNotification(
    domain: Domain,
    service: { id: string; name: string; project: { id: string; name?: string; workspaceId: string } },
  ): Promise<void> {
    try {
      const members = await this.prisma.workspaceMember.findMany({
        where: { workspaceId: service.project.workspaceId },
        select: { userId: true },
      });

      const userIds = members.map((m) => m.userId);
      if (userIds.length === 0) return;

      const project = await this.prisma.project.findUnique({
        where: { id: service.project.id },
        select: { name: true },
      });

      await this.notificationsService.notifyDomainVerification(
        service.project.workspaceId,
        userIds,
        {
          id: domain.id,
          domain: domain.domain,
          isVerified: domain.isVerified,
        },
        {
          id: service.id,
          name: service.name,
        },
        {
          id: service.project.id,
          name: project?.name || 'Unknown Project',
        },
      );
    } catch (error) {
      this.logger.error(`Failed to send domain notification: ${error.message}`);
    }
  }

  async delete(userId: string, domainId: string): Promise<void> {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      include: { service: { include: { project: true } } },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    await this.checkWorkspaceAccess(userId, domain.service.project.workspaceId, [
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
    ]);

    await this.prisma.domain.delete({
      where: { id: domainId },
    });

    this.logger.log(`Domain ${domain.domain} deleted`);
  }
}
