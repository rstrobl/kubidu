import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface ActivityEvent {
  id: string;
  type: 'deployment' | 'service' | 'domain' | 'env_var' | 'project' | 'workspace' | 'member';
  action: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  metadata: Record<string, any>;
  resourceId?: string;
  resourceType?: string;
  projectId?: string;
  projectName?: string;
  serviceId?: string;
  serviceName?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  createdAt: Date;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkspaceActivity(
    workspaceId: string,
    options: {
      limit?: number;
      offset?: number;
      projectId?: string;
      serviceId?: string;
      type?: string;
    } = {},
  ): Promise<{ activities: ActivityEvent[]; total: number }> {
    const { limit = 50, offset = 0, projectId, serviceId, type } = options;

    // Get workspace projects for filtering
    const workspaceProjects = await this.prisma.project.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
    });
    const projectIds = workspaceProjects.map((p) => p.id);
    const projectMap = new Map(workspaceProjects.map((p) => [p.id, p.name]));

    // Get recent deployments
    const deployments = await this.prisma.deployment.findMany({
      where: {
        service: {
          projectId: projectId || { in: projectIds },
          ...(serviceId ? { id: serviceId } : {}),
        },
        ...(type && type !== 'deployment' ? { id: 'none' } : {}),
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            projectId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 2,
    });

    // Get recent audit logs for other events
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { resource: 'service', resourceId: serviceId || undefined },
          { resource: 'project', resourceId: projectId || undefined },
          { resource: 'domain' },
          { resource: 'environment_variable' },
          { resource: 'workspace_member' },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 2,
    });

    // Transform deployments to activity events
    const deploymentEvents: ActivityEvent[] = deployments.map((d) => ({
      id: `deployment-${d.id}`,
      type: 'deployment' as const,
      action: this.getDeploymentAction(d.status),
      title: this.getDeploymentTitle(d.status, d.service.name),
      description: d.gitCommitMessage || `Deployment ${d.name}`,
      icon: this.getDeploymentIcon(d.status),
      color: this.getDeploymentColor(d.status),
      metadata: {
        deploymentId: d.id,
        deploymentName: d.name,
        status: d.status,
        gitCommitSha: d.gitCommitSha,
        gitAuthor: d.gitAuthor,
        imageTag: d.imageTag,
      },
      resourceId: d.id,
      resourceType: 'deployment',
      projectId: d.service.projectId,
      projectName: projectMap.get(d.service.projectId) || '',
      serviceId: d.service.id,
      serviceName: d.service.name,
      createdAt: d.createdAt,
    }));

    // Transform audit logs to activity events
    const auditEvents: ActivityEvent[] = auditLogs
      .filter((log) => !log.action.includes('deployment')) // Avoid duplicates
      .map((log) => ({
        id: `audit-${log.id}`,
        type: this.getAuditType(log.resource) as ActivityEvent['type'],
        action: log.action,
        title: this.formatAuditTitle(log.action, log.resource),
        description: this.formatAuditDescription(log),
        icon: this.getAuditIcon(log.resource, log.action),
        color: this.getAuditColor(log.action),
        metadata: log.metadata as Record<string, any> || {},
        resourceId: log.resourceId || undefined,
        resourceType: log.resource,
        userId: log.userId || undefined,
        userName: log.user?.name || 'System',
        userAvatar: log.user?.avatarUrl || undefined,
        createdAt: log.createdAt,
      }));

    // Combine and sort all events
    const allEvents = [...deploymentEvents, ...auditEvents]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    const total = deploymentEvents.length + auditEvents.length;

    return { activities: allEvents, total };
  }

  async getActivityStats(workspaceId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get workspace projects
    const projects = await this.prisma.project.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    const projectIds = projects.map((p) => p.id);

    // Count deployments by status
    const deployments = await this.prisma.deployment.groupBy({
      by: ['status'],
      where: {
        service: { projectId: { in: projectIds } },
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Count deployments by day
    const dailyDeployments = await this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT 
        DATE(d.created_at) as date,
        COUNT(*) as count
      FROM deployments d
      JOIN services s ON d.service_id = s.id
      WHERE s.project_id = ANY(${projectIds}::uuid[])
        AND d.created_at >= ${startDate}
      GROUP BY DATE(d.created_at)
      ORDER BY date ASC
    `;

    return {
      deploymentsByStatus: Object.fromEntries(
        deployments.map((d) => [d.status, d._count]),
      ),
      dailyDeployments: dailyDeployments.map((d) => ({
        date: d.date,
        count: Number(d.count),
      })),
      totalDeployments: deployments.reduce((sum, d) => sum + d._count, 0),
      successRate: this.calculateSuccessRate(deployments),
    };
  }

  private calculateSuccessRate(
    deployments: Array<{ status: string; _count: number }>,
  ): number {
    const total = deployments.reduce((sum, d) => sum + d._count, 0);
    const successful = deployments
      .filter((d) => d.status === 'RUNNING')
      .reduce((sum, d) => sum + d._count, 0);
    return total > 0 ? Math.round((successful / total) * 100) : 0;
  }

  private getDeploymentAction(status: string): string {
    const actions: Record<string, string> = {
      PENDING: 'queued',
      BUILDING: 'building',
      DEPLOYING: 'deploying',
      RUNNING: 'deployed',
      STOPPED: 'stopped',
      FAILED: 'failed',
      CRASHED: 'crashed',
    };
    return actions[status] || status.toLowerCase();
  }

  private getDeploymentTitle(status: string, serviceName: string): string {
    const templates: Record<string, string> = {
      PENDING: `${serviceName} deployment queued`,
      BUILDING: `Building ${serviceName}`,
      DEPLOYING: `Deploying ${serviceName}`,
      RUNNING: `${serviceName} deployed successfully`,
      STOPPED: `${serviceName} stopped`,
      FAILED: `${serviceName} deployment failed`,
      CRASHED: `${serviceName} crashed`,
    };
    return templates[status] || `${serviceName} ${status.toLowerCase()}`;
  }

  private getDeploymentIcon(status: string): string {
    const icons: Record<string, string> = {
      PENDING: '⏳',
      BUILDING: '🔨',
      DEPLOYING: '🚀',
      RUNNING: '✅',
      STOPPED: '⏹️',
      FAILED: '❌',
      CRASHED: '💥',
    };
    return icons[status] || '📦';
  }

  private getDeploymentColor(status: string): string {
    const colors: Record<string, string> = {
      PENDING: 'yellow',
      BUILDING: 'blue',
      DEPLOYING: 'blue',
      RUNNING: 'green',
      STOPPED: 'gray',
      FAILED: 'red',
      CRASHED: 'red',
    };
    return colors[status] || 'gray';
  }

  private getAuditType(resource: string): string {
    const types: Record<string, string> = {
      service: 'service',
      project: 'project',
      domain: 'domain',
      environment_variable: 'env_var',
      workspace: 'workspace',
      workspace_member: 'member',
    };
    return types[resource] || 'project';
  }

  private formatAuditTitle(action: string, resource: string): string {
    const resourceNames: Record<string, string> = {
      service: 'Service',
      project: 'Project',
      domain: 'Domain',
      environment_variable: 'Environment variable',
      workspace: 'Workspace',
      workspace_member: 'Team member',
    };
    const resourceName = resourceNames[resource] || resource;
    
    if (action.includes('create')) return `${resourceName} created`;
    if (action.includes('update')) return `${resourceName} updated`;
    if (action.includes('delete')) return `${resourceName} deleted`;
    if (action.includes('add')) return `${resourceName} added`;
    if (action.includes('remove')) return `${resourceName} removed`;
    if (action.includes('verify')) return `${resourceName} verified`;
    
    return `${resourceName} ${action}`;
  }

  private formatAuditDescription(log: any): string {
    const metadata = log.metadata as Record<string, any> || {};
    
    if (metadata.name) return metadata.name;
    if (metadata.domain) return metadata.domain;
    if (metadata.key) return `Variable: ${metadata.key}`;
    if (metadata.email) return metadata.email;
    
    return log.action;
  }

  private getAuditIcon(resource: string, action: string): string {
    if (action.includes('delete') || action.includes('remove')) return '🗑️';
    
    const icons: Record<string, string> = {
      service: '⚙️',
      project: '📁',
      domain: '🌐',
      environment_variable: '🔐',
      workspace: '🏢',
      workspace_member: '👤',
    };
    return icons[resource] || '📝';
  }

  private getAuditColor(action: string): string {
    if (action.includes('create') || action.includes('add')) return 'green';
    if (action.includes('delete') || action.includes('remove')) return 'red';
    if (action.includes('update')) return 'blue';
    return 'gray';
  }
}
