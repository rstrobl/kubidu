import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KubernetesClient } from './client';
import { V1Secret } from '@kubernetes/client-node';
import * as crypto from 'crypto';

@Injectable()
export class SecretManager {
  private readonly logger = new Logger(SecretManager.name);
  private readonly encryptionKey: Buffer;

  constructor(
    private k8sClient: KubernetesClient,
    private configService: ConfigService,
  ) {
    const key = this.configService.get<string>('encryption.key');
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    this.encryptionKey = Buffer.from(key, 'hex');
  }

  /**
   * Create or update a secret with environment variables
   */
  async createOrUpdateSecret(
    namespace: string,
    secretName: string,
    envVars: Array<{ key: string; valueEncrypted: string; valueIv: string }>,
  ): Promise<void> {
    // Decrypt environment variables
    const decryptedData: Record<string, string> = {};
    for (const envVar of envVars) {
      decryptedData[envVar.key] = this.decrypt(envVar.valueEncrypted, envVar.valueIv);
    }

    const secret: V1Secret = {
      metadata: {
        name: secretName,
        namespace,
        labels: {
          'kubidu.io/managed': 'true',
        },
      },
      type: 'Opaque',
      stringData: decryptedData,
    };

    try {
      // Try to update existing secret
      await this.k8sClient.coreApi.replaceNamespacedSecret(secretName, namespace, secret);
      this.logger.log(`Updated secret ${secretName} in namespace ${namespace}`);
    } catch (error) {
      if (error.response?.statusCode === 404) {
        // Create new secret
        await this.k8sClient.coreApi.createNamespacedSecret(namespace, secret);
        this.logger.log(`Created secret ${secretName} in namespace ${namespace}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Delete a secret
   */
  async deleteSecret(namespace: string, secretName: string): Promise<void> {
    try {
      await this.k8sClient.coreApi.deleteNamespacedSecret(secretName, namespace);
      this.logger.log(`Deleted secret ${secretName} from namespace ${namespace}`);
    } catch (error) {
      if (error.response?.statusCode !== 404) {
        throw error;
      }
    }
  }

  /**
   * Decrypt an environment variable value
   */
  private decrypt(encrypted: string, ivWithAuthTag: string): string {
    // The API stores IV and authTag together as "iv:authTag"
    const [ivHex, authTagHex] = ivWithAuthTag.split(':');

    if (!ivHex || !authTagHex) {
      throw new Error('Invalid IV format. Expected "iv:authTag"');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      iv,
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
