import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';

@Injectable()
export class GitHubAuthService {
  private readonly logger = new Logger(GitHubAuthService.name);
  private readonly appId: string;
  private readonly privateKey: string;

  constructor(private readonly configService: ConfigService) {
    this.appId = this.configService.get<string>('github.appId');
    this.privateKey = this.configService.get<string>('github.privateKey');
  }

  isConfigured(): boolean {
    return !!(this.appId && this.privateKey);
  }

  private generateAppJwt(): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60,
      exp: now + 600,
      iss: this.appId,
    };
    return jwt.sign(payload, this.privateKey, { algorithm: 'RS256' });
  }

  async getAuthenticatedCloneUrl(
    installationId: number,
    repoFullName: string,
  ): Promise<string> {
    const appJwt = this.generateAppJwt();

    const { data } = await axios.post(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {},
      {
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: 'application/vnd.github+json',
        },
      },
    );

    const token = data.token;
    return `https://x-access-token:${token}@github.com/${repoFullName}.git`;
  }
}
