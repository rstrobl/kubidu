import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { PrismaService } from '../database/prisma.service';
import { NamespaceManager } from '../k8s/namespace.manager';
import { SecretManager } from '../k8s/secret.manager';
import { DeploymentManager, DeploymentConfig } from '../k8s/deployment.manager';
import { EncryptionService } from '../services/encryption.service';

interface DeployJob {
  deploymentId: string;
  projectId: string;
  userId: string;
}

@Processor('deploy')
export class DeployConsumer {
  private readonly logger = new Logger(DeployConsumer.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private encryptionService: EncryptionService,
    private namespaceManager: NamespaceManager,
    private secretManager: SecretManager,
    private deploymentManager: DeploymentManager,
  ) {}

  @Process()
  async handleDeploy(job: Job<DeployJob>): Promise<void> {
    const { deploymentId, projectId, userId } = job.data;

    this.logger.log(`Processing deploy job for deployment ${deploymentId}`);

    try {
      // Update deployment status to deploying
      await this.updateDeploymentStatus(deploymentId, 'DEPLOYING');

      // Fetch deployment details
      const deployment: any = await this.prisma.deployment.findUnique({
        where: { id: deploymentId },
        include: {
          service: {
            include: {
              project: true,
              environmentVariables: true, // Include service-level env vars
              domains: {
                where: {
                  isVerified: true, // Only include verified domains
                },
              },
            },
          },
          environmentVariables: true, // Include deployment-level env vars
        },
      });

      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }

      // Ensure namespace exists
      const namespace = await this.namespaceManager.ensureNamespace(userId);

      // Merge service-level and deployment-level environment variables
      // Deployment-level variables override service-level ones with the same key
      const serviceEnvVars = deployment.service.environmentVariables || [];
      const deploymentEnvVars = deployment.environmentVariables || [];

      const envVarMap = new Map();

      // Add service-level env vars first
      serviceEnvVars.forEach((envVar: any) => {
        envVarMap.set(envVar.key, envVar);
      });

      // Override with deployment-level env vars
      deploymentEnvVars.forEach((envVar: any) => {
        envVarMap.set(envVar.key, envVar);
      });

      const allEnvVars = Array.from(envVarMap.values());

      // Create or update secret with environment variables
      let secretName: string | undefined;
      if (allEnvVars.length > 0) {
        secretName = `${deployment.name}-env`;
        await this.secretManager.createOrUpdateSecret(
          namespace,
          secretName,
          allEnvVars,
        );
      }

      // Extract verified custom domains
      const customDomains = (deployment.service.domains || [])
        .map((domain: any) => domain.domain);

      // Build deployment configuration
      const config: DeploymentConfig = {
        deploymentId: deployment.id,
        serviceId: deployment.service.id,
        serviceName: deployment.service.name,
        name: deployment.name,
        imageUrl: deployment.imageUrl,
        imageTag: deployment.imageTag || 'latest',
        port: deployment.port,
        replicas: deployment.replicas,
        cpuLimit: deployment.cpuLimit,
        memoryLimit: deployment.memoryLimit,
        cpuRequest: deployment.cpuRequest,
        memoryRequest: deployment.memoryRequest,
        healthCheckPath: deployment.healthCheckPath,
        startCommand: deployment.service.defaultStartCommand || undefined,
        secretName,
        subdomain: this.generateSubdomain(deployment.service.subdomain),
        customDomains: customDomains.length > 0 ? customDomains : undefined,
      };

      if (customDomains.length > 0) {
        this.logger.log(
          `Deployment ${deploymentId} will be accessible on custom domains: ${customDomains.join(', ')}`,
        );
      }

      // Create Kubernetes resources
      await this.deploymentManager.createOrUpdateDeployment(namespace, config);
      await this.deploymentManager.createOrUpdateService(namespace, config);

      // Only create ingress if there is at least one domain to route
      const hasDomains = config.subdomain || (config.customDomains && config.customDomains.length > 0);
      if (hasDomains) {
        await this.deploymentManager.createOrUpdateIngress(namespace, config);
      } else {
        // Delete any existing ingress since there are no domains
        await this.deploymentManager.deleteIngress(namespace, config.serviceName);
      }

      // Wait for deployment to be ready
      const isReady = await this.deploymentManager.waitForRollout(
        namespace,
        config.name,
        300000,
      );

      // Capture logs before any cleanup, regardless of outcome
      const capturedLogs = await this.capturePodLogs(namespace, config.name);

      if (isReady) {
        await this.updateDeploymentStatus(deploymentId, 'RUNNING', new Date());

        // Determine public URL: prefer custom domain, fall back to subdomain
        const primaryCustomDomain = customDomains[0];
        const publicDomain = primaryCustomDomain || config.subdomain;

        if (publicDomain) {
          const protocol = primaryCustomDomain ? 'https' : 'http';
          const url = `${protocol}://${publicDomain}`;

          await this.prisma.service.update({
            where: { id: deployment.serviceId },
            data: { url },
          });

          await this.updatePublicDomainVariable(deployment.serviceId, publicDomain);

          this.logger.log(`Deployment ${deploymentId} completed successfully. Service URL: ${url}`);
        } else {
          // No public domain configured — clear URL
          await this.prisma.service.update({
            where: { id: deployment.serviceId },
            data: { url: null },
          });

          await this.clearPublicDomainVariable(deployment.serviceId);

          this.logger.log(`Deployment ${deploymentId} completed successfully. No public domain configured.`);
        }
      } else {
        // Store captured logs with the failure message
        const failureMessage = 'Deployment did not become ready within timeout';
        const fullLogs = capturedLogs
          ? `${failureMessage}\n\n--- Pod Logs ---\n${capturedLogs}`
          : failureMessage;

        await this.updateDeploymentStatus(
          deploymentId,
          'FAILED',
          null,
          fullLogs,
        );

        // Clean up Kubernetes resources for failed deployment
        try {
          await this.deploymentManager.deleteDeployment(namespace, config.name);
          this.logger.log(`Deleted Kubernetes resources for failed deployment ${config.name}`);
        } catch (cleanupError) {
          this.logger.error(
            `Failed to delete Kubernetes resources for deployment ${config.name}: ${cleanupError.message}`,
          );
        }

        this.logger.error(`Deployment ${deploymentId} failed to become ready`);
      }
    } catch (error) {
      this.logger.error(`Deployment ${deploymentId} failed: ${error.message}`, error.stack);

      // Try to capture pod logs before cleanup
      let capturedLogs = '';
      try {
        const deployment: any = await this.prisma.deployment.findUnique({
          where: { id: deploymentId },
          select: {
            name: true,
            service: {
              select: {
                project: {
                  select: {
                    userId: true,
                  },
                },
              },
            },
          },
        });

        if (deployment) {
          const namespace = await this.namespaceManager.ensureNamespace(
            deployment.service.project.userId,
          );

          capturedLogs = await this.capturePodLogs(namespace, deployment.name);

          // Store logs with error, then clean up
          const errorMessage = error.message || 'Unknown error';
          const fullLogs = capturedLogs
            ? `${errorMessage}\n\n--- Pod Logs ---\n${capturedLogs}`
            : errorMessage;

          await this.updateDeploymentStatus(
            deploymentId,
            'FAILED',
            null,
            fullLogs,
          );

          await this.deploymentManager.deleteDeployment(namespace, deployment.name);
          this.logger.log(
            `Deleted Kubernetes resources for failed deployment ${deployment.name}`,
          );
        } else {
          await this.updateDeploymentStatus(
            deploymentId,
            'FAILED',
            null,
            error.message || 'Unknown error',
          );
        }
      } catch (cleanupError) {
        this.logger.error(
          `Failed to delete Kubernetes resources during error cleanup: ${cleanupError.message}`,
        );
        // Still save the error even if cleanup failed
        await this.updateDeploymentStatus(
          deploymentId,
          'FAILED',
          null,
          error.message || 'Unknown error',
        ).catch(() => {});
      }

      throw error;
    }
  }

  /**
   * Update deployment status in database
   */
  private async updateDeploymentStatus(
    deploymentId: string,
    status: string,
    deployedAt?: Date | null,
    errorMessage?: string,
  ): Promise<void> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (deployedAt !== undefined) {
      updateData.deployedAt = deployedAt;
    }

    if (errorMessage) {
      updateData.deploymentLogs = errorMessage;
    }

    // If deployment is successful, mark it as active and stop all others
    if (status === 'RUNNING') {
      updateData.isActive = true;

      // Get the deployment to find its serviceId and userId
      const deployment = await this.prisma.deployment.findUnique({
        where: { id: deploymentId },
        select: {
          serviceId: true,
          service: {
            select: {
              project: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      });

      if (deployment) {
        // Find all other deployments that need to be stopped
        const deploymentsToStop = await this.prisma.deployment.findMany({
          where: {
            serviceId: deployment.serviceId,
            id: { not: deploymentId },
            status: { in: ['RUNNING', 'DEPLOYING'] }, // Only stop running/deploying ones
          },
          select: { id: true, name: true },
        });

        // Mark all other deployments for this service as stopped and inactive
        await this.prisma.deployment.updateMany({
          where: {
            serviceId: deployment.serviceId,
            id: { not: deploymentId },
            status: { in: ['RUNNING', 'DEPLOYING'] },
          },
          data: {
            status: 'STOPPED',
            isActive: false,
            stoppedAt: new Date(),
          },
        });

        // Delete Kubernetes resources for stopped deployments
        if (deploymentsToStop.length > 0) {
          const namespace = await this.namespaceManager.ensureNamespace(
            deployment.service.project.userId,
          );

          for (const oldDeployment of deploymentsToStop) {
            try {
              await this.deploymentManager.deleteDeployment(namespace, oldDeployment.name);
              this.logger.log(
                `Deleted Kubernetes resources for stopped deployment ${oldDeployment.name}`,
              );
            } catch (error) {
              this.logger.error(
                `Failed to delete Kubernetes resources for deployment ${oldDeployment.name}: ${error.message}`,
              );
            }
          }
        }
      }
    }

    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: updateData,
    });
  }

  /**
   * Capture pod logs and status for a deployment before cleanup
   */
  private async capturePodLogs(namespace: string, deploymentName: string): Promise<string> {
    try {
      return await this.deploymentManager.getPodLogs(namespace, deploymentName, 200);
    } catch (error) {
      this.logger.warn(`Could not capture pod logs for ${deploymentName}: ${error.message}`);
      // Fall back to pod status if logs aren't available
      try {
        const status = await this.deploymentManager.getPodStatus(namespace, deploymentName);
        return JSON.stringify(status, null, 2);
      } catch {
        return '';
      }
    }
  }

  /**
   * Generate subdomain for deployment
   * Only returns a subdomain if the user has explicitly set one on the service
   */
  private generateSubdomain(serviceSubdomain?: string | null): string | undefined {
    if (serviceSubdomain) {
      const domainSuffix = this.configService.get<string>('domain.suffix');
      return `${serviceSubdomain}.${domainSuffix}`;
    }

    return undefined;
  }

  /**
   * Update KUBIDU_PUBLIC_DOMAIN system variable when deployment succeeds
   */
  private async updatePublicDomainVariable(serviceId: string, subdomain: string): Promise<void> {
    try {
      const { encrypted, iv, authTag } = this.encryptionService.encrypt(subdomain);

      // Check if variable already exists
      const existing = await this.prisma.environmentVariable.findFirst({
        where: {
          serviceId,
          deploymentId: null,
          key: 'KUBIDU_PUBLIC_DOMAIN',
        },
      });

      if (existing) {
        // Update existing variable
        await this.prisma.environmentVariable.update({
          where: { id: existing.id },
          data: {
            valueEncrypted: encrypted,
            valueIv: `${iv}:${authTag}`,
          },
        });
      } else {
        // Create new variable
        await this.prisma.environmentVariable.create({
          data: {
            serviceId,
            deploymentId: null,
            key: 'KUBIDU_PUBLIC_DOMAIN',
            valueEncrypted: encrypted,
            valueIv: `${iv}:${authTag}`,
            isSecret: false,
            isSystem: true,
          },
        });
      }

      this.logger.log(`Updated KUBIDU_PUBLIC_DOMAIN for service ${serviceId}`);
    } catch (error) {
      this.logger.error(`Failed to update KUBIDU_PUBLIC_DOMAIN for service ${serviceId}:`, error);
    }
  }

  /**
   * Remove KUBIDU_PUBLIC_DOMAIN system variable when no public domain exists
   */
  private async clearPublicDomainVariable(serviceId: string): Promise<void> {
    try {
      const existing = await this.prisma.environmentVariable.findFirst({
        where: {
          serviceId,
          deploymentId: null,
          key: 'KUBIDU_PUBLIC_DOMAIN',
        },
      });

      if (existing) {
        await this.prisma.environmentVariable.delete({
          where: { id: existing.id },
        });
        this.logger.log(`Deleted KUBIDU_PUBLIC_DOMAIN for service ${serviceId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete KUBIDU_PUBLIC_DOMAIN for service ${serviceId}:`, error);
    }
  }
}
