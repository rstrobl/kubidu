import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

// Pricing tiers (per month)
const PRICING = {
  FREE: {
    name: 'Hobby',
    basePrice: 0,
    includedServices: 2,
    includedDeployments: 10,
    cpuPricePerCore: 0, // First core free
    memoryPricePerGB: 0, // First 512MB free
    storagePricePerGB: 0, // First 1GB free
    bandwidthPricePerGB: 0, // First 1GB free
  },
  STARTER: {
    name: 'Starter',
    basePrice: 9,
    includedServices: 5,
    includedDeployments: 50,
    cpuPricePerCore: 10,
    memoryPricePerGB: 5,
    storagePricePerGB: 0.5,
    bandwidthPricePerGB: 0.1,
  },
  PRO: {
    name: 'Pro',
    basePrice: 29,
    includedServices: 20,
    includedDeployments: 200,
    cpuPricePerCore: 8,
    memoryPricePerGB: 4,
    storagePricePerGB: 0.3,
    bandwidthPricePerGB: 0.05,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    basePrice: 99,
    includedServices: -1, // Unlimited
    includedDeployments: -1,
    cpuPricePerCore: 5,
    memoryPricePerGB: 2.5,
    storagePricePerGB: 0.15,
    bandwidthPricePerGB: 0.02,
  },
};

export interface ServiceCost {
  serviceId: string;
  serviceName: string;
  cpuCores: number;
  memoryGB: number;
  storageGB: number;
  cpuCost: number;
  memoryCost: number;
  storageCost: number;
  totalCost: number;
}

export interface CostBreakdown {
  workspace: {
    id: string;
    name: string;
    plan: string;
  };
  billing: {
    basePrice: number;
    resourceCosts: number;
    totalEstimate: number;
    currency: string;
  };
  usage: {
    totalServices: number;
    includedServices: number;
    totalDeployments: number;
    includedDeployments: number;
    totalCpuCores: number;
    totalMemoryGB: number;
    totalStorageGB: number;
  };
  services: ServiceCost[];
  recommendations: string[];
  upsell?: {
    plan: string;
    potentialSavings: number;
    message: string;
  };
}

@Injectable()
export class CostService {
  constructor(private prisma: PrismaService) {}

  async getCostEstimate(workspaceId: string, userId: string): Promise<CostBreakdown> {
    // Get workspace with subscription and projects
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          where: { userId },
        },
        subscription: true,
        projects: {
          where: { status: 'ACTIVE' },
          include: {
            services: {
              where: { status: 'ACTIVE' },
              include: {
                deployments: {
                  where: { isActive: true },
                  take: 1,
                },
                volumes: true,
              },
            },
          },
        },
      },
    });

    if (!workspace || workspace.members.length === 0) {
      throw new NotFoundException('Workspace not found or access denied');
    }

    const plan = (workspace.subscription?.plan || 'FREE') as keyof typeof PRICING;
    const pricing = PRICING[plan];

    // Calculate service costs
    const services: ServiceCost[] = [];
    let totalCpuCores = 0;
    let totalMemoryGB = 0;
    let totalStorageGB = 0;
    let totalDeployments = 0;

    for (const project of workspace.projects) {
      for (const service of project.services) {
        const deployment = service.deployments[0];
        
        // Parse resource allocations
        const cpuLimit = deployment?.cpuLimit || service.defaultCpuLimit;
        const memoryLimit = deployment?.memoryLimit || service.defaultMemoryLimit;
        
        const cpuCores = this.parseCpu(cpuLimit);
        const memoryGB = this.parseMemory(memoryLimit);
        const storageGB = service.volumes.reduce((sum, v) => sum + this.parseStorage(v.size), 0);

        totalCpuCores += cpuCores;
        totalMemoryGB += memoryGB;
        totalStorageGB += storageGB;
        totalDeployments += service.deployments.length;

        const cpuCost = cpuCores * pricing.cpuPricePerCore;
        const memoryCost = memoryGB * pricing.memoryPricePerGB;
        const storageCost = storageGB * pricing.storagePricePerGB;

        services.push({
          serviceId: service.id,
          serviceName: service.name,
          cpuCores,
          memoryGB,
          storageGB,
          cpuCost: Math.round(cpuCost * 100) / 100,
          memoryCost: Math.round(memoryCost * 100) / 100,
          storageCost: Math.round(storageCost * 100) / 100,
          totalCost: Math.round((cpuCost + memoryCost + storageCost) * 100) / 100,
        });
      }
    }

    const totalServices = services.length;
    const resourceCosts = services.reduce((sum, s) => sum + s.totalCost, 0);
    const totalEstimate = pricing.basePrice + resourceCosts;

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      plan,
      totalServices,
      totalCpuCores,
      totalMemoryGB,
      services,
    );

    // Check for upsell opportunity
    const upsell = this.checkUpsell(plan, totalEstimate, totalServices, resourceCosts);

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        plan: pricing.name,
      },
      billing: {
        basePrice: pricing.basePrice,
        resourceCosts: Math.round(resourceCosts * 100) / 100,
        totalEstimate: Math.round(totalEstimate * 100) / 100,
        currency: 'USD',
      },
      usage: {
        totalServices,
        includedServices: pricing.includedServices,
        totalDeployments,
        includedDeployments: pricing.includedDeployments,
        totalCpuCores: Math.round(totalCpuCores * 100) / 100,
        totalMemoryGB: Math.round(totalMemoryGB * 100) / 100,
        totalStorageGB: Math.round(totalStorageGB * 100) / 100,
      },
      services: services.sort((a, b) => b.totalCost - a.totalCost),
      recommendations,
      upsell,
    };
  }

  async getProjectCost(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId },
            },
            subscription: true,
          },
        },
        services: {
          where: { status: 'ACTIVE' },
          include: {
            deployments: {
              where: { isActive: true },
              take: 1,
            },
            volumes: true,
          },
        },
      },
    });

    if (!project || project.workspace.members.length === 0) {
      throw new NotFoundException('Project not found or access denied');
    }

    const plan = (project.workspace.subscription?.plan || 'FREE') as keyof typeof PRICING;
    const pricing = PRICING[plan];

    const services = project.services.map(service => {
      const deployment = service.deployments[0];
      const cpuCores = this.parseCpu(deployment?.cpuLimit || service.defaultCpuLimit);
      const memoryGB = this.parseMemory(deployment?.memoryLimit || service.defaultMemoryLimit);
      const storageGB = service.volumes.reduce((sum, v) => sum + this.parseStorage(v.size), 0);

      return {
        id: service.id,
        name: service.name,
        cpuCores,
        memoryGB,
        storageGB,
        monthlyCost: Math.round((
          cpuCores * pricing.cpuPricePerCore +
          memoryGB * pricing.memoryPricePerGB +
          storageGB * pricing.storagePricePerGB
        ) * 100) / 100,
      };
    });

    const totalMonthlyCost = services.reduce((sum, s) => sum + s.monthlyCost, 0);

    return {
      project: {
        id: project.id,
        name: project.name,
      },
      services,
      totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
      currency: 'USD',
    };
  }

  private parseCpu(cpu: string): number {
    if (cpu.endsWith('m')) {
      return parseInt(cpu) / 1000;
    }
    return parseFloat(cpu);
  }

  private parseMemory(memory: string): number {
    const value = parseInt(memory);
    if (memory.endsWith('Gi')) return value;
    if (memory.endsWith('Mi')) return value / 1024;
    if (memory.endsWith('Ki')) return value / (1024 * 1024);
    return value / (1024 * 1024 * 1024);
  }

  private parseStorage(storage: string): number {
    const value = parseInt(storage);
    if (storage.endsWith('Gi')) return value;
    if (storage.endsWith('Mi')) return value / 1024;
    if (storage.endsWith('Ti')) return value * 1024;
    return value;
  }

  private generateRecommendations(
    plan: string,
    totalServices: number,
    totalCpuCores: number,
    totalMemoryGB: number,
    services: ServiceCost[],
  ): string[] {
    const recommendations: string[] = [];

    // Check for oversized services
    const oversizedServices = services.filter(s => s.cpuCores > 2 || s.memoryGB > 4);
    if (oversizedServices.length > 0) {
      recommendations.push(
        `${oversizedServices.length} service(s) may be over-provisioned. Consider reducing resources for cost savings.`
      );
    }

    // Check for idle services (low cost = low resources = maybe unused?)
    const lowCostServices = services.filter(s => s.totalCost < 1 && s.cpuCores < 0.2);
    if (lowCostServices.length > 0) {
      recommendations.push(
        `${lowCostServices.length} Service(s) nutzen wenig Ressourcen. Konsolidierung oder Entfernung könnte Kosten sparen.`
      );
    }

    // Plan-specific recommendations
    if (plan === 'FREE' && totalServices > 2) {
      recommendations.push('Sie haben das Limit des Hobby-Plans überschritten. Upgrade auf Pro empfohlen.');
    }

    if (totalCpuCores > 4 && plan !== 'ENTERPRISE') {
      recommendations.push('Hohe CPU-Nutzung erkannt. Enterprise-Plan bietet bessere Preise pro Kern.');
    }

    return recommendations;
  }

  private checkUpsell(
    currentPlan: string,
    currentCost: number,
    totalServices: number,
    resourceCosts: number,
  ): CostBreakdown['upsell'] | undefined {
    if (currentPlan === 'ENTERPRISE') return undefined;

    const plans = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'];
    const currentPlanIndex = plans.indexOf(currentPlan);
    
    if (currentPlanIndex < plans.length - 1) {
      const nextPlan = plans[currentPlanIndex + 1] as keyof typeof PRICING;
      const nextPricing = PRICING[nextPlan];
      
      // Calculate hypothetical cost with next plan
      const nextPlanCost = nextPricing.basePrice + 
        resourceCosts * (nextPricing.cpuPricePerCore / PRICING[currentPlan as keyof typeof PRICING].cpuPricePerCore || 1);
      
      if (totalServices > PRICING[currentPlan as keyof typeof PRICING].includedServices) {
        return {
          plan: nextPricing.name,
          potentialSavings: 0,
          message: `Upgrade auf ${nextPricing.name} für mehr inkludierte Services und bessere Ressourcen-Preise.`,
        };
      }
    }

    return undefined;
  }
}
