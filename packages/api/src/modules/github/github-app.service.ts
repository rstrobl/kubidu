import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';

const GITHUB_API = 'https://api.github.com';

@Injectable()
export class GitHubAppService {
  private readonly logger = new Logger(GitHubAppService.name);
  private readonly appId: string;
  private readonly privateKey: string;

  constructor(private readonly configService: ConfigService) {
    this.appId = this.configService.get<string>('github.appId');
    this.privateKey = this.configService.get<string>('github.privateKey');
  }

  isConfigured(): boolean {
    return !!(this.appId && this.privateKey);
  }

  generateAppJwt(): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60,
      exp: now + 600,
      iss: this.appId,
    };
    return jwt.sign(payload, this.privateKey, { algorithm: 'RS256' });
  }

  async getInstallationToken(installationId: number): Promise<string> {
    const appJwt = this.generateAppJwt();
    const { data } = await axios.post(
      `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
      {},
      {
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: 'application/vnd.github+json',
        },
      },
    );
    return data.token;
  }

  private async getHeaders(installationId: number) {
    const token = await this.getInstallationToken(installationId);
    return {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
    };
  }

  async getInstallationDetails(installationId: number): Promise<{
    account: { login: string; type: string; avatar_url: string };
    permissions: Record<string, string>;
  }> {
    const appJwt = this.generateAppJwt();
    const { data } = await axios.get(
      `${GITHUB_API}/app/installations/${installationId}`,
      {
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: 'application/vnd.github+json',
        },
      },
    );
    return {
      account: {
        login: data.account.login,
        type: data.account.type,
        avatar_url: data.account.avatar_url,
      },
      permissions: data.permissions,
    };
  }

  async listInstallationRepos(
    installationId: number,
    page = 1,
    perPage = 30,
  ): Promise<{ repositories: any[]; totalCount: number }> {
    const headers = await this.getHeaders(installationId);
    const { data } = await axios.get(
      `${GITHUB_API}/installation/repositories`,
      {
        headers,
        params: { per_page: perPage, page },
      },
    );
    return {
      repositories: data.repositories,
      totalCount: data.total_count,
    };
  }

  async listBranches(
    installationId: number,
    owner: string,
    repo: string,
  ): Promise<{ name: string; commit: { sha: string } }[]> {
    const headers = await this.getHeaders(installationId);
    const { data } = await axios.get(
      `${GITHUB_API}/repos/${owner}/${repo}/branches`,
      {
        headers,
        params: { per_page: 100 },
      },
    );
    return data;
  }

  async getRepoDetails(
    installationId: number,
    owner: string,
    repo: string,
  ): Promise<{ default_branch: string }> {
    const headers = await this.getHeaders(installationId);
    const { data } = await axios.get(
      `${GITHUB_API}/repos/${owner}/${repo}`,
      { headers },
    );
    return { default_branch: data.default_branch };
  }

  async getLatestCommit(
    installationId: number,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<{ sha: string; message: string; author: string }> {
    const headers = await this.getHeaders(installationId);
    const { data } = await axios.get(
      `${GITHUB_API}/repos/${owner}/${repo}/commits/${branch}`,
      { headers },
    );
    return {
      sha: data.sha,
      message: data.commit.message,
      author: data.commit.author?.name || data.author?.login || 'Unknown',
    };
  }
}
