import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Domain } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateDomainDto } from './dto/create-domain.dto';
import * as crypto from 'crypto';
import * as dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);

@Injectable()
export class DomainsService {
  private readonly logger = new Logger(DomainsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    serviceId: string,
    createDomainDto: CreateDomainDto,
  ): Promise<Domain> {
    // Verify service ownership
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { project: true },
    });

    if (!service || service.project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to modify this service');
    }

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
    // Verify service ownership
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { project: true },
    });

    if (!service || service.project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this service');
    }

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

    if (domain.service.project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to verify this domain');
    }

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
    return updatedDomain;
  }

  async delete(userId: string, domainId: string): Promise<void> {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      include: { service: { include: { project: true } } },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    if (domain.service.project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this domain');
    }

    await this.prisma.domain.delete({
      where: { id: domainId },
    });

    this.logger.log(`Domain ${domain.domain} deleted`);
  }
}
