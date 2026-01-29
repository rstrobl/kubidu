import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GitHubService } from './github.service';

@Controller('github')
@UseGuards(JwtAuthGuard)
export class GitHubController {
  constructor(private readonly githubService: GitHubService) {}

  @Get('install-url')
  getInstallUrl(@Req() req: any) {
    const url = this.githubService.getInstallUrl(req.user.id);
    return { url };
  }

  @Get('callback')
  async handleCallback(
    @Req() req: any,
    @Query('installation_id') installationId: string,
    @Query('setup_action') setupAction: string,
  ) {
    const installation = await this.githubService.handleInstallationCallback(
      req.user.id,
      parseInt(installationId, 10),
      setupAction || 'install',
    );
    return { installation };
  }

  @Get('installations')
  async getInstallations(@Req() req: any) {
    const installations = await this.githubService.getUserInstallations(
      req.user.id,
    );
    return { installations };
  }

  @Delete('installations/:id')
  async removeInstallation(@Req() req: any, @Param('id') id: string) {
    await this.githubService.removeInstallation(req.user.id, id);
    return { success: true };
  }

  @Get('installations/:id/repos')
  async listRepos(
    @Req() req: any,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.githubService.listRepos(
      req.user.id,
      id,
      page ? parseInt(page, 10) : 1,
      search,
    );
    return result;
  }

  @Get('installations/:id/repos/:owner/:repo/branches')
  async listBranches(
    @Req() req: any,
    @Param('id') id: string,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
  ) {
    const branches = await this.githubService.listBranches(
      req.user.id,
      id,
      owner,
      repo,
    );
    return { branches };
  }
}
