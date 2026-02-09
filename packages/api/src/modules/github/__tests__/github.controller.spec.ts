import { Test, TestingModule } from '@nestjs/testing';
import { GitHubController } from '../github.controller';
import { GitHubService } from '../github.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('GitHubController', () => {
  let controller: GitHubController;
  let service: GitHubService;

  const mockInstallation = {
    id: 'install-db-123',
    userId: 'user-123',
    installationId: 12345,
    accountLogin: 'test-org',
    accountType: 'Organization',
    accountAvatarUrl: 'https://github.com/test-org.png',
    permissions: { contents: 'read' },
    createdAt: new Date(),
    updatedAt: new Date(),
    uninstalledAt: null,
  };

  const mockGitHubService = {
    getInstallUrl: jest.fn(),
    handleInstallationCallback: jest.fn(),
    getUserInstallations: jest.fn(),
    removeInstallation: jest.fn(),
    listRepos: jest.fn(),
    listBranches: jest.fn(),
  };

  const mockRequest = {
    user: { id: 'user-123', email: 'test@example.com' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GitHubController],
      providers: [
        { provide: GitHubService, useValue: mockGitHubService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GitHubController>(GitHubController);
    service = module.get(GitHubService);
  });

  describe('getInstallUrl', () => {
    it('should return installation URL', () => {
      mockGitHubService.getInstallUrl.mockReturnValue('https://github.com/apps/kubidu/installations/new?state=xyz');

      const result = controller.getInstallUrl(mockRequest as any);

      expect(result).toEqual({
        url: 'https://github.com/apps/kubidu/installations/new?state=xyz',
      });
      expect(mockGitHubService.getInstallUrl).toHaveBeenCalledWith('user-123');
    });
  });

  describe('handleCallback', () => {
    it('should handle installation callback', async () => {
      mockGitHubService.handleInstallationCallback.mockResolvedValue(mockInstallation);

      const result = await controller.handleCallback(
        mockRequest as any,
        '12345',
        'install',
      );

      expect(result).toEqual({ installation: mockInstallation });
      expect(mockGitHubService.handleInstallationCallback).toHaveBeenCalledWith(
        'user-123',
        12345,
        'install',
      );
    });

    it('should default to install action when not specified', async () => {
      mockGitHubService.handleInstallationCallback.mockResolvedValue(mockInstallation);

      await controller.handleCallback(
        mockRequest as any,
        '12345',
        undefined as any,
      );

      expect(mockGitHubService.handleInstallationCallback).toHaveBeenCalledWith(
        'user-123',
        12345,
        'install',
      );
    });
  });

  describe('getInstallations', () => {
    it('should return user installations', async () => {
      mockGitHubService.getUserInstallations.mockResolvedValue([mockInstallation]);

      const result = await controller.getInstallations(mockRequest as any);

      expect(result).toEqual({ installations: [mockInstallation] });
      expect(mockGitHubService.getUserInstallations).toHaveBeenCalledWith('user-123');
    });
  });

  describe('removeInstallation', () => {
    it('should remove installation', async () => {
      mockGitHubService.removeInstallation.mockResolvedValue(undefined);

      const result = await controller.removeInstallation(mockRequest as any, 'install-db-123');

      expect(result).toEqual({ success: true });
      expect(mockGitHubService.removeInstallation).toHaveBeenCalledWith(
        'user-123',
        'install-db-123',
      );
    });
  });

  describe('listRepos', () => {
    it('should list repositories with pagination and search', async () => {
      const mockRepos = {
        repos: [{ id: 1, name: 'my-repo', fullName: 'org/my-repo' }],
        totalCount: 1,
      };
      mockGitHubService.listRepos.mockResolvedValue(mockRepos);

      const result = await controller.listRepos(
        mockRequest as any,
        'install-db-123',
        '2',
        'my',
      );

      expect(result).toEqual(mockRepos);
      expect(mockGitHubService.listRepos).toHaveBeenCalledWith(
        'user-123',
        'install-db-123',
        2,
        'my',
      );
    });

    it('should use default page when not specified', async () => {
      mockGitHubService.listRepos.mockResolvedValue({ repos: [], totalCount: 0 });

      await controller.listRepos(mockRequest as any, 'install-db-123');

      expect(mockGitHubService.listRepos).toHaveBeenCalledWith(
        'user-123',
        'install-db-123',
        1,
        undefined,
      );
    });
  });

  describe('listBranches', () => {
    it('should list branches', async () => {
      const mockBranches = [
        { name: 'main', isDefault: true, commitSha: 'abc123' },
      ];
      mockGitHubService.listBranches.mockResolvedValue(mockBranches);

      const result = await controller.listBranches(
        mockRequest as any,
        'install-db-123',
        'owner',
        'repo',
      );

      expect(result).toEqual({ branches: mockBranches });
      expect(mockGitHubService.listBranches).toHaveBeenCalledWith(
        'user-123',
        'install-db-123',
        'owner',
        'repo',
      );
    });
  });
});
