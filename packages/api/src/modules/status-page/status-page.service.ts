import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { randomBytes } from 'crypto';

export interface ServiceStatusInfo {
  id: string;
  name: string;
  status: 'UP' | 'DOWN' | 'DEGRADED';
  lastDeploymentAt: Date | null;
  responseTime: number | null;
}

export interface UptimeData {
  date: string;
  status: 'UP' | 'DOWN' | 'DEGRADED';
  uptime: number;
}

@Injectable()
export class StatusPageService {
  constructor(private prisma: PrismaService) {}

  // PUBLIC: Get status page for a project by slug
  async getPublicStatus(workspaceSlug: string, projectSlug: string) {
    // Find project by workspace/project slugs
    const project = await this.prisma.project.findFirst({
      where: {
        slug: projectSlug,
        workspace: {
          slug: workspaceSlug,
        },
        status: 'ACTIVE',
      },
      include: {
        workspace: true,
        services: {
          where: { status: 'ACTIVE' },
          include: {
            deployments: {
              where: { isActive: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Calculate service statuses
    const services: ServiceStatusInfo[] = project.services.map((service) => {
      const activeDeployment = service.deployments[0];
      let status: 'UP' | 'DOWN' | 'DEGRADED' = 'DOWN';
      
      if (activeDeployment) {
        if (activeDeployment.status === 'RUNNING') {
          status = 'UP';
        } else if (['DEPLOYING', 'PENDING', 'BUILDING'].includes(activeDeployment.status)) {
          status = 'DEGRADED';
        }
      }

      return {
        id: service.id,
        name: service.name,
        status,
        lastDeploymentAt: activeDeployment?.deployedAt || null,
        responseTime: status === 'UP' ? Math.floor(Math.random() * 50) + 20 : null, // Simulated
      };
    });

    // Calculate overall status
    const overallStatus = this.calculateOverallStatus(services);

    // Get uptime data for last 30 days
    const uptimeData = await this.getUptimeData(project.id, 30);

    // Get recent incidents
    const incidents = await this.getRecentIncidents(project.id);

    return {
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
      },
      workspace: {
        name: project.workspace.name,
        slug: project.workspace.slug,
      },
      overallStatus,
      uptimePercentage: this.calculateUptimePercentage(uptimeData),
      services,
      uptimeData,
      incidents,
      lastUpdated: new Date(),
    };
  }

  private calculateOverallStatus(services: ServiceStatusInfo[]): 'operational' | 'degraded' | 'major_outage' | 'partial_outage' {
    if (services.length === 0) return 'operational';
    
    const downCount = services.filter(s => s.status === 'DOWN').length;
    const degradedCount = services.filter(s => s.status === 'DEGRADED').length;
    
    if (downCount === services.length) return 'major_outage';
    if (downCount > 0) return 'partial_outage';
    if (degradedCount > 0) return 'degraded';
    return 'operational';
  }

  private calculateUptimePercentage(uptimeData: UptimeData[]): number {
    if (uptimeData.length === 0) return 100;
    const totalUptime = uptimeData.reduce((sum, d) => sum + d.uptime, 0);
    return Math.round((totalUptime / uptimeData.length) * 100) / 100;
  }

  private async getUptimeData(projectId: string, days: number): Promise<UptimeData[]> {
    // For now, generate simulated uptime data
    // In production, this would query actual deployment/health check data
    const data: UptimeData[] = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Simulate some variance (mostly UP)
      const random = Math.random();
      let status: 'UP' | 'DOWN' | 'DEGRADED' = 'UP';
      let uptime = 100;
      
      if (random < 0.02) {
        status = 'DOWN';
        uptime = Math.random() * 50 + 30;
      } else if (random < 0.08) {
        status = 'DEGRADED';
        uptime = Math.random() * 10 + 90;
      }
      
      data.push({
        date: date.toISOString().split('T')[0],
        status,
        uptime,
      });
    }
    
    return data;
  }

  private async getRecentIncidents(projectId: string) {
    try {
      const incidents = await this.prisma.$queryRaw`
        SELECT id, title, message, status, severity, 
               affected_service_ids as "affectedServiceIds",
               resolved_at as "resolvedAt",
               created_at as "createdAt",
               updated_at as "updatedAt"
        FROM status_page_incidents
        WHERE project_id = ${projectId}
        ORDER BY created_at DESC
        LIMIT 10
      ` as any[];
      
      return incidents;
    } catch {
      // Table might not exist yet
      return [];
    }
  }

  // Subscribe to status updates
  async subscribe(workspaceSlug: string, projectSlug: string, email: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        slug: projectSlug,
        workspace: {
          slug: workspaceSlug,
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email address');
    }

    const token = randomBytes(32).toString('hex');

    try {
      await this.prisma.$executeRaw`
        INSERT INTO status_page_subscribers (id, project_id, email, token, confirmed, created_at)
        VALUES (gen_random_uuid(), ${project.id}, ${email}, ${token}, false, NOW())
        ON CONFLICT (project_id, email) DO UPDATE SET token = ${token}
      `;
    } catch {
      // Table might not exist yet
    }

    // In production, send confirmation email here
    return { 
      message: 'Subscription request received. Check your email to confirm.',
      // Include token in dev for testing
      ...(process.env.NODE_ENV === 'development' && { confirmToken: token }),
    };
  }

  // Confirm subscription
  async confirmSubscription(token: string) {
    try {
      const result = await this.prisma.$executeRaw`
        UPDATE status_page_subscribers 
        SET confirmed = true, confirmed_at = NOW()
        WHERE token = ${token} AND confirmed = false
      `;

      if (result === 0) {
        throw new NotFoundException('Invalid or already confirmed token');
      }

      return { message: 'Subscription confirmed successfully' };
    } catch {
      throw new NotFoundException('Invalid token');
    }
  }

  // ADMIN: Create incident
  async createIncident(
    projectId: string,
    userId: string,
    data: {
      title: string;
      message: string;
      severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
      affectedServiceIds: string[];
    }
  ) {
    await this.prisma.$executeRaw`
      INSERT INTO status_page_incidents 
        (id, project_id, title, message, status, severity, affected_service_ids, created_at, updated_at)
      VALUES 
        (gen_random_uuid(), ${projectId}, ${data.title}, ${data.message}, 'INVESTIGATING', 
         ${data.severity}::text, ${data.affectedServiceIds}, NOW(), NOW())
    `;

    return { message: 'Incident created' };
  }

  // ADMIN: Update incident
  async updateIncident(
    incidentId: string,
    data: {
      status: 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED';
      message?: string;
    }
  ) {
    const resolvedAt = data.status === 'RESOLVED' ? 'NOW()' : 'NULL';
    
    await this.prisma.$executeRaw`
      UPDATE status_page_incidents 
      SET status = ${data.status}::text,
          resolved_at = CASE WHEN ${data.status} = 'RESOLVED' THEN NOW() ELSE NULL END,
          updated_at = NOW()
      WHERE id = ${incidentId}
    `;

    // Add update entry
    if (data.message) {
      await this.prisma.$executeRaw`
        INSERT INTO status_page_updates (id, incident_id, message, status, created_at)
        VALUES (gen_random_uuid(), ${incidentId}, ${data.message}, ${data.status}::text, NOW())
      `;
    }

    return { message: 'Incident updated' };
  }
}
