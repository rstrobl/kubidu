import { Test, TestingModule } from '@nestjs/testing';
import { VolumesController } from '../volumes.controller';
import { VolumesService } from '../volumes.service';
import { VolumeSize } from '../dto/create-volume.dto';

describe('VolumesController', () => {
  let controller: VolumesController;
  let volumesService: jest.Mocked<VolumesService>;

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
  };

  const mockAttachedVolume = {
    ...mockVolume,
    serviceId: 'service-123',
    status: 'BOUND',
    boundAt: new Date(),
    service: { id: 'service-123', name: 'my-service' },
  };

  beforeEach(async () => {
    const mockVolumesService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      attach: jest.fn(),
      detach: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VolumesController],
      providers: [
        { provide: VolumesService, useValue: mockVolumesService },
      ],
    }).compile();

    controller = module.get<VolumesController>(VolumesController);
    volumesService = module.get(VolumesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all volumes for a project', async () => {
      volumesService.findAll.mockResolvedValue([mockVolume] as any);

      const result = await controller.findAll(
        { user: { id: 'user-123' } },
        'project-123',
      );

      expect(result).toHaveLength(1);
      expect(volumesService.findAll).toHaveBeenCalledWith('user-123', 'project-123');
    });
  });

  describe('findOne', () => {
    it('should return a volume by id', async () => {
      volumesService.findOne.mockResolvedValue(mockVolume as any);

      const result = await controller.findOne(
        { user: { id: 'user-123' } },
        'project-123',
        'volume-123',
      );

      expect(result).toEqual(mockVolume);
      expect(volumesService.findOne).toHaveBeenCalledWith('user-123', 'project-123', 'volume-123');
    });
  });

  describe('create', () => {
    it('should create a new volume', async () => {
      volumesService.create.mockResolvedValue(mockVolume as any);

      const createDto = {
        name: 'test-volume',
        size: VolumeSize.LARGE,
        mountPath: '/data',
      };

      const result = await controller.create(
        { user: { id: 'user-123' } },
        'project-123',
        createDto,
      );

      expect(result).toEqual(mockVolume);
      expect(volumesService.create).toHaveBeenCalledWith('user-123', 'project-123', createDto);
    });
  });

  describe('update', () => {
    it('should update a volume', async () => {
      const updatedVolume = { ...mockVolume, name: 'updated-volume' };
      volumesService.update.mockResolvedValue(updatedVolume as any);

      const updateDto = { name: 'updated-volume' };

      const result = await controller.update(
        { user: { id: 'user-123' } },
        'project-123',
        'volume-123',
        updateDto,
      );

      expect(result.name).toBe('updated-volume');
      expect(volumesService.update).toHaveBeenCalledWith('user-123', 'project-123', 'volume-123', updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a volume', async () => {
      volumesService.remove.mockResolvedValue(undefined);

      await controller.remove(
        { user: { id: 'user-123' } },
        'project-123',
        'volume-123',
      );

      expect(volumesService.remove).toHaveBeenCalledWith('user-123', 'project-123', 'volume-123');
    });
  });

  describe('attach', () => {
    it('should attach a volume to a service', async () => {
      volumesService.attach.mockResolvedValue(mockAttachedVolume as any);

      const attachDto = {
        serviceId: 'service-123',
        mountPath: '/data',
      };

      const result = await controller.attach(
        { user: { id: 'user-123' } },
        'project-123',
        'volume-123',
        attachDto,
      );

      expect(result.serviceId).toBe('service-123');
      expect(result.status).toBe('BOUND');
      expect(volumesService.attach).toHaveBeenCalledWith('user-123', 'project-123', 'volume-123', attachDto);
    });
  });

  describe('detach', () => {
    it('should detach a volume from a service', async () => {
      const detachedVolume = { ...mockVolume, status: 'RELEASED' };
      volumesService.detach.mockResolvedValue(detachedVolume as any);

      const result = await controller.detach(
        { user: { id: 'user-123' } },
        'project-123',
        'volume-123',
      );

      expect(result.serviceId).toBeNull();
      expect(result.status).toBe('RELEASED');
      expect(volumesService.detach).toHaveBeenCalledWith('user-123', 'project-123', 'volume-123');
    });
  });
});
