import { Test, TestingModule } from '@nestjs/testing';
import { SearchService, SearchResults } from '../search.service';
import { PrismaService } from '../../../database/prisma.service';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: jest.Mocked<PrismaService>;

  const mockWorkspace = { id: 'workspace-123', name: 'Test Workspace' };
  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    slug: 'test-project',
    description: 'A test project',
    workspace: mockWorkspace,
  };
  const mockService = {
    id: 'service-123',
    name: 'Test Service',
    subdomain: 'test-service',
    serviceType: 'GITHUB',
    repositoryUrl: 'https://github.com/test/repo',
    projectId: 'project-123',
    project: { name: 'Test Project' },
  };

  beforeEach(async () => {
    const mockPrisma = {
      workspaceMember: {
        findMany: jest.fn(),
      },
      project: {
        findMany: jest.fn(),
      },
      service: {
        findMany: jest.fn(),
      },
      deployment: {
        findMany: jest.fn(),
      },
      environment: {
        findMany: jest.fn(),
      },
      environmentVariable: {
        findMany: jest.fn(),
      },
      webhook: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    prisma = module.get(PrismaService);
  });

  describe('search', () => {
    it('should return empty results for short queries', async () => {
      const result = await service.search('user-123', 'a');

      expect(result.total).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('should return empty results when user has no workspaces', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.search('user-123', 'test');

      expect(result.total).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('should search projects', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
        { workspaceId: 'workspace-123' },
      ]);
      (prisma.project.findMany as jest.Mock).mockResolvedValue([mockProject]);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.environmentVariable.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.search('user-123', 'test', ['project']);

      expect(result.results.length).toBeGreaterThanOrEqual(1);
      expect(result.results[0].type).toBe('project');
      expect(result.results[0].title).toBe('Test Project');
    });

    it('should search services', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
        { workspaceId: 'workspace-123' },
      ]);
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([mockService]);
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.environmentVariable.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.search('user-123', 'test', ['service']);

      expect(result.results.length).toBeGreaterThanOrEqual(1);
      expect(result.results[0].type).toBe('service');
      expect(result.results[0].title).toBe('Test Service');
    });

    it('should search all types when no filter provided', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
        { workspaceId: 'workspace-123' },
      ]);
      (prisma.project.findMany as jest.Mock).mockResolvedValue([mockProject]);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([mockService]);
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.environment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.environmentVariable.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.search('user-123', 'test');

      expect(result.results.length).toBeGreaterThanOrEqual(2);
    });
  });
});
