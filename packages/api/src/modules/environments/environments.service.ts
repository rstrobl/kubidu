import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { EnvironmentVariable } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../services/encryption.service';
import { SetEnvironmentVariableDto } from './dto/set-environment-variable.dto';
import { CreateEnvVarReferenceDto } from './dto/create-env-var-reference.dto';
import { DeploymentsService } from '../deployments/deployments.service';

@Injectable()
export class EnvironmentsService {
  private readonly logger = new Logger(EnvironmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    @Inject(forwardRef(() => DeploymentsService))
    private readonly deploymentsService: DeploymentsService,
  ) {}

  async setVariable(
    userId: string,
    setEnvVarDto: SetEnvironmentVariableDto,
  ): Promise<EnvironmentVariable> {
    const { serviceId, deploymentId, key, value, isSecret, isShared } = setEnvVarDto;

    // Prevent users from creating/editing KUBIDU_* system variables
    if (key.startsWith('KUBIDU_')) {
      throw new BadRequestException(
        'Cannot modify system variables starting with KUBIDU_. These are automatically managed.',
      );
    }

    // Validate that at least one scope is provided
    if (!serviceId && !deploymentId) {
      throw new BadRequestException('Either serviceId or deploymentId must be provided');
    }

    // Verify ownership
    if (serviceId) {
      const service = await this.prisma.service.findUnique({
        where: { id: serviceId },
        include: { project: true },
      });
      if (!service || service.project.userId !== userId) {
        throw new ForbiddenException('You do not have permission to modify this service');
      }
    }

    if (deploymentId) {
      const deployment = await this.prisma.deployment.findUnique({
        where: { id: deploymentId },
        include: { service: { include: { project: true } } },
      });
      if (!deployment || deployment.service.project.userId !== userId) {
        throw new ForbiddenException('You do not have permission to modify this deployment');
      }
    }

    // Encrypt the value
    const { encrypted, iv, authTag } = this.encryptionService.encrypt(value);

    // Check if variable already exists
    const existing = await this.prisma.environmentVariable.findFirst({
      where: {
        key,
        serviceId: serviceId || null,
        deploymentId: deploymentId || null,
      },
    });

    let envVar: EnvironmentVariable;
    let service: any = null;

    if (existing) {
      // Update existing variable
      envVar = await this.prisma.environmentVariable.update({
        where: { id: existing.id },
        data: {
          valueEncrypted: encrypted,
          valueIv: `${iv}:${authTag}`,
          isSecret: isSecret !== undefined ? isSecret : existing.isSecret,
          isShared: isShared !== undefined ? isShared : existing.isShared,
        },
      });
      this.logger.log(`Environment variable updated: ${key}`);
    } else {
      // Create new variable
      envVar = await this.prisma.environmentVariable.create({
        data: {
          key,
          valueEncrypted: encrypted,
          valueIv: `${iv}:${authTag}`,
          isSecret: isSecret !== undefined ? isSecret : true,
          isShared: isShared || false,
          serviceId: serviceId || null,
          deploymentId: deploymentId || null,
        },
      });
      this.logger.log(`Environment variable created: ${key}`);
    }

    // Sync inline ${{ServiceName.VAR}} references for service-scoped vars
    if (serviceId) {
      try {
        await this.syncReferencesFromValue(userId, serviceId, value);
      } catch (error) {
        this.logger.error(`Failed to sync references from value for service ${serviceId}:`, error);
      }
    }

    // Trigger new deployment for the service if env var is service-scoped
    if (serviceId) {
      try {
        service = await this.prisma.service.findUnique({
          where: { id: serviceId },
        });

        if (service && service.autoDeploy) {
          await this.deploymentsService.create(userId, {
            serviceId: service.id,
            port: service.defaultPort,
            replicas: service.defaultReplicas,
            cpuLimit: service.defaultCpuLimit,
            memoryLimit: service.defaultMemoryLimit,
            cpuRequest: service.defaultCpuRequest,
            memoryRequest: service.defaultMemoryRequest,
            healthCheckPath: service.defaultHealthCheckPath,
          });
          this.logger.log(`New deployment triggered for service ${serviceId} due to environment variable change`);
        }
      } catch (error) {
        this.logger.error(`Failed to trigger deployment for service ${serviceId}:`, error);
      }
    }

    return envVar;
  }

  async getVariables(
    userId: string,
    serviceId?: string,
    deploymentId?: string,
    decrypt: boolean = false,
  ): Promise<any[]> {
    // Build where clause
    const where: any = {};

    if (serviceId) {
      where.serviceId = serviceId;
    }
    if (deploymentId) {
      where.deploymentId = deploymentId;
    }

    const envVars = await this.prisma.environmentVariable.findMany({
      where,
    });

    // Get references for this service to show which env vars reference other services
    let references: any[] = [];
    if (serviceId) {
      references = await this.prisma.envVarReference.findMany({
        where: { serviceId },
        include: {
          sourceService: {
            select: { id: true, name: true },
          },
        },
      });
    }

    // Create a map of key -> reference info
    const refByKey = new Map<string, { sourceServiceId: string; sourceServiceName: string; sourceKey: string }>();
    for (const ref of references) {
      refByKey.set(ref.key, {
        sourceServiceId: ref.sourceServiceId,
        sourceServiceName: ref.sourceService.name,
        sourceKey: ref.key,
      });
    }

    return envVars.map((envVar) => {
      const result: any = {
        id: envVar.id,
        key: envVar.key,
        isSecret: envVar.isSecret,
        isSystem: envVar.isSystem,
        isShared: envVar.isShared,
        createdAt: envVar.createdAt,
        updatedAt: envVar.updatedAt,
      };

      // Add reference info if this key references another service
      const ref = refByKey.get(envVar.key);
      if (ref) {
        result.reference = ref;
      }

      if (decrypt && envVar.valueEncrypted && envVar.valueIv) {
        try {
          const [iv, authTag] = envVar.valueIv.split(':');
          result.value = this.encryptionService.decrypt(envVar.valueEncrypted, iv, authTag);
        } catch (error) {
          this.logger.error(`Failed to decrypt environment variable ${envVar.key}`, error);
          result.value = '[DECRYPTION FAILED]';
        }
      } else if (envVar.isSecret) {
        result.value = '***';
      }

      return result;
    });
  }

  async deleteVariable(userId: string, envVarId: string): Promise<void> {
    const envVar = await this.prisma.environmentVariable.findUnique({
      where: { id: envVarId },
    });

    if (!envVar) {
      throw new NotFoundException('Environment variable not found');
    }

    // Prevent deletion of system variables
    if (envVar.isSystem) {
      throw new BadRequestException(
        'Cannot delete system variables. These are automatically managed.',
      );
    }

    // Verify ownership
    let ownerUserId: string | null = null;
    let serviceId: string | null = null;

    if (envVar.serviceId) {
      const service = await this.prisma.service.findUnique({
        where: { id: envVar.serviceId },
        include: { project: true },
      });
      if (service) {
        ownerUserId = service.project.userId;
        serviceId = service.id;
      }
    } else if (envVar.deploymentId) {
      const deployment = await this.prisma.deployment.findUnique({
        where: { id: envVar.deploymentId },
        include: { service: { include: { project: true } } },
      });
      if (deployment) {
        ownerUserId = deployment.service.project.userId;
        serviceId = deployment.service.id;
      }
    }

    if (ownerUserId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this variable');
    }

    await this.prisma.environmentVariable.delete({
      where: { id: envVarId },
    });

    this.logger.log(`Environment variable deleted: ${envVarId}`);

    // Trigger new deployment for the service if env var was service-scoped
    if (serviceId) {
      try {
        const service = await this.prisma.service.findUnique({
          where: { id: serviceId },
        });

        if (service && service.autoDeploy) {
          await this.deploymentsService.create(userId, {
            serviceId: service.id,
            port: service.defaultPort,
            replicas: service.defaultReplicas,
            cpuLimit: service.defaultCpuLimit,
            memoryLimit: service.defaultMemoryLimit,
            cpuRequest: service.defaultCpuRequest,
            memoryRequest: service.defaultMemoryRequest,
            healthCheckPath: service.defaultHealthCheckPath,
          });
          this.logger.log(`New deployment triggered for service ${serviceId} due to environment variable deletion`);
        }
      } catch (error) {
        this.logger.error(`Failed to trigger deployment for service ${serviceId}:`, error);
      }
    }
  }

  /**
   * Get all shareable variables from other services in the same project.
   * Returns variables that are isSystem=true OR isShared=true, grouped by source service.
   */
  async getSharedVariables(
    userId: string,
    projectId: string,
    excludeServiceId?: string,
  ): Promise<any[]> {
    // Verify project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this project');
    }

    // Get all services in the project
    const whereClause: any = {
      projectId,
      status: 'ACTIVE',
    };
    if (excludeServiceId) {
      whereClause.id = { not: excludeServiceId };
    }

    const services = await this.prisma.service.findMany({
      where: whereClause,
      include: {
        environmentVariables: {
          where: {
            deploymentId: null, // Only service-level vars
            OR: [
              { isSystem: true },
              { isShared: true },
            ],
          },
        },
      },
    });

    return services
      .filter((s) => s.environmentVariables.length > 0)
      .map((s) => ({
        serviceId: s.id,
        serviceName: s.name,
        variables: s.environmentVariables.map((v) => {
          let value: string | undefined;
          if (v.isSecret) {
            value = '***';
          } else if (v.valueEncrypted && v.valueIv) {
            try {
              const [iv, authTag] = v.valueIv.split(':');
              value = this.encryptionService.decrypt(v.valueEncrypted, iv, authTag);
            } catch {
              value = undefined;
            }
          }
          return {
            key: v.key,
            isSystem: v.isSystem,
            isShared: v.isShared,
            value,
          };
        }),
      }));
  }

  /**
   * Create an environment variable reference from one service to another.
   */
  async createReference(
    userId: string,
    dto: CreateEnvVarReferenceDto,
  ): Promise<any> {
    const { serviceId, sourceServiceId, key, alias } = dto;

    // Validate both services exist and belong to the same project owned by this user
    const [consumer, source] = await Promise.all([
      this.prisma.service.findUnique({
        where: { id: serviceId },
        include: { project: true },
      }),
      this.prisma.service.findUnique({
        where: { id: sourceServiceId },
        include: { project: true },
      }),
    ]);

    if (!consumer || consumer.project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to modify this service');
    }
    if (!source || source.project.userId !== userId) {
      throw new ForbiddenException('Source service not found or not accessible');
    }
    if (consumer.projectId !== source.projectId) {
      throw new BadRequestException('Both services must belong to the same project');
    }
    if (serviceId === sourceServiceId) {
      throw new BadRequestException('Cannot reference variables from the same service');
    }

    // Validate the source variable exists and is shared or system
    const sourceVar = await this.prisma.environmentVariable.findFirst({
      where: {
        serviceId: sourceServiceId,
        deploymentId: null,
        key,
        OR: [
          { isSystem: true },
          { isShared: true },
        ],
      },
    });

    if (!sourceVar) {
      throw new BadRequestException(
        `Variable "${key}" is not available for sharing from the source service`,
      );
    }

    const reference = await this.prisma.envVarReference.create({
      data: {
        serviceId,
        sourceServiceId,
        key,
        alias: alias || null,
      },
    });

    this.logger.log(
      `EnvVarReference created: service ${serviceId} references ${key} from service ${sourceServiceId}`,
    );

    return reference;
  }

  /**
   * Get all environment variable references for a service.
   */
  async getReferences(userId: string, serviceId: string): Promise<any[]> {
    // Verify ownership
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { project: true },
    });

    if (!service || service.project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this service');
    }

    const references = await this.prisma.envVarReference.findMany({
      where: { serviceId },
      include: {
        sourceService: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return references.map((ref) => ({
      id: ref.id,
      sourceServiceId: ref.sourceServiceId,
      sourceServiceName: ref.sourceService.name,
      key: ref.key,
      alias: ref.alias,
      createdAt: ref.createdAt,
    }));
  }

  /**
   * Delete an environment variable reference.
   */
  async deleteReference(userId: string, referenceId: string): Promise<void> {
    const reference = await this.prisma.envVarReference.findUnique({
      where: { id: referenceId },
      include: {
        service: {
          include: { project: true },
        },
      },
    });

    if (!reference) {
      throw new NotFoundException('Reference not found');
    }

    if (reference.service.project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this reference');
    }

    await this.prisma.envVarReference.delete({
      where: { id: referenceId },
    });

    this.logger.log(`EnvVarReference deleted: ${referenceId}`);
  }

  /**
   * Parse ${{ServiceName.VAR_KEY}} tokens from a value and auto-sync EnvVarReference records.
   * Creates references for tokens that don't already exist; does not delete stale ones.
   */
  private async syncReferencesFromValue(
    userId: string,
    serviceId: string,
    value: string,
  ): Promise<void> {
    const tokenRegex = /\$\{\{([^}]+)\}\}/g;
    const tokens: { serviceName: string; key: string }[] = [];
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(value)) !== null) {
      const inner = match[1].trim();
      const dotIndex = inner.indexOf('.');
      if (dotIndex === -1) continue;
      tokens.push({
        serviceName: inner.slice(0, dotIndex),
        key: inner.slice(dotIndex + 1),
      });
    }

    if (tokens.length === 0) return;

    // Get the consumer service and its project
    const consumerService = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { project: true },
    });
    if (!consumerService) return;

    // Get all services in the same project to build name→id map
    const projectServices = await this.prisma.service.findMany({
      where: { projectId: consumerService.projectId },
    });
    const nameToId = new Map<string, string>();
    for (const s of projectServices) {
      nameToId.set(s.name, s.id);
    }

    for (const token of tokens) {
      const sourceServiceId = nameToId.get(token.serviceName);
      if (!sourceServiceId || sourceServiceId === serviceId) continue;

      // Check if reference already exists
      const existing = await this.prisma.envVarReference.findFirst({
        where: {
          serviceId,
          sourceServiceId,
          key: token.key,
        },
      });
      if (existing) continue;

      // Validate the source variable exists and is shared or system
      const sourceVar = await this.prisma.environmentVariable.findFirst({
        where: {
          serviceId: sourceServiceId,
          deploymentId: null,
          key: token.key,
          OR: [{ isSystem: true }, { isShared: true }],
        },
      });
      if (!sourceVar) {
        this.logger.warn(
          `Inline reference $\{\{${token.serviceName}.${token.key}\}\}: source variable not found or not shared`,
        );
        continue;
      }

      await this.prisma.envVarReference.create({
        data: {
          serviceId,
          sourceServiceId,
          key: token.key,
        },
      });

      this.logger.log(
        `Auto-created EnvVarReference: service ${serviceId} references ${token.key} from ${token.serviceName} (${sourceServiceId})`,
      );
    }
  }
}
