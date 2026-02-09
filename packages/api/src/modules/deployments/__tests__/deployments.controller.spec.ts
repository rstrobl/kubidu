import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DeploymentsController } from '../deployments.controller';
import { DeploymentsService } from '../deployments.service';

describe('DeploymentsController', () => {
  let controller: DeploymentsController;
  let deploymentsService: jest.Mocked<DeploymentsService>;

  const mockDeployment = {
    id: 'deployment-123',
    serviceId: 'service-123',
    status: 'COMPLETED',
    version: 'v1.0.0',
    gitCommitSha: 'abc123',
    gitBranch: 'main',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockDeploymentsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      stop: jest.fn(),
      restart: jest.fn(),
      retry: jest.fn(),
      getLogs: jest.fn(),
      getBuildLogs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeploymentsController],
      providers: [
        { provide: DeploymentsService, useValue: mockDeploymentsService },
      ],
    }).compile();

    controller = module.get<DeploymentsController>(DeploymentsController);
    deploymentsService = module.get(DeploymentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all deployments for a service', async () => {
      deploymentsService.findAll.mockResolvedValue([mockDeployment] as any);

      const result = await controller.findAll(
        { user: { id: 'user-123' } },
        undefined,
        'service-123',
      );

      expect(result).toHaveLength(1);
      expect(deploymentsService.findAll).toHaveBeenCalledWith('user-123', 'service-123', undefined);
    });

    it('should throw BadRequestException when neither workspaceId nor serviceId provided', async () => {
      await expect(
        controller.findAll({ user: { id: 'user-123' } }, undefined, undefined),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a deployment by id', async () => {
      deploymentsService.findOne.mockResolvedValue(mockDeployment as any);

      const result = await controller.findOne(
        { user: { id: 'user-123' } },
        'deployment-123',
      );

      expect(result).toEqual(mockDeployment);
      expect(deploymentsService.findOne).toHaveBeenCalledWith('user-123', 'deployment-123');
    });
  });

  describe('create', () => {
    it('should create a new deployment', async () => {
      const createDto = { 
        serviceId: 'service-123',
        gitBranch: 'main',
        gitCommitSha: 'abc123',
      };
      deploymentsService.create.mockResolvedValue(mockDeployment as any);

      const result = await controller.create(
        { user: { id: 'user-123' } },
        createDto as any,
      );

      expect(result).toEqual(mockDeployment);
      expect(deploymentsService.create).toHaveBeenCalledWith('user-123', createDto);
    });
  });

  describe('update', () => {
    it('should update a deployment', async () => {
      const updateDto = { status: 'STOPPED' };
      deploymentsService.update.mockResolvedValue({ ...mockDeployment, status: 'STOPPED' } as any);

      const result = await controller.update(
        { user: { id: 'user-123' } },
        'deployment-123',
        updateDto as any,
      );

      expect(result.status).toBe('STOPPED');
      expect(deploymentsService.update).toHaveBeenCalledWith('user-123', 'deployment-123', updateDto);
    });
  });

  describe('stop', () => {
    it('should stop a deployment', async () => {
      deploymentsService.stop.mockResolvedValue(undefined);

      const result = await controller.stop(
        { user: { id: 'user-123' } },
        'deployment-123',
      );

      expect(result.message).toBe('Deployment stopped successfully');
      expect(deploymentsService.stop).toHaveBeenCalledWith('user-123', 'deployment-123');
    });
  });

  describe('restart', () => {
    it('should restart a deployment', async () => {
      deploymentsService.restart.mockResolvedValue(undefined);

      const result = await controller.restart(
        { user: { id: 'user-123' } },
        'deployment-123',
      );

      expect(result.message).toBe('Deployment restarted successfully');
      expect(deploymentsService.restart).toHaveBeenCalledWith('user-123', 'deployment-123');
    });
  });

  describe('retry', () => {
    it('should retry a failed deployment', async () => {
      deploymentsService.retry.mockResolvedValue(undefined);

      const result = await controller.retry(
        { user: { id: 'user-123' } },
        'deployment-123',
      );

      expect(result.message).toBe('Deployment retry initiated successfully');
      expect(deploymentsService.retry).toHaveBeenCalledWith('user-123', 'deployment-123');
    });
  });

  describe('getLogs', () => {
    it('should return deployment logs', async () => {
      const logs = ['Log line 1', 'Log line 2'];
      deploymentsService.getLogs.mockResolvedValue(logs as any);

      const result = await controller.getLogs(
        { user: { id: 'user-123' } },
        'deployment-123',
        undefined,
      );

      expect(result.logs).toEqual(logs);
      expect(deploymentsService.getLogs).toHaveBeenCalledWith('user-123', 'deployment-123', undefined);
    });
  });

  describe('getBuildLogs', () => {
    it('should return build logs', async () => {
      const logs = ['Build started', 'Build completed'];
      deploymentsService.getBuildLogs.mockResolvedValue(logs as any);

      const result = await controller.getBuildLogs(
        { user: { id: 'user-123' } },
        'deployment-123',
        undefined,
      );

      expect(result.logs).toEqual(logs);
      expect(deploymentsService.getBuildLogs).toHaveBeenCalledWith('user-123', 'deployment-123', undefined);
    });
  });
});
