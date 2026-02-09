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

    it('should search deployments', async () => {
      const mockDeployment = {
        id: 'deploy-123',
        name: 'test-deployment',
        status: 'RUNNING',
        gitCommitSha: 'abc123',
        gitCommitMessage: 'Test commit',
        serviceId: 'service-123',
        service: {
          name: 'Test Service',
          projectId: 'project-123',
          project: { name: 'Test Project' },
        },
      };

      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
        { workspaceId: 'workspace-123' },
      ]);
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue([mockDeployment]);
      (prisma.environment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.search('user-123', 'test', ['deployment']);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe('deployment');
      expect(result.results[0].icon).toBe('🟢'); // RUNNING status
    });

    it('should search environments', async () => {
      const mockEnvironment = {
        id: 'env-123',
        name: 'Production',
        slug: 'production',
        type: 'PRODUCTION',
        isProduction: true,
        projectId: 'project-123',
        project: { name: 'Test Project' },
      };

      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
        { workspaceId: 'workspace-123' },
      ]);
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.environment.findMany as jest.Mock).mockResolvedValue([mockEnvironment]);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.search('user-123', 'prod', ['environment']);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe('environment');
      expect(result.results[0].icon).toBe('🚀'); // PRODUCTION type
    });

    it('should search webhooks', async () => {
      const mockWebhook = {
        id: 'webhook-123',
        name: 'Deploy Webhook',
        url: 'https://example.com/webhook',
        type: 'CUSTOM',
        enabled: true,
        projectId: 'project-123',
        project: { name: 'Test Project' },
      };

      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
        { workspaceId: 'workspace-123' },
      ]);
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.environment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([mockWebhook]);

      const result = await service.search('user-123', 'deploy', ['webhook']);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe('webhook');
      expect(result.results[0].icon).toBe('🔔');
    });

    it('should handle Docker image services', async () => {
      const dockerService = {
        ...mockService,
        serviceType: 'DOCKER_IMAGE',
        repositoryUrl: null,
        dockerImage: 'nginx:latest',
      };

      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
        { workspaceId: 'workspace-123' },
      ]);
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([dockerService]);
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.environment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.search('user-123', 'test', ['service']);

      expect(result.results[0].icon).toBe('🐳');
      expect(result.results[0].description).toBe('nginx:latest');
    });

    it('should show correct icons for different deployment statuses', async () => {
      const deployments = [
        { id: 'd1', name: 'test1', status: 'PENDING', service: { name: 'S', projectId: 'p', project: { name: 'P' } } },
        { id: 'd2', name: 'test2', status: 'BUILDING', service: { name: 'S', projectId: 'p', project: { name: 'P' } } },
        { id: 'd3', name: 'test3', status: 'DEPLOYING', service: { name: 'S', projectId: 'p', project: { name: 'P' } } },
        { id: 'd4', name: 'test4', status: 'FAILED', service: { name: 'S', projectId: 'p', project: { name: 'P' } } },
        { id: 'd5', name: 'test5', status: 'STOPPED', service: { name: 'S', projectId: 'p', project: { name: 'P' } } },
        { id: 'd6', name: 'test6', status: 'CRASHED', service: { name: 'S', projectId: 'p', project: { name: 'P' } } },
        { id: 'd7', name: 'test7', status: 'UNKNOWN', service: { name: 'S', projectId: 'p', project: { name: 'P' } } },
      ];

      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
        { workspaceId: 'workspace-123' },
      ]);
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue(deployments);
      (prisma.environment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.search('user-123', 'test', ['deployment']);

      expect(result.results.find(r => r.title === 'test1')?.icon).toBe('🟡');
      expect(result.results.find(r => r.title === 'test2')?.icon).toBe('🔨');
      expect(result.results.find(r => r.title === 'test3')?.icon).toBe('🚀');
      expect(result.results.find(r => r.title === 'test4')?.icon).toBe('🔴');
      expect(result.results.find(r => r.title === 'test5')?.icon).toBe('⏹️');
      expect(result.results.find(r => r.title === 'test6')?.icon).toBe('💥');
      expect(result.results.find(r => r.title === 'test7')?.icon).toBe('❓');
    });

    it('should show correct icons for different environment types', async () => {
      const environments = [
        { id: 'e1', name: 'staging', slug: 'staging', type: 'STAGING', projectId: 'p', project: { name: 'P' } },
        { id: 'e2', name: 'dev', slug: 'dev', type: 'DEVELOPMENT', projectId: 'p', project: { name: 'P' } },
        { id: 'e3', name: 'preview', slug: 'preview', type: 'PREVIEW', projectId: 'p', project: { name: 'P' } },
        { id: 'e4', name: 'custom', slug: 'custom', type: 'OTHER', projectId: 'p', project: { name: 'P' } },
      ];

      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
        { workspaceId: 'workspace-123' },
      ]);
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.environment.findMany as jest.Mock).mockResolvedValue(environments);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.search('user-123', 'test', ['environment']);

      expect(result.results.find(r => r.title === 'staging')?.icon).toBe('🎭');
      expect(result.results.find(r => r.title === 'dev')?.icon).toBe('💻');
      expect(result.results.find(r => r.title === 'preview')?.icon).toBe('👁️');
      expect(result.results.find(r => r.title === 'custom')?.icon).toBe('🌍');
    });

    it('should return categories with counts', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
        { workspaceId: 'workspace-123' },
      ]);
      (prisma.project.findMany as jest.Mock).mockResolvedValue([mockProject]);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([mockService]);
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.environment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.search('user-123', 'test');

      expect(result.categories).toContainEqual({ type: 'project', count: 1 });
      expect(result.categories).toContainEqual({ type: 'service', count: 1 });
    });

    it('should respect limit parameter', async () => {
      const manyProjects = Array.from({ length: 15 }, (_, i) => ({
        ...mockProject,
        id: `project-${i}`,
        name: `Test Project ${i}`,
      }));

      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
        { workspaceId: 'workspace-123' },
      ]);
      (prisma.project.findMany as jest.Mock).mockResolvedValue(manyProjects);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.environment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.search('user-123', 'test', undefined, 5);

      expect(result.results.length).toBe(5);
      expect(result.total).toBe(15);
    });
  });

  describe('getRecentSearches', () => {
    it('should return empty array', async () => {
      const result = await service.getRecentSearches('user-123');
      expect(result).toEqual([]);
    });
  });

  describe('getSuggestions', () => {
    it('should return empty array for short queries', async () => {
      const result = await service.getSuggestions('user-123', 'a');
      expect(result).toEqual([]);
    });

    it('should return suggestions from projects and services', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
        { workspaceId: 'workspace-123' },
      ]);
      (prisma.project.findMany as jest.Mock).mockResolvedValue([
        { name: 'Test API' },
        { name: 'Test Web' },
      ]);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([
        { name: 'Test Service' },
      ]);

      const result = await service.getSuggestions('user-123', 'test');

      expect(result).toContain('Test API');
      expect(result).toContain('Test Web');
      expect(result).toContain('Test Service');
    });

    it('should deduplicate suggestions', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
        { workspaceId: 'workspace-123' },
      ]);
      (prisma.project.findMany as jest.Mock).mockResolvedValue([
        { name: 'Duplicate' },
      ]);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([
        { name: 'Duplicate' }, // Same name
      ]);

      const result = await service.getSuggestions('user-123', 'dup');

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('Duplicate');
    });

    it('should limit to 8 suggestions', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
        { workspaceId: 'workspace-123' },
      ]);
      (prisma.project.findMany as jest.Mock).mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({ name: `Project ${i}` })),
      );
      (prisma.service.findMany as jest.Mock).mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({ name: `Service ${i}` })),
      );

      const result = await service.getSuggestions('user-123', 'test');

      expect(result.length).toBeLessThanOrEqual(8);
    });
  });
});
