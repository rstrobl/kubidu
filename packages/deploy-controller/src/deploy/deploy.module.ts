import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DeployConsumer } from '../queue-consumers/deploy.consumer';
import { KubernetesClient } from '../k8s/client';
import { NamespaceManager } from '../k8s/namespace.manager';
import { SecretManager } from '../k8s/secret.manager';
import { DeploymentManager } from '../k8s/deployment.manager';
import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../services/encryption.service';
import { LogsController } from '../logs/logs.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'deploy',
    }),
  ],
  controllers: [LogsController],
  providers: [
    PrismaService,
    EncryptionService,
    KubernetesClient,
    NamespaceManager,
    SecretManager,
    DeploymentManager,
    DeployConsumer,
  ],
  exports: [KubernetesClient, NamespaceManager, SecretManager, DeploymentManager],
})
export class DeployModule {}
