import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type SearchResultType = 'project' | 'service' | 'deployment' | 'environment' | 'webhook';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  description?: string;
  url: string;
  icon: string;
  metadata?: Record<string, any>;
}

export interface SearchResults {
  query: string;
  total: number;
  results: SearchResult[];
  categories: {
    type: SearchResultType;
    count: number;
  }[];
}

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(
    userId: string,
    query: string,
    types?: SearchResultType[],
    limit = 20,
  ): Promise<SearchResults> {
    if (!query || query.trim().length < 2) {
      return {
        query,
        total: 0,
        results: [],
        categories: [],
      };
    }

    const searchTerm = `%${query.toLowerCase()}%`;
    const results: SearchResult[] = [];

    // Get user's workspaces for access control
    const userWorkspaces = await this.prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    const workspaceIds = userWorkspaces.map(w => w.workspaceId);

    if (workspaceIds.length === 0) {
      return { query, total: 0, results: [], categories: [] };
    }

    // Search Projects
    if (!types || types.includes('project')) {
      const projects = await this.prisma.project.findMany({
        where: {
          workspaceId: { in: workspaceIds },
          status: 'ACTIVE',
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { slug: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: { workspace: true },
        take: 10,
      });

      for (const project of projects) {
        results.push({
          type: 'project',
          id: project.id,
          title: project.name,
          subtitle: project.workspace.name,
          description: project.description || undefined,
          url: `/projects/${project.id}`,
          icon: '📦',
        });
      }
    }

    // Search Services
    if (!types || types.includes('service')) {
      const services = await this.prisma.service.findMany({
        where: {
          project: {
            workspaceId: { in: workspaceIds },
            status: 'ACTIVE',
          },
          status: 'ACTIVE',
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { subdomain: { contains: query, mode: 'insensitive' } },
            { repositoryUrl: { contains: query, mode: 'insensitive' } },
            { dockerImage: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: { project: true },
        take: 10,
      });

      for (const service of services) {
        results.push({
          type: 'service',
          id: service.id,
          title: service.name,
          subtitle: `Service in ${service.project.name}`,
          description: service.serviceType === 'GITHUB' 
            ? service.repositoryUrl || undefined
            : service.dockerImage || undefined,
          url: `/projects/${service.projectId}?service=${service.id}`,
          icon: service.serviceType === 'GITHUB' ? '🔗' : '🐳',
          metadata: {
            serviceType: service.serviceType,
            projectId: service.projectId,
          },
        });
      }
    }

    // Search Deployments
    if (!types || types.includes('deployment')) {
      const deployments = await this.prisma.deployment.findMany({
        where: {
          service: {
            project: {
              workspaceId: { in: workspaceIds },
              status: 'ACTIVE',
            },
          },
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { gitCommitSha: { contains: query, mode: 'insensitive' } },
            { gitCommitMessage: { contains: query, mode: 'insensitive' } },
            { gitAuthor: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          service: {
            include: { project: true },
          },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      for (const deployment of deployments) {
        const statusEmoji = {
          RUNNING: '🟢',
          PENDING: '🟡',
          BUILDING: '🔨',
          DEPLOYING: '🚀',
          STOPPED: '⏹️',
          FAILED: '🔴',
          CRASHED: '💥',
        }[deployment.status] || '❓';

        results.push({
          type: 'deployment',
          id: deployment.id,
          title: deployment.name,
          subtitle: `${deployment.service.name} • ${deployment.status}`,
          description: deployment.gitCommitMessage || undefined,
          url: `/projects/${deployment.service.projectId}/logs?deployment=${deployment.id}`,
          icon: statusEmoji,
          metadata: {
            status: deployment.status,
            gitCommitSha: deployment.gitCommitSha,
            serviceId: deployment.serviceId,
            projectId: deployment.service.projectId,
          },
        });
      }
    }

    // Search Environments
    if (!types || types.includes('environment')) {
      const environments = await this.prisma.environment.findMany({
        where: {
          project: {
            workspaceId: { in: workspaceIds },
            status: 'ACTIVE',
          },
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { slug: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: { project: true },
        take: 10,
      });

      for (const env of environments) {
        const typeEmoji = {
          PRODUCTION: '🚀',
          STAGING: '🎭',
          DEVELOPMENT: '💻',
          PREVIEW: '👁️',
        }[env.type] || '🌍';

        results.push({
          type: 'environment',
          id: env.id,
          title: env.name,
          subtitle: `Environment in ${env.project.name}`,
          url: `/projects/${env.projectId}?env=${env.slug}`,
          icon: typeEmoji,
          metadata: {
            type: env.type,
            isProduction: env.isProduction,
            projectId: env.projectId,
          },
        });
      }
    }

    // Search Webhooks
    if (!types || types.includes('webhook')) {
      const webhooks = await this.prisma.webhook.findMany({
        where: {
          project: {
            workspaceId: { in: workspaceIds },
            status: 'ACTIVE',
          },
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { url: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: { project: true },
        take: 10,
      });

      for (const webhook of webhooks) {
        results.push({
          type: 'webhook',
          id: webhook.id,
          title: webhook.name,
          subtitle: `Webhook in ${webhook.project.name}`,
          description: webhook.url,
          url: `/projects/${webhook.projectId}?tab=webhooks`,
          icon: '🔔',
          metadata: {
            type: webhook.type,
            enabled: webhook.enabled,
            projectId: webhook.projectId,
          },
        });
      }
    }

    // Calculate categories
    const categories = [
      { type: 'project' as SearchResultType, count: results.filter(r => r.type === 'project').length },
      { type: 'service' as SearchResultType, count: results.filter(r => r.type === 'service').length },
      { type: 'deployment' as SearchResultType, count: results.filter(r => r.type === 'deployment').length },
      { type: 'environment' as SearchResultType, count: results.filter(r => r.type === 'environment').length },
      { type: 'webhook' as SearchResultType, count: results.filter(r => r.type === 'webhook').length },
    ].filter(c => c.count > 0);

    // Sort results: projects first, then services, then by relevance
    const typeOrder = ['project', 'service', 'deployment', 'environment', 'webhook'];
    results.sort((a, b) => {
      const aIndex = typeOrder.indexOf(a.type);
      const bIndex = typeOrder.indexOf(b.type);
      return aIndex - bIndex;
    });

    return {
      query,
      total: results.length,
      results: results.slice(0, limit),
      categories,
    };
  }

  async getRecentSearches(userId: string): Promise<string[]> {
    // In a real implementation, you'd store search history
    // For now, return empty array
    return [];
  }

  async getSuggestions(userId: string, query: string): Promise<string[]> {
    if (!query || query.length < 2) return [];

    // Get user's workspaces
    const userWorkspaces = await this.prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    const workspaceIds = userWorkspaces.map(w => w.workspaceId);

    // Get project names
    const projects = await this.prisma.project.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        status: 'ACTIVE',
        name: { startsWith: query, mode: 'insensitive' },
      },
      select: { name: true },
      take: 5,
    });

    // Get service names
    const services = await this.prisma.service.findMany({
      where: {
        project: {
          workspaceId: { in: workspaceIds },
          status: 'ACTIVE',
        },
        name: { startsWith: query, mode: 'insensitive' },
      },
      select: { name: true },
      take: 5,
    });

    const suggestions = [
      ...projects.map(p => p.name),
      ...services.map(s => s.name),
    ];

    // Deduplicate and limit
    return [...new Set(suggestions)].slice(0, 8);
  }
}
