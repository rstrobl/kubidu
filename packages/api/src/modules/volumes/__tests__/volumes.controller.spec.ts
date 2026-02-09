import { Test, TestingModule } from '@nestjs/testing';
import { VolumesController } from '../volumes.controller';
import { VolumesService } from '../volumes.service';

describe('VolumesController', () => {
  let controller: VolumesController;
  let volumesService: jest.Mocked<VolumesService>;

  const mockVolume = {
    id: 'volume-123',
    name: 'test-volume',
    mountPath: '/data',
    sizeGb: 10,
    serviceId: 'service-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockVolumesService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
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
});
