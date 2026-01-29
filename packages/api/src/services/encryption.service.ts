import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const keyHex = this.configService.get<string>('encryption.key');

    if (!keyHex || keyHex.length !== 64) {
      throw new Error(
        'ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate with: openssl rand -hex 32',
      );
    }

    this.key = Buffer.from(keyHex, 'hex');
    this.logger.log('Encryption service initialized');
  }

  /**
   * Encrypt a value using AES-256-GCM
   */
  encrypt(plaintext: string): { encrypted: string; iv: string; authTag: string } {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      };
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Failed to encrypt value');
    }
  }

  /**
   * Decrypt a value using AES-256-GCM
   */
  decrypt(encrypted: string, ivHex: string, authTagHex: string): string {
    try {
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new Error('Failed to decrypt value');
    }
  }

  /**
   * Hash a value using SHA-256 (for API keys, etc.)
   */
  hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Generate a random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Compare a plain value with a hashed value (constant-time comparison)
   */
  compareHash(plain: string, hashed: string): boolean {
    const plainHash = this.hash(plain);
    return crypto.timingSafeEqual(
      Buffer.from(plainHash, 'hex'),
      Buffer.from(hashed, 'hex'),
    );
  }
}
