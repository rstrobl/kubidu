import { Module } from '@nestjs/common';
import { GitHubAppService } from './github-app.service';
import { GitHubService } from './github.service';
import { GitHubController } from './github.controller';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [GitHubController],
  providers: [GitHubAppService, GitHubService, PrismaService],
  exports: [GitHubAppService],
})
export class GitHubModule {}
