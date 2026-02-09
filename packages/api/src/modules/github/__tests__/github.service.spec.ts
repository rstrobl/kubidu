import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GitHubService } from '../github.service';
import { GitHubAppService } from '../github-app.service';
import { PrismaService } from '../../../database/prisma.service';

describe('GitHubService', () => {
  let service: GitHubService;
  let prisma: PrismaService;
  let gitHubApp: GitHubAppService;
  let configService: ConfigService;

  const mockInstallation = {
    id: 'install-db-123',
    userId: 'user-123',
    installationId: 12345,
    accountLogin: 'test-org',
    accountType: 'Organization',
    accountAvatarUrl: 'https://github.com/test-org.png',
    permissions: { contents: 'read', metadata: 'read' },
    createdAt: new Date(),
    updatedAt: new Date(),
    uninstalledAt: null,
  };

  const mockPrisma = {
    gitHubInstallation: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockGitHubApp = {
    getInstallationDetails: jest.fn(),
    listInstallationRepos: jest.fn(),
    listBranches: jest.fn(),
    getRepoDetails: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        'github.appName': 'kubidu-github-app',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GitHubAppService, useValue: mockGitHubApp },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GitHubService>(GitHubService);
    prisma = module.get(PrismaService);
    gitHubApp = module.get(GitHubAppService);
    configService = module.get(ConfigService);
  });

  describe('getInstallUrl', () => {
    it('should return installation URL with encoded state', () => {
      const url = service.getInstallUrl('user-123');

      expect(url).toContain('https://github.com/apps/kubidu-github-app/installations/new');
      expect(url).toContain('state=');

      // Verify state decodes correctly
      const stateParam = new URL(url).searchParams.get('state');
      const decodedState = JSON.parse(Buffer.from(stateParam!, 'base64url').toString());
      expect(decodedState).toEqual({ userId: 'user-123' });
    });
  });

  describe('handleInstallationCallback', () => {
    it('should create new installation on install action', async () => {
      mockGitHubApp.getInstallationDetails.mockResolvedValue({
        account: {
          login: 'test-org',
          type: 'Organization',
          avatar_url: 'https://github.com/test-org.png',
        },
        permissions: { contents: 'read', metadata: 'read' },
      });
      mockPrisma.gitHubInstallation.upsert.mockResolvedValue(mockInstallation);

      const result = await service.handleInstallationCallback('user-123', 12345, 'install');

      expect(mockGitHubApp.getInstallationDetails).toHaveBeenCalledWith(12345);
      expect(mockPrisma.gitHubInstallation.upsert).toHaveBeenCalledWith({
        where: { installationId: 12345 },
        create: expect.objectContaining({
          userId: 'user-123',
          installationId: 12345,
          accountLogin: 'test-org',
        }),
        update: expect.objectContaining({
          accountLogin: 'test-org',
          uninstalledAt: null,
        }),
      });
      expect(result).toEqual(mockInstallation);
    });

    it('should update installation on update action', async () => {
      mockGitHubApp.getInstallationDetails.mockResolvedValue({
        account: {
          login: 'test-org-updated',
          type: 'Organization',
          avatar_url: 'https://github.com/test-org.png',
        },
        permissions: { contents: 'write', metadata: 'read' },
      });
      mockPrisma.gitHubInstallation.upsert.mockResolvedValue({
        ...mockInstallation,
        accountLogin: 'test-org-updated',
      });

      const result = await service.handleInstallationCallback('user-123', 12345, 'update');

      expect(result.accountLogin).toBe('test-org-updated');
    });

    it('should return null for unknown action', async () => {
      const result = await service.handleInstallationCallback('user-123', 12345, 'uninstall');

      expect(result).toBeNull();
      expect(mockGitHubApp.getInstallationDetails).not.toHaveBeenCalled();
    });
  });

  describe('getUserInstallations', () => {
    it('should return user installations excluding uninstalled', async () => {
      mockPrisma.gitHubInstallation.findMany.mockResolvedValue([mockInstallation]);

      const result = await service.getUserInstallations('user-123');

      expect(result).toEqual([mockInstallation]);
      expect(mockPrisma.gitHubInstallation.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          uninstalledAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('removeInstallation', () => {
    it('should mark installation as uninstalled', async () => {
      mockPrisma.gitHubInstallation.findUnique.mockResolvedValue(mockInstallation);
      mockPrisma.gitHubInstallation.update.mockResolvedValue({
        ...mockInstallation,
        uninstalledAt: new Date(),
      });

      await service.removeInstallation('user-123', 'install-db-123');

      expect(mockPrisma.gitHubInstallation.update).toHaveBeenCalledWith({
        where: { id: 'install-db-123' },
        data: { uninstalledAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when installation not found', async () => {
      mockPrisma.gitHubInstallation.findUnique.mockResolvedValue(null);

      await expect(
        service.removeInstallation('user-123', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own installation', async () => {
      mockPrisma.gitHubInstallation.findUnique.mockResolvedValue({
        ...mockInstallation,
        userId: 'other-user',
      });

      await expect(
        service.removeInstallation('user-123', 'install-db-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listRepos', () => {
    it('should return repos from installation', async () => {
      mockPrisma.gitHubInstallation.findUnique.mockResolvedValue(mockInstallation);
      mockGitHubApp.listInstallationRepos.mockResolvedValue({
        repositories: [
          {
            id: 123,
            name: 'my-repo',
            full_name: 'test-org/my-repo',
            private: false,
            description: 'A test repo',
            language: 'TypeScript',
            default_branch: 'main',
            updated_at: '2024-01-01T00:00:00Z',
            html_url: 'https://github.com/test-org/my-repo',
          },
        ],
        totalCount: 1,
      });

      const result = await service.listRepos('user-123', 'install-db-123');

      expect(result.repos).toHaveLength(1);
      expect(result.repos[0]).toEqual({
        id: 123,
        name: 'my-repo',
        fullName: 'test-org/my-repo',
        private: false,
        description: 'A test repo',
        language: 'TypeScript',
        defaultBranch: 'main',
        updatedAt: '2024-01-01T00:00:00Z',
        htmlUrl: 'https://github.com/test-org/my-repo',
      });
    });

    it('should filter repos by search term', async () => {
      mockPrisma.gitHubInstallation.findUnique.mockResolvedValue(mockInstallation);
      mockGitHubApp.listInstallationRepos.mockResolvedValue({
        repositories: [
          { id: 1, name: 'api-service', full_name: 'test-org/api-service', private: false, description: '', language: 'TypeScript', default_branch: 'main', updated_at: '', html_url: '' },
          { id: 2, name: 'web-app', full_name: 'test-org/web-app', private: false, description: '', language: 'TypeScript', default_branch: 'main', updated_at: '', html_url: '' },
        ],
        totalCount: 2,
      });

      const result = await service.listRepos('user-123', 'install-db-123', 1, 'api');

      expect(result.repos).toHaveLength(1);
      expect(result.repos[0].name).toBe('api-service');
    });

    it('should search by fullName as well', async () => {
      mockPrisma.gitHubInstallation.findUnique.mockResolvedValue(mockInstallation);
      mockGitHubApp.listInstallationRepos.mockResolvedValue({
        repositories: [
          { id: 1, name: 'service', full_name: 'test-org/service', private: false, description: '', language: 'TypeScript', default_branch: 'main', updated_at: '', html_url: '' },
        ],
        totalCount: 1,
      });

      const result = await service.listRepos('user-123', 'install-db-123', 1, 'test-org');

      expect(result.repos).toHaveLength(1);
    });

    it('should throw NotFoundException when installation not found', async () => {
      mockPrisma.gitHubInstallation.findUnique.mockResolvedValue(null);

      await expect(
        service.listRepos('user-123', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own installation', async () => {
      mockPrisma.gitHubInstallation.findUnique.mockResolvedValue({
        ...mockInstallation,
        userId: 'other-user',
      });

      await expect(
        service.listRepos('user-123', 'install-db-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when installation was uninstalled', async () => {
      mockPrisma.gitHubInstallation.findUnique.mockResolvedValue({
        ...mockInstallation,
        uninstalledAt: new Date(),
      });

      await expect(
        service.listRepos('user-123', 'install-db-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listBranches', () => {
    it('should return branches with default branch marked', async () => {
      mockPrisma.gitHubInstallation.findUnique.mockResolvedValue(mockInstallation);
      mockGitHubApp.listBranches.mockResolvedValue([
        { name: 'main', commit: { sha: 'abc123' } },
        { name: 'develop', commit: { sha: 'def456' } },
      ]);
      mockGitHubApp.getRepoDetails.mockResolvedValue({
        default_branch: 'main',
      });

      const result = await service.listBranches('user-123', 'install-db-123', 'test-org', 'my-repo');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'main',
        isDefault: true,
        commitSha: 'abc123',
      });
      expect(result[1]).toEqual({
        name: 'develop',
        isDefault: false,
        commitSha: 'def456',
      });
    });

    it('should verify installation ownership', async () => {
      mockPrisma.gitHubInstallation.findUnique.mockResolvedValue(null);

      await expect(
        service.listBranches('user-123', 'non-existent', 'owner', 'repo'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
