import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { VolumesService } from '../volumes.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuthorizationService } from '../../../services/authorization.service';
import { VolumeSize } from '../dto/create-volume.dto';

describe('VolumesService', () => {
  let service: VolumesService;
  let prisma: jest.Mocked<any>;
  let authService: jest.Mocked<AuthorizationService>;

  const mockVolume = {
    id: 'volume-123',
    projectId: 'project-123',
    name: 'test-volume',
    mountPath: '/data',
    size: '10Gi',
    status: 'PENDING',
    serviceId: null,
    templateDeploymentId: null,
    boundAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    project: { workspaceId: 'workspace-123' },
  };

  beforeEach(async () => {
    const mockPrisma = {
      volume: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      service: {
        findUnique: jest.fn(),
      },
    };

    const mockAuthService = {
      checkWorkspaceAccessViaProject: jest.fn(),
      checkWorkspaceAccess: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VolumesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthorizationService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<VolumesService>(VolumesService);
    prisma = module.get(PrismaService);
    authService = module.get(AuthorizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all volumes for a project', async () => {
      prisma.volume.findMany.mockResolvedValue([mockVolume]);

      const result = await service.findAll('user-123', 'project-123');

      expect(result).toHaveLength(1);
      expect(authService.checkWorkspaceAccessViaProject).toHaveBeenCalledWith(
        'user-123',
        'project-123',
        expect.any(Array),
      );
    });
  });

  describe('findOne', () => {
    it('should return a volume by id', async () => {
      prisma.volume.findUnique.mockResolvedValue(mockVolume);

      const result = await service.findOne('user-123', 'project-123', 'volume-123');

      expect(result).toEqual(mockVolume);
    });

    it('should throw NotFoundException if volume not found', async () => {
      prisma.volume.findUnique.mockResolvedValue(null);

      await expect(service.findOne('user-123', 'project-123', 'volume-999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if volume belongs to different project', async () => {
      prisma.volume.findUnique.mockResolvedValue({ ...mockVolume, projectId: 'other-project' });

      await expect(service.findOne('user-123', 'project-123', 'volume-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new volume', async () => {
      prisma.volume.findUnique.mockResolvedValue(null);
      prisma.volume.create.mockResolvedValue(mockVolume);

      const result = await service.create('user-123', 'project-123', {
        name: 'test-volume',
        size: VolumeSize.LARGE,
      });

      expect(result).toEqual(mockVolume);
      expect(prisma.volume.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if name already exists', async () => {
      prisma.volume.findUnique.mockResolvedValue(mockVolume);

      await expect(
        service.create('user-123', 'project-123', {
          name: 'test-volume',
          size: VolumeSize.LARGE,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a volume name', async () => {
      const updatedVolume = { ...mockVolume, name: 'updated-volume' };
      prisma.volume.findUnique.mockResolvedValueOnce(mockVolume);
      prisma.volume.findUnique.mockResolvedValueOnce(null); // No conflict
      prisma.volume.update.mockResolvedValue(updatedVolume);

      const result = await service.update('user-123', 'project-123', 'volume-123', {
        name: 'updated-volume',
      });

      expect(result.name).toBe('updated-volume');
    });

    it('should throw BadRequestException when trying to decrease size', async () => {
      const largeVolume = { ...mockVolume, size: '50Gi' };
      prisma.volume.findUnique.mockResolvedValue(largeVolume);

      await expect(
        service.update('user-123', 'project-123', 'volume-123', {
          size: VolumeSize.SMALL,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a volume', async () => {
      prisma.volume.findUnique.mockResolvedValue(mockVolume);
      prisma.volume.delete.mockResolvedValue(mockVolume);

      await service.remove('user-123', 'project-123', 'volume-123');

      expect(prisma.volume.delete).toHaveBeenCalledWith({ where: { id: 'volume-123' } });
    });

    it('should throw BadRequestException if volume is attached', async () => {
      prisma.volume.findUnique.mockResolvedValue({ ...mockVolume, serviceId: 'service-123' });

      await expect(service.remove('user-123', 'project-123', 'volume-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('attach', () => {
    it('should attach a volume to a service', async () => {
      const attachedVolume = { ...mockVolume, serviceId: 'service-123', status: 'BOUND' };
      prisma.volume.findUnique.mockResolvedValue(mockVolume);
      prisma.service.findUnique.mockResolvedValue({ id: 'service-123', projectId: 'project-123' });
      prisma.volume.findFirst.mockResolvedValue(null); // No existing mount
      prisma.volume.update.mockResolvedValue(attachedVolume);

      const result = await service.attach('user-123', 'project-123', 'volume-123', {
        serviceId: 'service-123',
        mountPath: '/data',
      });

      expect(result.serviceId).toBe('service-123');
      expect(result.status).toBe('BOUND');
    });

    it('should throw ConflictException if volume already attached', async () => {
      prisma.volume.findUnique.mockResolvedValue({ ...mockVolume, serviceId: 'other-service' });

      await expect(
        service.attach('user-123', 'project-123', 'volume-123', {
          serviceId: 'service-123',
          mountPath: '/data',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if mount path already in use', async () => {
      prisma.volume.findUnique.mockResolvedValue(mockVolume);
      prisma.service.findUnique.mockResolvedValue({ id: 'service-123', projectId: 'project-123' });
      prisma.volume.findFirst.mockResolvedValue({ id: 'other-volume', mountPath: '/data' });

      await expect(
        service.attach('user-123', 'project-123', 'volume-123', {
          serviceId: 'service-123',
          mountPath: '/data',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('detach', () => {
    it('should detach a volume from a service', async () => {
      const attachedVolume = { ...mockVolume, serviceId: 'service-123', status: 'BOUND' };
      const detachedVolume = { ...mockVolume, status: 'RELEASED' };
      prisma.volume.findUnique.mockResolvedValue(attachedVolume);
      prisma.volume.update.mockResolvedValue(detachedVolume);

      const result = await service.detach('user-123', 'project-123', 'volume-123');

      expect(result.status).toBe('RELEASED');
    });

    it('should throw BadRequestException if volume is not attached', async () => {
      prisma.volume.findUnique.mockResolvedValue(mockVolume);

      await expect(service.detach('user-123', 'project-123', 'volume-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
