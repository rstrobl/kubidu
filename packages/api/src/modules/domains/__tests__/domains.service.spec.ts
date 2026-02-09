import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DomainsService } from '../domains.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuthorizationService } from '../../../services/authorization.service';
import { NotificationsService } from '../../notifications/notifications.service';

jest.mock('dns', () => ({
  resolveTxt: jest.fn(),
  resolveCname: jest.fn(),
}));

describe('DomainsService', () => {
  let service: DomainsService;
  let prisma: jest.Mocked<PrismaService>;
  let authorizationService: jest.Mocked<AuthorizationService>;

  const mockService = {
    id: 'service-123',
    name: 'test-service',
    project: {
      id: 'project-123',
      workspaceId: 'workspace-123',
    },
  };

  const mockDomain = {
    id: 'domain-123',
    domain: 'example.com',
    serviceId: 'service-123',
    verificationCode: 'abc123',
    isVerified: false,
    verifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    service: mockService,
  };

  beforeEach(async () => {
    const mockPrisma = {
      service: {
        findUnique: jest.fn(),
      },
      domain: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      workspaceMember: {
        findMany: jest.fn(),
      },
      project: {
        findUnique: jest.fn(),
      },
    };

    const mockAuthorizationService = {
      checkWorkspaceAccess: jest.fn(),
    };

    const mockNotificationsService = {
      notifyDomainVerification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DomainsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthorizationService, useValue: mockAuthorizationService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<DomainsService>(DomainsService);
    prisma = module.get(PrismaService);
    authorizationService = module.get(AuthorizationService);
  });

  describe('create', () => {
    it('should create a domain', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.domain.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.domain.create as jest.Mock).mockResolvedValue(mockDomain);

      const result = await service.create('user-123', 'service-123', { domain: 'example.com' });

      expect(result.domain).toBe('example.com');
      expect(prisma.domain.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when service not found', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create('user-123', 'nonexistent', { domain: 'example.com' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when domain already exists', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.domain.findUnique as jest.Mock).mockResolvedValue(mockDomain);

      await expect(
        service.create('user-123', 'service-123', { domain: 'example.com' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all domains for a service', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.domain.findMany as jest.Mock).mockResolvedValue([mockDomain]);

      const result = await service.findAll('user-123', 'service-123');

      expect(result).toHaveLength(1);
      expect(result[0].domain).toBe('example.com');
    });

    it('should throw NotFoundException when service not found', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findAll('user-123', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a domain', async () => {
      (prisma.domain.findUnique as jest.Mock).mockResolvedValue(mockDomain);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.domain.delete as jest.Mock).mockResolvedValue(mockDomain);

      await service.delete('user-123', 'domain-123');

      expect(prisma.domain.delete).toHaveBeenCalledWith({ where: { id: 'domain-123' } });
    });

    it('should throw NotFoundException when domain not found', async () => {
      (prisma.domain.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('user-123', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
