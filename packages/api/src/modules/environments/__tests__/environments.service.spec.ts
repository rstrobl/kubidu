import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EnvironmentsService } from '../environments.service';
import { PrismaService } from '../../../database/prisma.service';
import { EncryptionService } from '../../../services/encryption.service';
import { AuthorizationService } from '../../../services/authorization.service';
import { DeploymentsService } from '../../deployments/deployments.service';
import { WorkspaceRole } from '@prisma/client';

describe('EnvironmentsService', () => {
  let service: EnvironmentsService;
  let prisma: jest.Mocked<PrismaService>;
  let encryptionService: jest.Mocked<EncryptionService>;
  let authorizationService: jest.Mocked<AuthorizationService>;
  let deploymentsService: jest.Mocked<DeploymentsService>;

  const mockService = {
    id: 'service-123',
    name: 'test-service',
    autoDeploy: false,
    project: {
      id: 'project-123',
      workspaceId: 'workspace-123',
    },
  };

  const mockEnvVar = {
    id: 'envvar-123',
    key: 'TEST_KEY',
    valueEncrypted: 'encrypted-value',
    valueIv: 'iv:authTag',
    isSecret: true,
    isSystem: false,
    isShared: false,
    serviceId: 'service-123',
    deploymentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      service: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      deployment: {
        findUnique: jest.fn(),
      },
      environmentVariable: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      envVarReference: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      project: {
        findUnique: jest.fn(),
      },
      workspaceMember: {
        findMany: jest.fn(),
      },
    };

    const mockEncryptionService = {
      encrypt: jest.fn().mockReturnValue({ encrypted: 'encrypted', iv: 'iv', authTag: 'authTag' }),
      decrypt: jest.fn().mockReturnValue('decrypted-value'),
    };

    const mockAuthorizationService = {
      checkWorkspaceAccess: jest.fn(),
    };

    const mockDeploymentsService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnvironmentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: AuthorizationService, useValue: mockAuthorizationService },
        { provide: DeploymentsService, useValue: mockDeploymentsService },
      ],
    }).compile();

    service = module.get<EnvironmentsService>(EnvironmentsService);
    prisma = module.get(PrismaService);
    encryptionService = module.get(EncryptionService);
    authorizationService = module.get(AuthorizationService);
    deploymentsService = module.get(DeploymentsService);
  });

  describe('setVariable', () => {
    it('should create a new environment variable', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.environmentVariable.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.environmentVariable.create as jest.Mock).mockResolvedValue(mockEnvVar);

      const result = await service.setVariable('user-123', {
        serviceId: 'service-123',
        key: 'TEST_KEY',
        value: 'test-value',
        isSecret: true,
      });

      expect(result.key).toBe('TEST_KEY');
      expect(prisma.environmentVariable.create).toHaveBeenCalled();
    });

    it('should update existing environment variable', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.environmentVariable.findFirst as jest.Mock).mockResolvedValue(mockEnvVar);
      (prisma.environmentVariable.update as jest.Mock).mockResolvedValue(mockEnvVar);

      const result = await service.setVariable('user-123', {
        serviceId: 'service-123',
        key: 'TEST_KEY',
        value: 'new-value',
      });

      expect(prisma.environmentVariable.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException for KUBIDU_ prefixed keys', async () => {
      await expect(
        service.setVariable('user-123', {
          serviceId: 'service-123',
          key: 'KUBIDU_SECRET',
          value: 'test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no scope provided', async () => {
      await expect(
        service.setVariable('user-123', {
          key: 'TEST_KEY',
          value: 'test',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when service not found', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.setVariable('user-123', {
          serviceId: 'nonexistent',
          key: 'TEST_KEY',
          value: 'test',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getVariables', () => {
    it('should return variables for a service', async () => {
      (prisma.environmentVariable.findMany as jest.Mock).mockResolvedValue([mockEnvVar]);
      (prisma.envVarReference.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getVariables('user-123', 'service-123');

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('TEST_KEY');
    });

    it('should decrypt values when requested', async () => {
      (prisma.environmentVariable.findMany as jest.Mock).mockResolvedValue([mockEnvVar]);
      (prisma.envVarReference.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getVariables('user-123', 'service-123', undefined, true);

      expect(result[0].value).toBe('decrypted-value');
      expect(encryptionService.decrypt).toHaveBeenCalled();
    });
  });

  describe('deleteVariable', () => {
    it('should delete an environment variable', async () => {
      (prisma.environmentVariable.findUnique as jest.Mock).mockResolvedValue(mockEnvVar);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.environmentVariable.delete as jest.Mock).mockResolvedValue(mockEnvVar);

      await service.deleteVariable('user-123', 'envvar-123');

      expect(prisma.environmentVariable.delete).toHaveBeenCalledWith({
        where: { id: 'envvar-123' },
      });
    });

    it('should throw NotFoundException when variable not found', async () => {
      (prisma.environmentVariable.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteVariable('user-123', 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for system variables', async () => {
      (prisma.environmentVariable.findUnique as jest.Mock).mockResolvedValue({
        ...mockEnvVar,
        isSystem: true,
      });

      await expect(service.deleteVariable('user-123', 'envvar-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSharedVariables', () => {
    it('should return shared variables from project services', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: 'project-123', workspaceId: 'workspace-123' });
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'service-1',
          name: 'Service 1',
          environmentVariables: [{ key: 'SHARED_VAR', isSystem: false, isShared: true, isSecret: false, valueEncrypted: 'enc', valueIv: 'iv:tag' }],
        },
      ]);

      const result = await service.getSharedVariables('user-123', 'project-123');

      expect(result).toHaveLength(1);
      expect(result[0].serviceName).toBe('Service 1');
    });

    it('should throw NotFoundException when project not found', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getSharedVariables('user-123', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createReference', () => {
    const mockSourceService = {
      id: 'source-123',
      name: 'source-service',
      projectId: 'project-123',
      project: { workspaceId: 'workspace-123' },
    };

    it('should create a reference between services', async () => {
      (prisma.service.findUnique as jest.Mock)
        .mockResolvedValueOnce({ ...mockService, projectId: 'project-123' })
        .mockResolvedValueOnce(mockSourceService);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.environmentVariable.findFirst as jest.Mock).mockResolvedValue({ ...mockEnvVar, isShared: true });
      (prisma.envVarReference.create as jest.Mock).mockResolvedValue({
        id: 'ref-123',
        serviceId: 'service-123',
        sourceServiceId: 'source-123',
        key: 'TEST_KEY',
      });

      const result = await service.createReference('user-123', {
        serviceId: 'service-123',
        sourceServiceId: 'source-123',
        key: 'TEST_KEY',
      });

      expect(result.id).toBe('ref-123');
    });

    it('should throw NotFoundException when consumer service not found', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createReference('user-123', {
          serviceId: 'nonexistent',
          sourceServiceId: 'source-123',
          key: 'TEST_KEY',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when referencing same service', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue({
        ...mockService,
        projectId: 'project-123',
      });
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);

      await expect(
        service.createReference('user-123', {
          serviceId: 'service-123',
          sourceServiceId: 'service-123',
          key: 'TEST_KEY',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getReferences', () => {
    it('should return references for a service', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.envVarReference.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'ref-123',
          sourceServiceId: 'source-123',
          sourceService: { id: 'source-123', name: 'Source Service' },
          key: 'DATABASE_URL',
          alias: null,
          createdAt: new Date(),
        },
      ]);

      const result = await service.getReferences('user-123', 'service-123');

      expect(result).toHaveLength(1);
      expect(result[0].sourceServiceName).toBe('Source Service');
    });

    it('should throw NotFoundException when service not found', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getReferences('user-123', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteReference', () => {
    it('should delete a reference', async () => {
      (prisma.envVarReference.findUnique as jest.Mock).mockResolvedValue({
        id: 'ref-123',
        service: mockService,
      });
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.envVarReference.delete as jest.Mock).mockResolvedValue({});

      await service.deleteReference('user-123', 'ref-123');

      expect(prisma.envVarReference.delete).toHaveBeenCalledWith({ where: { id: 'ref-123' } });
    });

    it('should throw NotFoundException when reference not found', async () => {
      (prisma.envVarReference.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteReference('user-123', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
