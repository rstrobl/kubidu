import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DeployConsumer } from '../queue-consumers/deploy.consumer';
import { TemplateConsumer } from '../queue-consumers/template.consumer';
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
    BullModule.registerQueue({
      name: 'template',
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
    TemplateConsumer,
  ],
  exports: [KubernetesClient, NamespaceManager, SecretManager, DeploymentManager],
})
export class DeployModule {}
