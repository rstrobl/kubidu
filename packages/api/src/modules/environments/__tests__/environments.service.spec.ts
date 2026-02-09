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
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.environmentVariable.findMany as jest.Mock).mockResolvedValue([mockEnvVar]);
      (prisma.envVarReference.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getVariables('user-123', 'service-123');

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('TEST_KEY');
    });

    it('should decrypt values when requested', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
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

  describe('setVariable with deployment scope', () => {
    it('should create variable for deployment scope', async () => {
      const mockDeployment = {
        id: 'deployment-123',
        service: mockService,
      };
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue(mockDeployment);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.environmentVariable.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.environmentVariable.create as jest.Mock).mockResolvedValue({
        ...mockEnvVar,
        deploymentId: 'deployment-123',
        serviceId: null,
      });

      const result = await service.setVariable('user-123', {
        deploymentId: 'deployment-123',
        key: 'DEPLOY_VAR',
        value: 'test-value',
      });

      expect(prisma.environmentVariable.create).toHaveBeenCalled();
      expect(prisma.deployment.findUnique).toHaveBeenCalled();
    });

    it('should throw NotFoundException when deployment not found', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.setVariable('user-123', {
          deploymentId: 'nonexistent',
          key: 'TEST_KEY',
          value: 'test',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setVariable with auto-deploy', () => {
    it('should trigger deployment when service has autoDeploy enabled', async () => {
      const autoDeployService = {
        ...mockService,
        autoDeploy: true,
        defaultPort: 3000,
        defaultReplicas: 1,
        defaultCpuLimit: '500m',
        defaultMemoryLimit: '512Mi',
        defaultCpuRequest: '100m',
        defaultMemoryRequest: '128Mi',
        defaultHealthCheckPath: '/health',
      };
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(autoDeployService);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.environmentVariable.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.environmentVariable.create as jest.Mock).mockResolvedValue(mockEnvVar);
      (deploymentsService.create as jest.Mock).mockResolvedValue({});

      await service.setVariable('user-123', {
        serviceId: 'service-123',
        key: 'NEW_VAR',
        value: 'test-value',
      });

      expect(deploymentsService.create).toHaveBeenCalledWith('user-123', expect.objectContaining({
        serviceId: 'service-123',
      }));
    });

    it('should handle deployment trigger failure gracefully', async () => {
      const autoDeployService = {
        ...mockService,
        autoDeploy: true,
      };
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(autoDeployService);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.environmentVariable.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.environmentVariable.create as jest.Mock).mockResolvedValue(mockEnvVar);
      (deploymentsService.create as jest.Mock).mockRejectedValue(new Error('Deploy failed'));

      // Should not throw
      await expect(service.setVariable('user-123', {
        serviceId: 'service-123',
        key: 'NEW_VAR',
        value: 'test-value',
      })).resolves.not.toThrow();
    });
  });

  describe('setVariable with inline references', () => {
    it('should sync references from ${{ServiceName.VAR}} syntax', async () => {
      const sourceService = {
        id: 'source-123',
        name: 'database',
        projectId: 'project-123',
      };
      (prisma.service.findUnique as jest.Mock)
        .mockResolvedValueOnce({ ...mockService, projectId: 'project-123' })
        .mockResolvedValueOnce({ ...mockService, projectId: 'project-123' });
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.environmentVariable.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // for setVariable check
        .mockResolvedValueOnce({ key: 'DATABASE_URL', isShared: true }); // for syncReferences check
      (prisma.environmentVariable.create as jest.Mock).mockResolvedValue(mockEnvVar);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([mockService, sourceService]);
      (prisma.envVarReference.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.envVarReference.create as jest.Mock).mockResolvedValue({});

      await service.setVariable('user-123', {
        serviceId: 'service-123',
        key: 'CONNECTION_STRING',
        value: 'postgres://${{database.DATABASE_URL}}/db',
      });

      expect(prisma.envVarReference.create).toHaveBeenCalled();
    });
  });

  describe('deleteVariable with deployment scope', () => {
    it('should delete variable scoped to deployment', async () => {
      const mockDeployment = {
        id: 'deployment-123',
        service: mockService,
      };
      (prisma.environmentVariable.findUnique as jest.Mock).mockResolvedValue({
        ...mockEnvVar,
        serviceId: null,
        deploymentId: 'deployment-123',
      });
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue(mockDeployment);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.environmentVariable.delete as jest.Mock).mockResolvedValue({});

      await service.deleteVariable('user-123', 'envvar-123');

      expect(prisma.environmentVariable.delete).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when variable has no scope', async () => {
      (prisma.environmentVariable.findUnique as jest.Mock).mockResolvedValue({
        ...mockEnvVar,
        serviceId: null,
        deploymentId: null,
      });

      await expect(service.deleteVariable('user-123', 'envvar-123')).rejects.toThrow(ForbiddenException);
    });

    it('should trigger auto-deploy after deletion', async () => {
      const autoDeployService = {
        ...mockService,
        autoDeploy: true,
      };
      (prisma.environmentVariable.findUnique as jest.Mock).mockResolvedValue(mockEnvVar);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(autoDeployService);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.environmentVariable.delete as jest.Mock).mockResolvedValue({});
      (deploymentsService.create as jest.Mock).mockResolvedValue({});

      await service.deleteVariable('user-123', 'envvar-123');

      expect(deploymentsService.create).toHaveBeenCalled();
    });
  });

  describe('getSharedVariables edge cases', () => {
    it('should exclude specified service', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: 'project-123', workspaceId: 'workspace-123' });
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getSharedVariables('user-123', 'project-123', 'exclude-service-id');

      expect(prisma.service.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          id: { not: 'exclude-service-id' },
        }),
      }));
    });

    it('should mask secret values', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: 'project-123', workspaceId: 'workspace-123' });
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([{
        id: 'service-1',
        name: 'Service 1',
        environmentVariables: [{
          key: 'SECRET_VAR',
          isSecret: true,
          isSystem: false,
          isShared: true,
          valueEncrypted: 'enc',
          valueIv: 'iv:tag',
        }],
      }]);

      const result = await service.getSharedVariables('user-123', 'project-123');

      expect(result[0].variables[0].value).toBe('***');
    });

    it('should handle decryption failure gracefully', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: 'project-123', workspaceId: 'workspace-123' });
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([{
        id: 'service-1',
        name: 'Service 1',
        environmentVariables: [{
          key: 'BROKEN_VAR',
          isSecret: false,
          isSystem: false,
          isShared: true,
          valueEncrypted: 'bad-data',
          valueIv: 'invalid-format',
        }],
      }]);
      (encryptionService.decrypt as jest.Mock).mockImplementation(() => { throw new Error('Decrypt failed'); });

      const result = await service.getSharedVariables('user-123', 'project-123');

      expect(result[0].variables[0].value).toBeUndefined();
    });
  });

  describe('createReference edge cases', () => {
    it('should throw NotFoundException when source service not found', async () => {
      (prisma.service.findUnique as jest.Mock)
        .mockResolvedValueOnce({ ...mockService, projectId: 'project-123' })
        .mockResolvedValueOnce(null);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);

      await expect(
        service.createReference('user-123', {
          serviceId: 'service-123',
          sourceServiceId: 'nonexistent',
          key: 'TEST_KEY',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when services in different projects', async () => {
      (prisma.service.findUnique as jest.Mock)
        .mockResolvedValueOnce({ ...mockService, projectId: 'project-123' })
        .mockResolvedValueOnce({ ...mockService, id: 'other-123', projectId: 'other-project' });
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);

      await expect(
        service.createReference('user-123', {
          serviceId: 'service-123',
          sourceServiceId: 'other-123',
          key: 'TEST_KEY',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when variable not found or not shared', async () => {
      (prisma.service.findUnique as jest.Mock)
        .mockResolvedValueOnce({ ...mockService, projectId: 'project-123' })
        .mockResolvedValueOnce({ ...mockService, id: 'source-123', projectId: 'project-123', project: { workspaceId: 'workspace-123' } });
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.environmentVariable.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createReference('user-123', {
          serviceId: 'service-123',
          sourceServiceId: 'source-123',
          key: 'PRIVATE_VAR',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
