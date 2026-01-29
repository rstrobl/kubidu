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
    const { serviceId, deploymentId, key, value, isSecret } = setEnvVarDto;

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
          serviceId: serviceId || null,
          deploymentId: deploymentId || null,
        },
      });
      this.logger.log(`Environment variable created: ${key}`);
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

    return envVars.map((envVar) => {
      const result: any = {
        id: envVar.id,
        key: envVar.key,
        isSecret: envVar.isSecret,
        isSystem: envVar.isSystem,
        createdAt: envVar.createdAt,
        updatedAt: envVar.updatedAt,
      };

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
}
