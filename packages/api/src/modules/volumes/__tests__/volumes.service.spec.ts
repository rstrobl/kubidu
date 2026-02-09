import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VolumesService } from '../volumes.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuthorizationService } from '../../../services/authorization.service';
import { WorkspaceRole } from '@prisma/client';

describe('VolumesService', () => {
  let service: VolumesService;
  let prisma: jest.Mocked<PrismaService>;
  let authorizationService: jest.Mocked<AuthorizationService>;

  const mockVolume = {
    id: 'volume-123',
    name: 'test-volume',
    projectId: 'project-123',
    sizeGB: 10,
    mountPath: '/data',
    createdAt: new Date(),
    updatedAt: new Date(),
    project: {
      id: 'project-123',
      workspaceId: 'workspace-123',
    },
    templateDeployment: null,
  };

  beforeEach(async () => {
    const mockPrisma = {
      volume: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const mockAuthorizationService = {
      checkWorkspaceAccessViaProject: jest.fn(),
      checkWorkspaceAccess: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VolumesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthorizationService, useValue: mockAuthorizationService },
      ],
    }).compile();

    service = module.get<VolumesService>(VolumesService);
    prisma = module.get(PrismaService);
    authorizationService = module.get(AuthorizationService);
  });

  describe('findAll', () => {
    it('should return all volumes for a project', async () => {
      (authorizationService.checkWorkspaceAccessViaProject as jest.Mock).mockResolvedValue(undefined);
      (prisma.volume.findMany as jest.Mock).mockResolvedValue([mockVolume]);

      const result = await service.findAll('user-123', 'project-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockVolume.id);
      expect(authorizationService.checkWorkspaceAccessViaProject).toHaveBeenCalledWith(
        'user-123',
        'project-123',
        [WorkspaceRole.ADMIN, WorkspaceRole.MEMBER, WorkspaceRole.DEPLOYER],
      );
    });

    it('should return empty array when no volumes', async () => {
      (authorizationService.checkWorkspaceAccessViaProject as jest.Mock).mockResolvedValue(undefined);
      (prisma.volume.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll('user-123', 'project-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return a volume with details', async () => {
      (prisma.volume.findUnique as jest.Mock).mockResolvedValue(mockVolume);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);

      const result = await service.findOne('user-123', 'project-123', 'volume-123');

      expect(result.id).toBe(mockVolume.id);
      expect(result.name).toBe(mockVolume.name);
    });

    it('should throw NotFoundException when volume not found', async () => {
      (prisma.volume.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('user-123', 'project-123', 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when volume is in different project', async () => {
      (prisma.volume.findUnique as jest.Mock).mockResolvedValue({ ...mockVolume, projectId: 'other-project' });

      await expect(service.findOne('user-123', 'project-123', 'volume-123')).rejects.toThrow(NotFoundException);
    });
  });
});
