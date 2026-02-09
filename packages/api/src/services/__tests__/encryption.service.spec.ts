import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  const validKey = 'a'.repeat(64); // 64 hex chars = 32 bytes

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'encryption.key') return validKey;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should throw error when encryption key is missing', () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      expect(() => {
        new EncryptionService(mockConfigService as any);
      }).toThrow('ENCRYPTION_KEY must be 64 hex characters');
    });

    it('should throw error when encryption key is too short', () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('abc'),
      };

      expect(() => {
        new EncryptionService(mockConfigService as any);
      }).toThrow('ENCRYPTION_KEY must be 64 hex characters');
    });
  });

  describe('encrypt', () => {
    it('should encrypt a plaintext value', () => {
      const plaintext = 'my secret value';
      const result = service.encrypt(plaintext);

      expect(result).toHaveProperty('encrypted');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');
      expect(result.encrypted).not.toBe(plaintext);
      expect(result.iv.length).toBe(32); // 16 bytes in hex
      expect(result.authTag.length).toBe(32); // 16 bytes in hex
    });

    it('should produce different results for same plaintext', () => {
      const plaintext = 'my secret value';
      const result1 = service.encrypt(plaintext);
      const result2 = service.encrypt(plaintext);

      expect(result1.encrypted).not.toBe(result2.encrypted);
      expect(result1.iv).not.toBe(result2.iv);
    });
  });

  describe('decrypt', () => {
    it('should decrypt an encrypted value', () => {
      const plaintext = 'my secret value';
      const { encrypted, iv, authTag } = service.encrypt(plaintext);

      const decrypted = service.decrypt(encrypted, iv, authTag);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error with invalid auth tag', () => {
      const { encrypted, iv } = service.encrypt('my secret value');
      const invalidAuthTag = 'b'.repeat(32);

      expect(() => {
        service.decrypt(encrypted, iv, invalidAuthTag);
      }).toThrow('Failed to decrypt value');
    });

    it('should throw error with invalid IV', () => {
      const { encrypted, authTag } = service.encrypt('my secret value');
      const invalidIv = 'c'.repeat(32);

      expect(() => {
        service.decrypt(encrypted, invalidIv, authTag);
      }).toThrow('Failed to decrypt value');
    });
  });

  describe('hash', () => {
    it('should hash a value using SHA-256', () => {
      const value = 'test-api-key';
      const hash = service.hash(value);

      expect(hash).toHaveLength(64); // SHA-256 produces 32 bytes = 64 hex chars
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should produce same hash for same value', () => {
      const value = 'test-api-key';
      const hash1 = service.hash(value);
      const hash2 = service.hash(value);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different values', () => {
      const hash1 = service.hash('value1');
      const hash2 = service.hash('value2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateToken', () => {
    it('should generate a random token with default length', () => {
      const token = service.generateToken();

      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate a random token with custom length', () => {
      const token = service.generateToken(16);

      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = service.generateToken();
      const token2 = service.generateToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('compareHash', () => {
    it('should return true for matching values', () => {
      const plain = 'my-api-key';
      const hashed = service.hash(plain);

      expect(service.compareHash(plain, hashed)).toBe(true);
    });

    it('should return false for non-matching values', () => {
      const hashed = service.hash('original-key');

      expect(service.compareHash('different-key', hashed)).toBe(false);
    });
  });
});
