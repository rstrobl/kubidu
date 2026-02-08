import { Injectable, Logger } from '@nestjs/common';
import { KubernetesClient } from './client';
import {
  V1Deployment,
  V1Service,
  V1Ingress,
  V1PersistentVolumeClaim,
} from '@kubernetes/client-node';

export interface DeploymentConfig {
  deploymentId: string;
  serviceId: string; // Kubidu service ID
  serviceName: string; // Kubidu service name (for stable internal DNS)
  name: string; // Deployment name (unique per deployment)
  imageUrl: string;
  imageTag: string;
  port: number;
  replicas: number;
  cpuLimit: string;
  memoryLimit: string;
  cpuRequest: string;
  memoryRequest: string;
  healthCheckPath: string;
  secretName?: string;
  subdomain?: string;
  customDomains?: string[]; // Verified custom domains
  startCommand?: string;
}

// Simplified config for template deployments
export interface SimpleDeploymentConfig {
  namespace: string;
  name: string;
  image: string;
  replicas: number;
  port: number;
  command?: string[];
  args?: string[];
  envSecretName?: string;
  resources?: {
    limits: { cpu: string; memory: string };
    requests: { cpu: string; memory: string };
  };
  labels?: Record<string, string>;
  healthCheckPath?: string;
  volumes?: Array<{
    name: string;
    mountPath: string;
    claimName: string;
  }>;
}

export interface SimpleServiceConfig {
  namespace: string;
  name: string;
  port: number;
  selector: Record<string, string>;
}

@Injectable()
export class DeploymentManager {
  private readonly logger = new Logger(DeploymentManager.name);

  constructor(private k8sClient: KubernetesClient) {}

  /**
   * Create or update a Kubernetes deployment
   */
  async createOrUpdateDeployment(
    namespace: string,
    config: DeploymentConfig,
  ): Promise<void> {
    const deployment = this.buildDeploymentManifest(namespace, config);

    try {
      await this.k8sClient.appsApi.replaceNamespacedDeployment(
        deployment.metadata.name,
        namespace,
        deployment,
      );
      this.logger.log(`Updated deployment ${config.name} in namespace ${namespace}`);
    } catch (error) {
      if (error.response?.statusCode === 404) {
        await this.k8sClient.appsApi.createNamespacedDeployment(namespace, deployment);
        this.logger.log(`Created deployment ${config.name} in namespace ${namespace}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Create or update a Kubernetes service
   */
  async createOrUpdateService(
    namespace: string,
    config: DeploymentConfig,
  ): Promise<void> {
    const service = this.buildServiceManifest(namespace, config);

    try {
      await this.k8sClient.coreApi.replaceNamespacedService(
        service.metadata.name,
        namespace,
        service,
      );
      this.logger.log(`Updated service ${config.serviceName} in namespace ${namespace}`);
    } catch (error) {
      if (error.response?.statusCode === 404) {
        await this.k8sClient.coreApi.createNamespacedService(namespace, service);
        this.logger.log(`Created service ${config.serviceName} in namespace ${namespace}`);
      } else {
        this.logger.error(`Failed to create/update service ${config.serviceName}: ${error.message}`, error.response?.body);
        throw error;
      }
    }
  }

  /**
   * Create or update an Ingress
   */
  async createOrUpdateIngress(
    namespace: string,
    config: DeploymentConfig,
  ): Promise<void> {
    const ingress = this.buildIngressManifest(namespace, config);

    try {
      await this.k8sClient.networkingApi.replaceNamespacedIngress(
        ingress.metadata.name,
        namespace,
        ingress,
      );
      this.logger.log(`Updated ingress ${config.serviceName} in namespace ${namespace}`);
    } catch (error) {
      if (error.response?.statusCode === 404) {
        await this.k8sClient.networkingApi.createNamespacedIngress(namespace, ingress);
        this.logger.log(`Created ingress ${config.serviceName} in namespace ${namespace}`);
      } else {
        this.logger.error(`Failed to create/update ingress ${config.serviceName}: ${error.message}`, error.response?.body);
        throw error;
      }
    }
  }

  /**
   * Delete a deployment and its resources
   * Note: This only deletes the deployment, not the stable service/ingress which remain
   */
  async deleteDeployment(namespace: string, deploymentName: string): Promise<void> {
    try {
      await this.k8sClient.appsApi.deleteNamespacedDeployment(deploymentName, namespace);
      // Don't delete the service/ingress - they're stable resources tied to the Kubidu service
      this.logger.log(`Deleted deployment ${deploymentName} from namespace ${namespace}`);
    } catch (error) {
      if (error.response?.statusCode !== 404) {
        throw error;
      }
    }
  }

  /**
   * Delete an ingress resource
   */
  async deleteIngress(namespace: string, ingressName: string): Promise<void> {
    try {
      await this.k8sClient.networkingApi.deleteNamespacedIngress(ingressName, namespace);
      this.logger.log(`Deleted ingress ${ingressName} from namespace ${namespace}`);
    } catch (error) {
      if (error.response?.statusCode !== 404) {
        throw error;
      }
    }
  }

  /**
   * Create a deployment (simplified interface for template deployments)
   */
  async createDeployment(config: SimpleDeploymentConfig): Promise<void> {
    const { namespace, name, image, replicas, port, command, args, envSecretName, resources, labels, healthCheckPath, volumes } = config;

    const volumeMounts = volumes?.map(v => ({
      name: v.name,
      mountPath: v.mountPath,
    })) || [];

    const volumeSpecs = volumes?.map(v => ({
      name: v.name,
      persistentVolumeClaim: {
        claimName: v.claimName,
      },
    })) || [];

    const deployment: V1Deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name,
        namespace,
        labels: {
          app: name,
          'kubidu.io/managed': 'true',
          ...labels,
        },
      },
      spec: {
        replicas,
        selector: {
          matchLabels: {
            app: name,
            ...(labels?.['kubidu.io/deployment-id'] ? { 'kubidu.io/deployment-id': labels['kubidu.io/deployment-id'] } : {}),
          },
        },
        template: {
          metadata: {
            labels: {
              app: name,
              ...labels,
            },
          },
          spec: {
            containers: [
              {
                name: name,
                image,
                ...(command ? { command } : {}),
                ...(args ? { args } : {}),
                ports: [{ containerPort: port, protocol: 'TCP' }],
                resources: resources || {
                  limits: { cpu: '1000m', memory: '512Mi' },
                  requests: { cpu: '100m', memory: '128Mi' },
                },
                ...(volumeMounts.length > 0 ? { volumeMounts } : {}),
                livenessProbe: {
                  tcpSocket: { port: port as any },
                  initialDelaySeconds: 30,
                  periodSeconds: 10,
                  timeoutSeconds: 5,
                  failureThreshold: 3,
                },
                readinessProbe: {
                  tcpSocket: { port: port as any },
                  initialDelaySeconds: 10,
                  periodSeconds: 5,
                  timeoutSeconds: 3,
                  failureThreshold: 3,
                },
                envFrom: envSecretName
                  ? [{ secretRef: { name: envSecretName } }]
                  : undefined,
                securityContext: {
                  allowPrivilegeEscalation: false,
                  readOnlyRootFilesystem: false,
                  capabilities: {
                    drop: ['ALL'],
                    add: ['CHOWN', 'SETUID', 'SETGID', 'FOWNER', 'DAC_OVERRIDE'],
                  },
                },
              },
            ],
            ...(volumeSpecs.length > 0 ? { volumes: volumeSpecs } : {}),
          },
        },
      },
    };

    try {
      await this.k8sClient.appsApi.replaceNamespacedDeployment(name, namespace, deployment);
      this.logger.log(`Updated deployment ${name} in namespace ${namespace}`);
    } catch (error) {
      if (error.response?.statusCode === 404) {
        await this.k8sClient.appsApi.createNamespacedDeployment(namespace, deployment);
        this.logger.log(`Created deployment ${name} in namespace ${namespace}`);
      } else {
        this.logger.error(`Failed to create/update deployment ${name}: ${error.message}`, error.response?.body);
        throw error;
      }
    }
  }

  /**
   * Create a service (simplified interface for template deployments)
   */
  async createService(config: SimpleServiceConfig): Promise<void> {
    const { namespace, name, port, selector } = config;

    const service: V1Service = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name,
        namespace,
        labels: {
          'kubidu.io/managed': 'true',
        },
      },
      spec: {
        type: 'ClusterIP',
        selector,
        ports: [
          {
            name: 'http',
            port: 80,
            targetPort: port as any,
            protocol: 'TCP',
          },
          ...(port !== 80 ? [{
            name: 'app-port',
            port: port,
            targetPort: port as any,
            protocol: 'TCP',
          }] : []),
        ],
      },
    };

    try {
      await this.k8sClient.coreApi.replaceNamespacedService(name, namespace, service);
      this.logger.log(`Updated service ${name} in namespace ${namespace}`);
    } catch (error) {
      if (error.response?.statusCode === 404) {
        await this.k8sClient.coreApi.createNamespacedService(namespace, service);
        this.logger.log(`Created service ${name} in namespace ${namespace}`);
      } else {
        this.logger.error(`Failed to create/update service ${name}: ${error.message}`, error.response?.body);
        throw error;
      }
    }
  }

  /**
   * Create a PersistentVolumeClaim
   */
  async createPersistentVolumeClaim(
    namespace: string,
    name: string,
    size: string,
    labels?: Record<string, string>,
  ): Promise<void> {
    const pvc: V1PersistentVolumeClaim = {
      apiVersion: 'v1',
      kind: 'PersistentVolumeClaim',
      metadata: {
        name,
        namespace,
        labels: {
          'kubidu.io/managed': 'true',
          ...labels,
        },
      },
      spec: {
        accessModes: ['ReadWriteOnce'],
        resources: {
          requests: {
            storage: size,
          },
        },
      },
    };

    try {
      // Check if PVC already exists - PVCs can't be updated
      await this.k8sClient.coreApi.readNamespacedPersistentVolumeClaim(name, namespace);
      this.logger.log(`PVC ${name} already exists in namespace ${namespace}`);
    } catch (error) {
      if (error.response?.statusCode === 404) {
        try {
          await this.k8sClient.coreApi.createNamespacedPersistentVolumeClaim(namespace, pvc);
          this.logger.log(`Created PVC ${name} in namespace ${namespace}`);
        } catch (createError) {
          this.logger.error(`Failed to create PVC ${name}: ${createError.message}`, JSON.stringify(createError.response?.body));
          throw createError;
        }
      } else {
        this.logger.error(`Failed to check PVC ${name}: ${error.message} (status: ${error.response?.statusCode})`, JSON.stringify(error.response?.body));
        throw error;
      }
    }
  }

  /**
   * Wait for deployment to be ready
   */
  async waitForRollout(
    namespace: string,
    deploymentName: string,
    timeoutMs: number = 300000,
  ): Promise<boolean> {
    const startTime = Date.now();
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 3; // Fail fast after 3 consecutive checks showing crash/error

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await this.k8sClient.appsApi.readNamespacedDeployment(
          deploymentName,
          namespace,
        );

        const deployment = response.body;
        const status = deployment.status;

        if (
          status?.readyReplicas === deployment.spec?.replicas &&
          status?.updatedReplicas === deployment.spec?.replicas
        ) {
          this.logger.log(`Deployment ${deploymentName} is ready`);
          return true;
        }

        // Check pod status to detect early failures
        try {
          const podsResponse = await this.k8sClient.coreApi.listNamespacedPod(
            namespace,
            undefined,
            undefined,
            undefined,
            undefined,
            `app=${deploymentName}`,
          );

          const pods = podsResponse.body.items;
          let hasFailedPods = false;

          for (const pod of pods) {
            const containerStatuses = pod.status?.containerStatuses || [];

            for (const cs of containerStatuses) {
              // Check for clear failure states
              if (cs.state?.waiting) {
                const reason = cs.state.waiting.reason;
                if (
                  reason === 'CrashLoopBackOff' ||
                  reason === 'ImagePullBackOff' ||
                  reason === 'ErrImagePull' ||
                  reason === 'InvalidImageName'
                ) {
                  hasFailedPods = true;
                  this.logger.warn(
                    `Pod ${pod.metadata?.name} container ${cs.name} in failure state: ${reason}`,
                  );
                }
              }

              // Check for terminated containers with non-zero exit codes
              if (cs.state?.terminated && cs.state.terminated.exitCode !== 0) {
                hasFailedPods = true;
                this.logger.warn(
                  `Pod ${pod.metadata?.name} container ${cs.name} terminated with exit code ${cs.state.terminated.exitCode}`,
                );
              }
            }
          }

          if (hasFailedPods) {
            consecutiveFailures++;
            this.logger.warn(
              `Deployment ${deploymentName} has failing pods (${consecutiveFailures}/${maxConsecutiveFailures} checks)`,
            );

            if (consecutiveFailures >= maxConsecutiveFailures) {
              this.logger.error(
                `Deployment ${deploymentName} failed: pods in error state for ${consecutiveFailures} consecutive checks`,
              );
              return false;
            }
          } else {
            consecutiveFailures = 0; // Reset counter if pods are no longer failing
          }
        } catch (podError) {
          this.logger.warn(`Error checking pod status: ${podError.message}`);
        }

        this.logger.log(
          `Waiting for deployment ${deploymentName}: ${status?.readyReplicas || 0}/${deployment.spec?.replicas || 0} ready`,
        );
      } catch (error) {
        this.logger.warn(`Error checking deployment status: ${error.message}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    this.logger.warn(`Deployment ${deploymentName} did not become ready within timeout`);
    return false;
  }

  /**
   * Get logs from pods belonging to a deployment
   */
  async getPodLogs(
    namespace: string,
    deploymentId: string,
    tail?: number,
  ): Promise<string> {
    try {
      // Find pods by deployment-id label (works for both regular and template deployments)
      const podsResponse = await this.k8sClient.coreApi.listNamespacedPod(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `kubidu.io/deployment-id=${deploymentId}`,
      );

      const pods = podsResponse.body.items;

      if (pods.length === 0) {
        this.logger.warn(`No pods found for deployment-id ${deploymentId} in namespace ${namespace}`);
        return 'No pods found for this deployment';
      }

      // Get logs from all pods
      const allLogs: string[] = [];

      for (const pod of pods) {
        const podName = pod.metadata?.name;
        if (!podName) continue;

        const podStatus = pod.status?.phase || 'Unknown';
        const containerStatuses = pod.status?.containerStatuses || [];

        // Check if we should try to get previous container logs
        const hasFailedContainer = containerStatuses.some(
          cs => cs.state?.terminated || cs.restartCount > 0
        );

        try {
          let logResponse;
          let logsSource = 'current';

          // Try to get current logs first
          try {
            logResponse = await this.k8sClient.coreApi.readNamespacedPodLog(
              podName,
              namespace,
              undefined, // container (undefined means default container)
              false, // follow
              undefined, // insecureSkipTLSVerifyBackend
              undefined, // limitBytes
              undefined, // pretty
              false, // previous - get current container logs
              undefined, // sinceSeconds
              tail, // tailLines
              undefined, // timestamps
            );
          } catch (currentLogError) {
            // If current logs fail and container has failed, try previous logs
            if (hasFailedContainer) {
              this.logger.log(`Current logs unavailable for ${podName}, trying previous container logs`);
              try {
                logResponse = await this.k8sClient.coreApi.readNamespacedPodLog(
                  podName,
                  namespace,
                  undefined,
                  false,
                  undefined,
                  undefined,
                  undefined,
                  true, // previous - get logs from previous (crashed) container
                  undefined,
                  tail,
                  undefined,
                );
                logsSource = 'previous';
              } catch (prevLogError) {
                throw currentLogError; // Re-throw original error
              }
            } else {
              throw currentLogError;
            }
          }

          const statusInfo = containerStatuses
            .map((cs) => {
              const restartInfo = cs.restartCount > 0 ? ` (restarts: ${cs.restartCount})` : '';
              if (cs.state?.waiting) {
                return `${cs.name}: Waiting - ${cs.state.waiting.reason}${restartInfo}`;
              } else if (cs.state?.terminated) {
                return `${cs.name}: Terminated - ${cs.state.terminated.reason} (exit code: ${cs.state.terminated.exitCode})${restartInfo}`;
              } else if (cs.state?.running) {
                return `${cs.name}: Running${restartInfo}`;
              }
              return `${cs.name}: Unknown${restartInfo}`;
            })
            .join(', ');

          const logsHeader = logsSource === 'previous'
            ? `=== Pod: ${podName} (Status: ${podStatus}) - PREVIOUS CONTAINER LOGS ===\n`
            : `=== Pod: ${podName} (Status: ${podStatus}) ===\n`;

          allLogs.push(
            logsHeader +
            `Container Status: ${statusInfo}\n` +
            `${logResponse.body || '(No logs available)'}\n`,
          );
        } catch (error) {
          this.logger.warn(`Failed to get logs for pod ${podName}: ${error.message}`);

          // Try to get pod status even if logs fail
          const statusInfo = containerStatuses
            .map((cs) => {
              const restartInfo = cs.restartCount > 0 ? ` (restarts: ${cs.restartCount})` : '';
              if (cs.state?.waiting) {
                return `${cs.name}: Waiting - ${cs.state.waiting.reason} (${cs.state.waiting.message || 'no message'})${restartInfo}`;
              } else if (cs.state?.terminated) {
                return `${cs.name}: Terminated - ${cs.state.terminated.reason} (exit code: ${cs.state.terminated.exitCode}, message: ${cs.state.terminated.message || 'no message'})${restartInfo}`;
              } else if (cs.state?.running) {
                return `${cs.name}: Running${restartInfo}`;
              }
              return `${cs.name}: Unknown${restartInfo}`;
            })
            .join('\n');

          allLogs.push(
            `=== Pod: ${podName} (Status: ${podStatus}) ===\n` +
            `Container Status:\n${statusInfo}\n` +
            `Error fetching logs: ${error.message}\n`,
          );
        }
      }

      return allLogs.join('\n');
    } catch (error) {
      this.logger.error(`Failed to get pod logs for deployment ${deploymentId}: ${error.message}`);
      return `Error retrieving logs: ${error.message}`;
    }
  }

  /**
   * Get pod status information for a deployment
   */
  async getPodStatus(
    namespace: string,
    deploymentName: string,
  ): Promise<any> {
    try {
      // Find pods by label selector
      const podsResponse = await this.k8sClient.coreApi.listNamespacedPod(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `app=${deploymentName}`,
      );

      const pods = podsResponse.body.items;

      if (pods.length === 0) {
        return {
          podCount: 0,
          pods: [],
          overallStatus: 'NO_PODS',
        };
      }

      const podStatuses = pods.map((pod) => {
        const podName = pod.metadata?.name || 'unknown';
        const podPhase = pod.status?.phase || 'Unknown';
        const containerStatuses = pod.status?.containerStatuses || [];

        const containers = containerStatuses.map((cs) => {
          let state = 'unknown';
          let reason = '';
          let message = '';
          let exitCode: number | undefined;

          if (cs.state?.waiting) {
            state = 'waiting';
            reason = cs.state.waiting.reason || '';
            message = cs.state.waiting.message || '';
          } else if (cs.state?.terminated) {
            state = 'terminated';
            reason = cs.state.terminated.reason || '';
            message = cs.state.terminated.message || '';
            exitCode = cs.state.terminated.exitCode;
          } else if (cs.state?.running) {
            state = 'running';
          }

          return {
            name: cs.name,
            ready: cs.ready || false,
            restartCount: cs.restartCount || 0,
            state,
            reason,
            message,
            exitCode,
          };
        });

        return {
          name: podName,
          phase: podPhase,
          containers,
        };
      });

      // Determine overall status
      let overallStatus = 'RUNNING';
      for (const podStatus of podStatuses) {
        if (podStatus.phase !== 'Running') {
          overallStatus = podStatus.phase.toUpperCase();
          break;
        }
        for (const container of podStatus.containers) {
          if (container.state === 'waiting' &&
              (container.reason === 'CrashLoopBackOff' ||
               container.reason === 'ImagePullBackOff' ||
               container.reason === 'ErrImagePull')) {
            overallStatus = 'FAILING';
            break;
          }
        }
      }

      return {
        podCount: pods.length,
        pods: podStatuses,
        overallStatus,
      };
    } catch (error) {
      this.logger.error(`Failed to get pod status for deployment ${deploymentName}: ${error.message}`);
      return {
        podCount: 0,
        pods: [],
        overallStatus: 'ERROR',
        error: error.message,
      };
    }
  }

  /**
   * Build deployment manifest
   */
  private buildDeploymentManifest(
    namespace: string,
    config: DeploymentConfig,
  ): V1Deployment {
    return {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: config.name,
        namespace,
        labels: {
          app: config.name,
          'kubidu.io/deployment-id': config.deploymentId,
          'kubidu.io/managed': 'true',
        },
      },
      spec: {
        replicas: config.replicas,
        selector: {
          matchLabels: {
            app: config.name,
          },
        },
        template: {
          metadata: {
            labels: {
              app: config.name,
              'kubidu.io/deployment-id': config.deploymentId,
            },
          },
          spec: {
            containers: [
              {
                name: config.name,
                image: `${config.imageUrl}:${config.imageTag}`,
                ...(config.startCommand ? { command: ['/bin/sh', '-c', config.startCommand] } : {}),
                ports: [
                  {
                    containerPort: config.port,
                    protocol: 'TCP',
                  },
                ],
                resources: {
                  limits: {
                    cpu: config.cpuLimit,
                    memory: config.memoryLimit,
                  },
                  requests: {
                    cpu: config.cpuRequest,
                    memory: config.memoryRequest,
                  },
                },
                livenessProbe: {
                  tcpSocket: {
                    port: config.port,
                  },
                  initialDelaySeconds: 30,
                  periodSeconds: 10,
                  timeoutSeconds: 5,
                  failureThreshold: 3,
                },
                readinessProbe: {
                  tcpSocket: {
                    port: config.port,
                  },
                  initialDelaySeconds: 10,
                  periodSeconds: 5,
                  timeoutSeconds: 3,
                  failureThreshold: 3,
                },
                envFrom: config.secretName
                  ? [
                      {
                        secretRef: {
                          name: config.secretName,
                        },
                      },
                    ]
                  : undefined,
                securityContext: {
                  allowPrivilegeEscalation: false,
                  readOnlyRootFilesystem: false,
                  capabilities: {
                    drop: ['ALL'],
                    add: ['CHOWN', 'SETUID', 'SETGID', 'FOWNER', 'DAC_OVERRIDE'],
                  },
                },
              },
            ],
          },
        },
      },
    };
  }

  /**
   * Build service manifest
   */
  private buildServiceManifest(namespace: string, config: DeploymentConfig): V1Service {
    // Create a stable internal service named after the Kubidu service
    // This service always exists and its selector is updated to point to the active deployment

    // Build ports array - avoid duplicates when app port is 80
    const ports = [
      {
        name: 'http',
        port: 80,
        targetPort: config.port as any,
        protocol: 'TCP',
      },
    ];

    // Only add app-port if it's different from 80 to avoid duplicates
    if (config.port !== 80) {
      ports.push({
        name: 'app-port',
        port: config.port,
        targetPort: config.port as any,
        protocol: 'TCP',
      });
    }

    return {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: config.serviceName, // Stable name for internal DNS
        namespace,
        labels: {
          'kubidu.io/service-id': config.serviceId,
          'kubidu.io/service-name': config.serviceName,
          'kubidu.io/managed': 'true',
        },
      },
      spec: {
        type: 'ClusterIP',
        selector: {
          'kubidu.io/deployment-id': config.deploymentId, // Points to the specific deployment
        },
        ports,
      },
    };
  }

  /**
   * Build ingress manifest
   */
  private buildIngressManifest(
    namespace: string,
    config: DeploymentConfig,
  ): V1Ingress {
    // Build rules for all domains (subdomain + custom domains), filtering out undefined
    const allDomains = [config.subdomain, ...(config.customDomains || [])].filter(Boolean) as string[];

    const rules = allDomains.map(host => ({
      host,
      http: {
        paths: [
          {
            path: '/',
            pathType: 'Prefix' as const,
            backend: {
              service: {
                name: config.serviceName, // Use stable service name
                port: {
                  number: 80,
                },
              },
            },
          },
        ],
      },
    }));

    const annotations: Record<string, string> = {
      'kubernetes.io/ingress.class': 'traefik',
      'traefik.ingress.kubernetes.io/router.tls': 'true', // Enable TLS for all domains
    };

    // Add cert-manager annotations for custom domains (for automatic SSL with Let's Encrypt)
    if (config.customDomains && config.customDomains.length > 0) {
      annotations['cert-manager.io/cluster-issuer'] = 'letsencrypt-prod';
      annotations['traefik.ingress.kubernetes.io/redirect-entry-point'] = 'https';
    }

    return {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      metadata: {
        name: config.serviceName, // Use stable service name for ingress
        namespace,
        labels: {
          'kubidu.io/service-id': config.serviceId,
          'kubidu.io/service-name': config.serviceName,
          'kubidu.io/managed': 'true',
        },
        annotations,
      },
      spec: {
        rules,
        // Add TLS configuration for all domains (traefik uses default cert for nip.io, cert-manager for custom domains)
        ...(allDomains.length > 0 && {
          tls: [
            {
              hosts: allDomains,
              // Only specify secretName for custom domains (cert-manager will create it)
              ...(config.customDomains && config.customDomains.length > 0 && {
                secretName: `${config.serviceName}-tls`,
              }),
            },
          ],
        }),
      },
    };
  }
}
