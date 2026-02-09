import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GitHubAppService } from '../github-app.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-jwt-token'),
}));

describe('GitHubAppService', () => {
  let service: GitHubAppService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        'github.appId': '12345',
        'github.privateKey': `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAtest
-----END RSA PRIVATE KEY-----`,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubAppService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GitHubAppService>(GitHubAppService);
    configService = module.get(ConfigService);
  });

  describe('isConfigured', () => {
    it('should return true when appId and privateKey are set', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when appId is missing', async () => {
      const noAppIdConfig = {
        get: jest.fn((key: string) => {
          if (key === 'github.appId') return undefined;
          if (key === 'github.privateKey') return 'key';
          return undefined;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          GitHubAppService,
          { provide: ConfigService, useValue: noAppIdConfig },
        ],
      }).compile();

      const svc = module.get<GitHubAppService>(GitHubAppService);
      expect(svc.isConfigured()).toBe(false);
    });
  });

  describe('generateAppJwt', () => {
    it('should generate a JWT token', () => {
      const jwt = service.generateAppJwt();
      expect(jwt).toBe('mock-jwt-token');
    });
  });

  describe('getInstallationToken', () => {
    it('should get installation token from GitHub API', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { token: 'installation-token-123' },
      });

      const token = await service.getInstallationToken(12345);

      expect(token).toBe('installation-token-123');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.github.com/app/installations/12345/access_tokens',
        {},
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer mock-jwt-token',
            Accept: 'application/vnd.github+json',
          },
        }),
      );
    });
  });

  describe('getInstallationDetails', () => {
    it('should fetch installation details from GitHub API', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          account: {
            login: 'test-org',
            type: 'Organization',
            avatar_url: 'https://avatars.githubusercontent.com/u/12345',
          },
          permissions: { contents: 'read', metadata: 'read' },
        },
      });

      const result = await service.getInstallationDetails(12345);

      expect(result).toEqual({
        account: {
          login: 'test-org',
          type: 'Organization',
          avatar_url: 'https://avatars.githubusercontent.com/u/12345',
        },
        permissions: { contents: 'read', metadata: 'read' },
      });
    });
  });

  describe('listInstallationRepos', () => {
    it('should list repositories for installation', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { token: 'installation-token' },
      });
      mockedAxios.get.mockResolvedValue({
        data: {
          total_count: 2,
          repositories: [
            { id: 1, name: 'repo1' },
            { id: 2, name: 'repo2' },
          ],
        },
      });

      const result = await service.listInstallationRepos(12345, 1, 100);

      expect(result).toEqual({
        repositories: [
          { id: 1, name: 'repo1' },
          { id: 2, name: 'repo2' },
        ],
        totalCount: 2,
      });
    });

    it('should support pagination', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { token: 'installation-token' },
      });
      mockedAxios.get.mockResolvedValue({
        data: { total_count: 0, repositories: [] },
      });

      await service.listInstallationRepos(12345, 2, 50);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.github.com/installation/repositories',
        expect.objectContaining({
          params: { per_page: 50, page: 2 },
        }),
      );
    });
  });

  describe('listBranches', () => {
    it('should list branches for a repository', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { token: 'installation-token' },
      });
      mockedAxios.get.mockResolvedValue({
        data: [
          { name: 'main', commit: { sha: 'abc123' } },
          { name: 'develop', commit: { sha: 'def456' } },
        ],
      });

      const result = await service.listBranches(12345, 'owner', 'repo');

      expect(result).toEqual([
        { name: 'main', commit: { sha: 'abc123' } },
        { name: 'develop', commit: { sha: 'def456' } },
      ]);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/branches',
        expect.any(Object),
      );
    });
  });

  describe('getRepoDetails', () => {
    it('should get repository details', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { token: 'installation-token' },
      });
      mockedAxios.get.mockResolvedValue({
        data: {
          id: 123,
          name: 'my-repo',
          default_branch: 'main',
        },
      });

      const result = await service.getRepoDetails(12345, 'owner', 'repo');

      expect(result).toEqual({ default_branch: 'main' });
    });
  });

  describe('getLatestCommit', () => {
    it('should get latest commit for a branch', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { token: 'installation-token' },
      });
      mockedAxios.get.mockResolvedValue({
        data: {
          sha: 'abc123def456',
          commit: {
            message: 'feat: add new feature',
            author: { name: 'John Doe' },
          },
          author: { login: 'johndoe' },
        },
      });

      const result = await service.getLatestCommit(12345, 'owner', 'repo', 'main');

      expect(result).toEqual({
        sha: 'abc123def456',
        message: 'feat: add new feature',
        author: 'John Doe',
      });
    });

    it('should use author login when commit author name is not available', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { token: 'installation-token' },
      });
      mockedAxios.get.mockResolvedValue({
        data: {
          sha: 'abc123',
          commit: {
            message: 'fix: bug fix',
            author: null,
          },
          author: { login: 'johndoe' },
        },
      });

      const result = await service.getLatestCommit(12345, 'owner', 'repo', 'main');

      expect(result.author).toBe('johndoe');
    });

    it('should return Unknown when no author info is available', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { token: 'installation-token' },
      });
      mockedAxios.get.mockResolvedValue({
        data: {
          sha: 'abc123',
          commit: {
            message: 'fix: bug fix',
            author: null,
          },
          author: null,
        },
      });

      const result = await service.getLatestCommit(12345, 'owner', 'repo', 'main');

      expect(result.author).toBe('Unknown');
    });
  });
});
