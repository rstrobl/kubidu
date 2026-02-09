import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesController, ProjectTemplatesController } from '../templates.controller';
import { TemplatesService } from '../templates.service';

describe('TemplatesController', () => {
  let controller: TemplatesController;
  let templatesService: jest.Mocked<TemplatesService>;

  const mockTemplate = {
    id: 'template-123',
    name: 'WordPress',
    slug: 'wordpress',
    description: 'Self-hosted WordPress blog',
    category: 'CMS',
    icon: 'wordpress',
    isPublic: true,
    isOfficial: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockTemplatesService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findBySlug: jest.fn(),
      findByCategory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [
        { provide: TemplatesService, useValue: mockTemplatesService },
      ],
    }).compile();

    controller = module.get<TemplatesController>(TemplatesController);
    templatesService = module.get(TemplatesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all templates', async () => {
      templatesService.findAll.mockResolvedValue([mockTemplate] as any);

      const result = await controller.findAll();

      expect(result).toHaveLength(1);
      expect(templatesService.findAll).toHaveBeenCalled();
    });

    it('should filter by category', async () => {
      templatesService.findByCategory.mockResolvedValue([mockTemplate] as any);

      const result = await controller.findAll('CMS');

      expect(result).toHaveLength(1);
      expect(templatesService.findByCategory).toHaveBeenCalledWith('CMS');
    });
  });

  describe('findOne', () => {
    it('should return a template by id', async () => {
      templatesService.findOne.mockResolvedValue(mockTemplate as any);

      const result = await controller.findOne('template-123');

      expect(result).toEqual(mockTemplate);
      expect(templatesService.findOne).toHaveBeenCalledWith('template-123');
    });
  });

  describe('findBySlug', () => {
    it('should return a template by slug', async () => {
      templatesService.findBySlug.mockResolvedValue(mockTemplate as any);

      const result = await controller.findBySlug('wordpress');

      expect(result).toEqual(mockTemplate);
      expect(templatesService.findBySlug).toHaveBeenCalledWith('wordpress');
    });
  });
});

describe('ProjectTemplatesController', () => {
  let controller: ProjectTemplatesController;
  let templatesService: jest.Mocked<TemplatesService>;

  const mockDeployment = {
    id: 'deployment-123',
    templateId: 'template-123',
    projectId: 'project-123',
    status: 'COMPLETED',
    statusMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockTemplatesService = {
      deploy: jest.fn(),
      getProjectDeployments: jest.fn(),
      getDeployment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectTemplatesController],
      providers: [
        { provide: TemplatesService, useValue: mockTemplatesService },
      ],
    }).compile();

    controller = module.get<ProjectTemplatesController>(ProjectTemplatesController);
    templatesService = module.get(TemplatesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('deploy', () => {
    it('should deploy a template', async () => {
      const deployDto = {
        templateId: 'template-123',
        inputs: { db_password: 'secret' },
      };
      templatesService.deploy.mockResolvedValue(mockDeployment as any);

      const result = await controller.deploy(
        { user: { id: 'user-123' } },
        'project-123',
        deployDto,
      );

      expect(result).toEqual(mockDeployment);
      expect(templatesService.deploy).toHaveBeenCalledWith('user-123', 'project-123', deployDto);
    });
  });

  describe('getDeployments', () => {
    it('should return all deployments for a project', async () => {
      templatesService.getProjectDeployments.mockResolvedValue([mockDeployment] as any);

      const result = await controller.getDeployments(
        { user: { id: 'user-123' } },
        'project-123',
      );

      expect(result).toHaveLength(1);
      expect(templatesService.getProjectDeployments).toHaveBeenCalledWith('user-123', 'project-123');
    });
  });

  describe('getDeployment', () => {
    it('should return a deployment by id', async () => {
      templatesService.getDeployment.mockResolvedValue(mockDeployment as any);

      const result = await controller.getDeployment(
        { user: { id: 'user-123' } },
        'project-123',
        'deployment-123',
      );

      expect(result).toEqual(mockDeployment);
      expect(templatesService.getDeployment).toHaveBeenCalledWith('user-123', 'project-123', 'deployment-123');
    });
  });
});
