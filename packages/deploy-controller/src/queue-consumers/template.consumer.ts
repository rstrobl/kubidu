import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../services/encryption.service';
import { NamespaceManager } from '../k8s/namespace.manager';
import { SecretManager } from '../k8s/secret.manager';
import { DeploymentManager } from '../k8s/deployment.manager';
import {
  TemplateDefinition,
  TemplateServiceDef,
  TemplateEnvValue,
} from '@kubidu/shared';

interface DeployTemplateJobData {
  templateDeploymentId: string;
  templateId: string;
  projectId: string;
  workspaceId: string;
  inputs: Record<string, string>;
}

@Processor('template')
export class TemplateConsumer {
  private readonly logger = new Logger(TemplateConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
    private readonly namespaceManager: NamespaceManager,
    private readonly secretManager: SecretManager,
    private readonly deploymentManager: DeploymentManager,
  ) {}

  @Process('deploy-template')
  async handleDeployTemplate(job: Job<DeployTemplateJobData>) {
    const { templateDeploymentId, templateId, projectId, workspaceId, inputs } = job.data;

    this.logger.log(`Processing template deployment: ${templateDeploymentId}`);

    try {
      // Update status to DEPLOYING
      await this.prisma.templateDeployment.update({
        where: { id: templateDeploymentId },
        data: { status: 'DEPLOYING' },
      });

      // Get template
      const template = await this.prisma.template.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new Error('Template not found');
      }

      const definition = template.definition as unknown as TemplateDefinition;

      // Ensure namespace exists and get the actual namespace name (using workspaceId for tenant isolation)
      const namespace = await this.namespaceManager.ensureNamespace(workspaceId);

      // First pass: create or find existing services (handles retries)
      // Maps template service name -> service info (id, name, k8sName)
      const createdServices: Map<string, { id: string; name: string; k8sName: string }> = new Map();

      for (const serviceDef of definition.services) {
        // Use clean service name from template (e.g., "Redis", "directus-db")
        const serviceName = serviceDef.name;

        // Check if service already exists for this template deployment (retry scenario)
        let service = await this.prisma.service.findFirst({
          where: {
            templateDeploymentId,
            dockerImage: serviceDef.image,
          },
        });

        if (service) {
          // Same template deployment (retry scenario) - reuse it
          this.logger.log(`Found existing service: ${service.name} (${service.id})`);
        } else {
          // Create new service with clean name
          service = await this.prisma.service.create({
            data: {
              projectId,
              name: serviceName,
              serviceType: 'DOCKER_IMAGE',
              dockerImage: serviceDef.image,
              dockerTag: serviceDef.tag || 'latest',
              defaultPort: serviceDef.port || 8080,
              defaultReplicas: serviceDef.replicas || 1,
              defaultCpuLimit: serviceDef.cpuLimit || '1000m',
              defaultMemoryLimit: serviceDef.memoryLimit || '512Mi',
              defaultCpuRequest: '100m',
              defaultMemoryRequest: '128Mi',
              defaultHealthCheckPath: '/',
              autoDeploy: false,
              templateDeploymentId,
              status: 'ACTIVE',
            },
          });
          this.logger.log(`Created service: ${service.name} (${service.id})`);
        }

        // K8s resource names must be unique - use service ID (remove dashes for shorter names)
        const shortId = service.id.replace(/-/g, '').slice(0, 12);
        const k8sName = `svc-${shortId}`;

        this.logger.log(`Service ${service.name} mapped to k8sName: ${k8sName}`);

        // Map the template's service name to the service info
        createdServices.set(serviceDef.name, { id: service.id, name: service.name, k8sName });
      }

      // Second pass: resolve environment variables and create deployments
      const generatedSecrets: Map<string, string> = new Map();

      for (const serviceDef of definition.services) {
        const serviceInfo = createdServices.get(serviceDef.name);
        if (!serviceInfo) continue;

        // Check if this service already has a running deployment (retry scenario)
        const existingDeployment = await this.prisma.deployment.findFirst({
          where: {
            serviceId: serviceInfo.id,
            status: { in: ['RUNNING', 'DEPLOYING', 'PENDING'] },
          },
        });

        if (existingDeployment) {
          this.logger.log(`Service ${serviceInfo.name} already has deployment ${existingDeployment.id}, skipping`);
          continue;
        }

        // Resolve environment variables
        const { resolved: resolvedEnv, references } = await this.resolveEnvVars(
          serviceDef,
          definition,
          inputs,
          createdServices,
          generatedSecrets,
        );

        // Create environment variables in DB (delete existing and recreate to handle retries)
        // First delete any existing env vars for this service (from failed attempts)
        await this.prisma.environmentVariable.deleteMany({
          where: {
            serviceId: serviceInfo.id,
            deploymentId: null,
            isSystem: false,
          },
        });

        // Then create fresh env vars
        for (const [key, value] of Object.entries(resolvedEnv)) {
          const { encrypted, iv, authTag } = this.encryptionService.encrypt(value);
          await this.prisma.environmentVariable.create({
            data: {
              serviceId: serviceInfo.id,
              key,
              valueEncrypted: encrypted,
              valueIv: `${iv}:${authTag}`,
              isSecret: this.isSecretKey(key),
              isSystem: false,
            },
          });
        }

        // Create EnvVarReference records for service-to-service references
        // First delete existing references (for retry scenarios)
        await this.prisma.envVarReference.deleteMany({
          where: { serviceId: serviceInfo.id },
        });

        // Create new references
        for (const ref of references) {
          const sourceService = createdServices.get(ref.sourceServiceName);
          if (sourceService) {
            await this.prisma.envVarReference.create({
              data: {
                serviceId: serviceInfo.id,
                sourceServiceId: sourceService.id,
                key: ref.key,
              },
            });
            this.logger.log(`Created reference: ${serviceInfo.name}.${ref.key} -> ${ref.sourceServiceName}`);
          }
        }

        // Create volumes (check if exists first) and collect volume mounts
        const volumeMounts: Array<{ name: string; mountPath: string; claimName: string }> = [];
        if (serviceDef.volumes) {
          for (const volumeDef of serviceDef.volumes) {
            // Use k8sName for unique volume/PVC names in K8s
            const volumeName = `${serviceInfo.k8sName}-${volumeDef.name}`;
            const pvcName = `pvc-${volumeName}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

            // Create PVC in Kubernetes
            await this.deploymentManager.createPersistentVolumeClaim(
              namespace,
              pvcName,
              volumeDef.size,
              {
                'kubidu.io/workspace-id': workspaceId,
                'kubidu.io/service-id': serviceInfo.id,
              },
            );

            // Create volume record in database
            const existingVolume = await this.prisma.volume.findFirst({
              where: { projectId, name: volumeName },
            });

            if (!existingVolume) {
              await this.prisma.volume.create({
                data: {
                  projectId,
                  serviceId: serviceInfo.id,
                  templateDeploymentId,
                  name: volumeName,
                  mountPath: volumeDef.mountPath,
                  size: volumeDef.size,
                  status: 'BOUND',
                },
              });
              this.logger.log(`Created volume: ${volumeName}`);
            } else {
              // Update status if it was pending
              await this.prisma.volume.update({
                where: { id: existingVolume.id },
                data: { status: 'BOUND' },
              });
              this.logger.log(`Volume ${volumeName} already exists`);
            }

            // Collect volume mount info for deployment
            volumeMounts.push({
              name: volumeDef.name,
              mountPath: volumeDef.mountPath,
              claimName: pvcName,
            });
          }
        }

        // Create deployment
        const deployment = await this.prisma.deployment.create({
          data: {
            serviceId: serviceInfo.id,
            name: `${serviceInfo.name.toLowerCase()}-${Date.now()}`,
            status: 'PENDING',
            imageUrl: `${serviceDef.image}:${serviceDef.tag || 'latest'}`,
            imageTag: serviceDef.tag || 'latest',
            port: serviceDef.port || 8080,
            replicas: serviceDef.replicas || 1,
            cpuLimit: serviceDef.cpuLimit || '1000m',
            memoryLimit: serviceDef.memoryLimit || '512Mi',
            cpuRequest: '100m',
            memoryRequest: '128Mi',
            healthCheckPath: '/',
          },
        });

        // Deploy to K8s (use k8sName for unique K8s resource names)
        await this.deployToK8s(
          workspaceId,
          serviceInfo.id,
          deployment.id,
          serviceInfo.k8sName,
          serviceDef,
          resolvedEnv,
          namespace,
          volumeMounts,
        );

        // Create subdomain and ingress for public services
        if (serviceDef.public) {
          const fullDomain = await this.createPublicSubdomain(
            serviceInfo.id,
            serviceInfo.k8sName,
            serviceDef.port || 8080,
            namespace,
            workspaceId,
          );
          this.logger.log(`Created public subdomain: ${fullDomain}`);
        }

        // Update deployment status
        await this.prisma.deployment.update({
          where: { id: deployment.id },
          data: {
            status: 'RUNNING',
            isActive: true,
            deployedAt: new Date(),
          },
        });

        this.logger.log(`Deployed service: ${serviceInfo.name}`);
      }

      // Update template deployment status
      await this.prisma.templateDeployment.update({
        where: { id: templateDeploymentId },
        data: { status: 'DEPLOYED' },
      });

      this.logger.log(`Template deployment completed: ${templateDeploymentId}`);
    } catch (error) {
      this.logger.error(
        `Template deployment failed: ${templateDeploymentId}`,
        error.stack,
      );

      await this.prisma.templateDeployment.update({
        where: { id: templateDeploymentId },
        data: {
          status: 'FAILED',
          statusMessage: error.message,
        },
      });

      throw error;
    }
  }

  private async resolveEnvVars(
    serviceDef: TemplateServiceDef,
    definition: TemplateDefinition,
    inputs: Record<string, string>,
    createdServices: Map<string, { id: string; name: string; k8sName: string }>,
    generatedSecrets: Map<string, string>,
  ): Promise<{ resolved: Record<string, string>; references: Array<{ key: string; sourceServiceName: string }> }> {
    const resolved: Record<string, string> = {};
    const references: Array<{ key: string; sourceServiceName: string }> = [];

    if (!serviceDef.env) return { resolved, references };

    for (const [key, value] of Object.entries(serviceDef.env)) {
      // Check if this is a reference to another service
      if (typeof value === 'object' && 'ref' in value) {
        const parts = value.ref.split('.');
        const sourceServiceName = parts[0];
        references.push({ key, sourceServiceName });
      }

      resolved[key] = this.resolveEnvValue(
        key,
        value,
        serviceDef.name,
        definition,
        inputs,
        createdServices,
        generatedSecrets,
      );
    }

    return { resolved, references };
  }

  private resolveEnvValue(
    key: string,
    value: TemplateEnvValue,
    currentServiceName: string,
    definition: TemplateDefinition,
    inputs: Record<string, string>,
    createdServices: Map<string, { id: string; name: string; k8sName: string }>,
    generatedSecrets: Map<string, string>,
  ): string {
    // Static string value
    if (typeof value === 'string') {
      return value;
    }

    // Generate value
    if ('generate' in value) {
      const cacheKey = `${currentServiceName}.${key}`;
      if (generatedSecrets.has(cacheKey)) {
        return generatedSecrets.get(cacheKey)!;
      }

      let generated: string;
      if (value.generate === 'secret') {
        generated = randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
      } else if (value.generate === 'uuid') {
        generated = randomUUID();
      } else {
        generated = randomBytes(16).toString('hex');
      }

      generatedSecrets.set(cacheKey, generated);
      return generated;
    }

    // Reference to another service
    if ('ref' in value) {
      return this.resolveRef(
        value.ref,
        definition,
        createdServices,
        generatedSecrets,
        inputs,
      );
    }

    // User input
    if ('input' in value) {
      const inputKey = `${currentServiceName}.${key}`;
      if (inputs[inputKey]) {
        return inputs[inputKey];
      }
      if (value.input.default !== undefined) {
        return value.input.default;
      }
      throw new Error(`Missing required input: ${value.input.label}`);
    }

    return '';
  }

  private resolveRef(
    ref: string,
    definition: TemplateDefinition,
    createdServices: Map<string, { id: string; name: string; k8sName: string }>,
    generatedSecrets: Map<string, string>,
    inputs: Record<string, string>,
  ): string {
    // Parse ref: "mysql.env.PASSWORD" or "mysql.hostname"
    const parts = ref.split('.');
    const serviceName = parts[0];
    const refType = parts[1];

    const serviceInfo = createdServices.get(serviceName);
    if (!serviceInfo) {
      throw new Error(`Referenced service not found: ${serviceName}`);
    }

    if (refType === 'hostname') {
      // Return internal service DNS name using Kubernetes service discovery
      // Use k8sName which is unique across deployments
      return serviceInfo.k8sName;
    }

    if (refType === 'connection_url') {
      // Build a database connection URL from the service's env vars
      // Supports PostgreSQL format: postgresql+asyncpg://user:password@host:port/database
      const serviceDef = definition.services.find((s) => s.name === serviceName);
      if (!serviceDef?.env) {
        throw new Error(`Service ${serviceName} has no env vars for connection_url`);
      }

      const hostname = serviceInfo.k8sName;
      const port = serviceDef.port || 5432;

      // Try PostgreSQL env vars first
      if (serviceDef.env.POSTGRES_USER && serviceDef.env.POSTGRES_PASSWORD && serviceDef.env.POSTGRES_DB) {
        const user = this.resolveEnvValue('POSTGRES_USER', serviceDef.env.POSTGRES_USER, serviceName, definition, inputs, createdServices, generatedSecrets);
        const password = this.resolveEnvValue('POSTGRES_PASSWORD', serviceDef.env.POSTGRES_PASSWORD, serviceName, definition, inputs, createdServices, generatedSecrets);
        const db = this.resolveEnvValue('POSTGRES_DB', serviceDef.env.POSTGRES_DB, serviceName, definition, inputs, createdServices, generatedSecrets);
        return `postgresql+asyncpg://${user}:${password}@${hostname}:${port}/${db}`;
      }

      // Try MySQL env vars
      if (serviceDef.env.MYSQL_USER && serviceDef.env.MYSQL_PASSWORD && serviceDef.env.MYSQL_DATABASE) {
        const user = this.resolveEnvValue('MYSQL_USER', serviceDef.env.MYSQL_USER, serviceName, definition, inputs, createdServices, generatedSecrets);
        const password = this.resolveEnvValue('MYSQL_PASSWORD', serviceDef.env.MYSQL_PASSWORD, serviceName, definition, inputs, createdServices, generatedSecrets);
        const db = this.resolveEnvValue('MYSQL_DATABASE', serviceDef.env.MYSQL_DATABASE, serviceName, definition, inputs, createdServices, generatedSecrets);
        return `mysql://${user}:${password}@${hostname}:${port}/${db}`;
      }

      throw new Error(`Cannot build connection_url for ${serviceName}: unsupported database type`);
    }

    if (refType === 'env' && parts.length >= 3) {
      const envKey = parts.slice(2).join('.');
      // Find the service definition
      const serviceDef = definition.services.find((s) => s.name === serviceName);
      if (!serviceDef?.env?.[envKey]) {
        throw new Error(`Referenced env var not found: ${ref}`);
      }

      // Resolve the referenced value
      return this.resolveEnvValue(
        envKey,
        serviceDef.env[envKey],
        serviceName,
        definition,
        inputs,
        createdServices,
        generatedSecrets,
      );
    }

    throw new Error(`Invalid ref format: ${ref}`);
  }

  private isSecretKey(key: string): boolean {
    const secretPatterns = ['PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'CREDENTIAL'];
    return secretPatterns.some((p) => key.toUpperCase().includes(p));
  }

  private async deployToK8s(
    workspaceId: string,
    serviceId: string,
    deploymentId: string,
    serviceName: string, // Unique service name for K8s resources
    serviceDef: TemplateServiceDef,
    env: Record<string, string>,
    namespace: string,
    volumes: Array<{ name: string; mountPath: string; claimName: string }> = [],
  ): Promise<void> {
    // Create secret for env vars (using plaintext method for template deployments)
    await this.secretManager.createOrUpdateSecretFromPlaintext(
      namespace,
      `env-${deploymentId}`,
      env,
      {
        'kubidu.io/workspace-id': workspaceId,
        'kubidu.io/service-id': serviceId,
        'kubidu.io/deployment-id': deploymentId,
      },
    );

    // Create K8s deployment
    await this.deploymentManager.createDeployment({
      namespace,
      name: `dep-${deploymentId.slice(0, 8)}`,
      image: `${serviceDef.image}:${serviceDef.tag || 'latest'}`,
      replicas: serviceDef.replicas || 1,
      port: serviceDef.port || 8080,
      command: serviceDef.command,
      args: serviceDef.args,
      envSecretName: `env-${deploymentId}`,
      resources: {
        limits: {
          cpu: serviceDef.cpuLimit || '1000m',
          memory: serviceDef.memoryLimit || '512Mi',
        },
        requests: {
          cpu: '100m',
          memory: '128Mi',
        },
      },
      labels: {
        'kubidu.io/workspace-id': workspaceId,
        'kubidu.io/service-id': serviceId,
        'kubidu.io/deployment-id': deploymentId,
      },
      healthCheckPath: '/',
      volumes,
    });

    // Create K8s service with unique name for internal DNS
    // Use the unique service name so other services can reach it at {serviceName}.{namespace}.svc.cluster.local
    await this.deploymentManager.createService({
      namespace,
      name: serviceName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      port: serviceDef.port || 8080,
      selector: {
        'kubidu.io/deployment-id': deploymentId,
      },
    });
  }

  /**
   * Create a public subdomain and ingress for a template service
   * Returns the generated full domain
   */
  private async createPublicSubdomain(
    serviceId: string,
    serviceName: string,
    port: number,
    namespace: string,
    workspaceId: string,
  ): Promise<string> {
    // Generate subdomain prefix from the unique service name
    const subdomainPrefix = serviceName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // Get the domain suffix from config (e.g., "172.21.0.4.nip.io" for local dev)
    const domainSuffix = this.configService.get<string>('domain.suffix') || 'localhost';
    const fullDomain = `${subdomainPrefix}.${domainSuffix}`;

    // Update service with subdomain (the short prefix, not full domain)
    await this.prisma.service.update({
      where: { id: serviceId },
      data: {
        subdomain: subdomainPrefix,
        url: `https://${fullDomain}`,
      },
    });

    // Create ingress in Kubernetes
    await this.deploymentManager.createOrUpdateIngress(namespace, {
      deploymentId: '', // Not needed for ingress
      serviceId,
      serviceName: subdomainPrefix,
      name: subdomainPrefix,
      imageUrl: '',
      imageTag: '',
      port,
      replicas: 1,
      cpuLimit: '',
      memoryLimit: '',
      cpuRequest: '',
      memoryRequest: '',
      healthCheckPath: '/',
      subdomain: fullDomain,
    });

    this.logger.log(`Created subdomain: ${fullDomain}`);
    return fullDomain;
  }
}
