import { Test, TestingModule } from '@nestjs/testing';
import { ServicesController } from '../services.controller';
import { ServicesService } from '../services.service';
import { DockerInspectorService } from '../docker-inspector.service';

describe('ServicesController', () => {
  let controller: ServicesController;
  let servicesService: jest.Mocked<ServicesService>;
  let dockerInspector: jest.Mocked<DockerInspectorService>;

  const mockService = {
    id: 'service-123',
    name: 'Test Service',
    subdomain: 'test-service',
    serviceType: 'GITHUB',
    projectId: 'project-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockServicesService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      removeMany: jest.fn(),
    };

    const mockDockerInspector = {
      getExposedPort: jest.fn(),
      getAllExposedPorts: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicesController],
      providers: [
        { provide: ServicesService, useValue: mockServicesService },
        { provide: DockerInspectorService, useValue: mockDockerInspector },
      ],
    }).compile();

    controller = module.get<ServicesController>(ServicesController);
    servicesService = module.get(ServicesService);
    dockerInspector = module.get(DockerInspectorService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all services for a project', async () => {
      servicesService.findAll.mockResolvedValue([mockService] as any);

      const result = await controller.findAll(
        { user: { id: 'user-123' } },
        'project-123',
      );

      expect(result).toHaveLength(1);
      expect(servicesService.findAll).toHaveBeenCalledWith('user-123', 'project-123');
    });
  });

  describe('findOne', () => {
    it('should return a service by id', async () => {
      servicesService.findOne.mockResolvedValue(mockService as any);

      const result = await controller.findOne(
        { user: { id: 'user-123' } },
        'project-123',
        'service-123',
      );

      expect(result).toEqual(mockService);
      expect(servicesService.findOne).toHaveBeenCalledWith('user-123', 'project-123', 'service-123');
    });
  });

  describe('create', () => {
    it('should create a new service', async () => {
      const createDto = { 
        name: 'New Service', 
        serviceType: 'GITHUB',
        repositoryUrl: 'https://github.com/test/repo',
      };
      servicesService.create.mockResolvedValue(mockService as any);

      const result = await controller.create(
        { user: { id: 'user-123' } },
        'project-123',
        createDto as any,
      );

      expect(result).toEqual(mockService);
      expect(servicesService.create).toHaveBeenCalledWith('user-123', 'project-123', createDto);
    });
  });

  describe('update', () => {
    it('should update a service', async () => {
      const updateDto = { name: 'Updated Service' };
      const updatedService = { ...mockService, name: 'Updated Service' };
      servicesService.update.mockResolvedValue(updatedService as any);

      const result = await controller.update(
        { user: { id: 'user-123' } },
        'project-123',
        'service-123',
        updateDto as any,
      );

      expect(result.name).toBe('Updated Service');
      expect(servicesService.update).toHaveBeenCalledWith('user-123', 'project-123', 'service-123', updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a service', async () => {
      servicesService.remove.mockResolvedValue(undefined);

      await controller.remove(
        { user: { id: 'user-123' } },
        'project-123',
        'service-123',
      );

      expect(servicesService.remove).toHaveBeenCalledWith('user-123', 'project-123', 'service-123');
    });
  });

  describe('removeMany', () => {
    it('should delete multiple services', async () => {
      servicesService.removeMany.mockResolvedValue({ deletedCount: 2 } as any);

      const result = await controller.removeMany(
        { user: { id: 'user-123' } },
        'project-123',
        { serviceIds: ['service-1', 'service-2'] },
      );

      expect(result).toEqual({ deletedCount: 2 });
      expect(servicesService.removeMany).toHaveBeenCalledWith('user-123', 'project-123', ['service-1', 'service-2']);
    });
  });

  describe('inspectDockerImage', () => {
    it('should return exposed ports for a Docker image', async () => {
      dockerInspector.getExposedPort.mockResolvedValue(80);
      dockerInspector.getAllExposedPorts.mockResolvedValue([80, 443]);

      const result = await controller.inspectDockerImage('nginx:latest');

      expect(result).toEqual({
        image: 'nginx:latest',
        detectedPort: 80,
        allPorts: [80, 443],
      });
    });

    it('should return error when image is missing', async () => {
      const result = await controller.inspectDockerImage('');

      expect(result).toEqual({ error: 'Image parameter is required' });
    });
  });
});
