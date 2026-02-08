import { Controller, Get, Param, Query } from '@nestjs/common';
import { DeploymentManager } from '../k8s/deployment.manager';

@Controller('logs')
export class LogsController {
  constructor(private readonly deploymentManager: DeploymentManager) {}

  @Get(':namespace/:deploymentId')
  async getPodLogs(
    @Param('namespace') namespace: string,
    @Param('deploymentId') deploymentId: string,
    @Query('tail') tail?: string,
  ) {
    const tailLines = tail ? parseInt(tail, 10) : undefined;
    const logs = await this.deploymentManager.getPodLogs(
      namespace,
      deploymentId,
      tailLines,
    );

    return { logs };
  }

  @Get(':namespace/:deploymentName/status')
  async getPodStatus(
    @Param('namespace') namespace: string,
    @Param('deploymentName') deploymentName: string,
  ) {
    const status = await this.deploymentManager.getPodStatus(
      namespace,
      deploymentName,
    );

    return status;
  }
}
