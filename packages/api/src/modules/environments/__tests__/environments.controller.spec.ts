import { Test, TestingModule } from '@nestjs/testing';
import { EnvironmentsController } from '../environments.controller';
import { EnvironmentsService } from '../environments.service';

describe('EnvironmentsController', () => {
  let controller: EnvironmentsController;
  let environmentsService: jest.Mocked<EnvironmentsService>;

  const mockEnvVar = {
    id: 'env-123',
    key: 'DATABASE_URL',
    value: '***',
    isSecret: true,
    serviceId: 'service-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReference = {
    id: 'ref-123',
    sourceEnvVarId: 'env-source',
    targetServiceId: 'service-123',
    aliasKey: 'DB_URL',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockEnvironmentsService = {
      getVariables: jest.fn(),
      setVariable: jest.fn(),
      deleteVariable: jest.fn(),
      getSharedVariables: jest.fn(),
      createReference: jest.fn(),
      getReferences: jest.fn(),
      deleteReference: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnvironmentsController],
      providers: [
        { provide: EnvironmentsService, useValue: mockEnvironmentsService },
      ],
    }).compile();

    controller = module.get<EnvironmentsController>(EnvironmentsController);
    environmentsService = module.get(EnvironmentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getVariables', () => {
    it('should return all environment variables', async () => {
      environmentsService.getVariables.mockResolvedValue([mockEnvVar] as any);

      const result = await controller.getVariables(
        { user: { id: 'user-123' } },
        'service-123',
        undefined,
        undefined,
      );

      expect(result).toHaveLength(1);
      expect(environmentsService.getVariables).toHaveBeenCalledWith('user-123', 'service-123', undefined, undefined);
    });

    it('should pass decrypt parameter', async () => {
      environmentsService.getVariables.mockResolvedValue([mockEnvVar] as any);

      await controller.getVariables(
        { user: { id: 'user-123' } },
        'service-123',
        undefined,
        true,
      );

      expect(environmentsService.getVariables).toHaveBeenCalledWith('user-123', 'service-123', undefined, true);
    });
  });

  describe('setVariable', () => {
    it('should set an environment variable', async () => {
      const setDto = { key: 'API_KEY', value: 'secret', isSecret: true, serviceId: 'service-123' };
      environmentsService.setVariable.mockResolvedValue(mockEnvVar as any);

      const result = await controller.setVariable(
        { user: { id: 'user-123' } },
        setDto as any,
      );

      expect(result).toEqual(mockEnvVar);
      expect(environmentsService.setVariable).toHaveBeenCalledWith('user-123', setDto);
    });
  });

  describe('deleteVariable', () => {
    it('should delete an environment variable', async () => {
      environmentsService.deleteVariable.mockResolvedValue(undefined);

      await controller.deleteVariable(
        { user: { id: 'user-123' } },
        'env-123',
      );

      expect(environmentsService.deleteVariable).toHaveBeenCalledWith('user-123', 'env-123');
    });
  });

  describe('getSharedVariables', () => {
    it('should return shared variables', async () => {
      environmentsService.getSharedVariables.mockResolvedValue([mockEnvVar] as any);

      const result = await controller.getSharedVariables(
        { user: { id: 'user-123' } },
        'project-123',
        undefined,
      );

      expect(result).toHaveLength(1);
      expect(environmentsService.getSharedVariables).toHaveBeenCalledWith('user-123', 'project-123', undefined);
    });
  });

  describe('createReference', () => {
    it('should create an environment variable reference', async () => {
      const createDto = {
        sourceEnvVarId: 'env-source',
        targetServiceId: 'service-123',
        aliasKey: 'DB_URL',
      };
      environmentsService.createReference.mockResolvedValue(mockReference as any);

      const result = await controller.createReference(
        { user: { id: 'user-123' } },
        createDto as any,
      );

      expect(result).toEqual(mockReference);
      expect(environmentsService.createReference).toHaveBeenCalledWith('user-123', createDto);
    });
  });

  describe('getReferences', () => {
    it('should return references for a service', async () => {
      environmentsService.getReferences.mockResolvedValue([mockReference] as any);

      const result = await controller.getReferences(
        { user: { id: 'user-123' } },
        'service-123',
      );

      expect(result).toHaveLength(1);
      expect(environmentsService.getReferences).toHaveBeenCalledWith('user-123', 'service-123');
    });
  });

  describe('deleteReference', () => {
    it('should delete a reference', async () => {
      environmentsService.deleteReference.mockResolvedValue(undefined);

      await controller.deleteReference(
        { user: { id: 'user-123' } },
        'ref-123',
      );

      expect(environmentsService.deleteReference).toHaveBeenCalledWith('user-123', 'ref-123');
    });
  });
});
