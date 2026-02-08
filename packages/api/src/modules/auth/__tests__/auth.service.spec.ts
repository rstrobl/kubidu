import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../database/prisma.service';
import { EncryptionService } from '../../../services/encryption.service';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let encryptionService: jest.Mocked<EncryptionService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashed-password',
    status: 'ACTIVE',
    emailVerified: true,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      gdprConsent: {
        createMany: jest.fn(),
      },
      workspace: {
        create: jest.fn(),
      },
      workspaceMember: {
        create: jest.fn(),
      },
      subscription: {
        create: jest.fn(),
      },
      apiKey: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
      verify: jest.fn(),
    };

    const mockEncryptionService = {
      hash: jest.fn().mockReturnValue('hashed-key'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EncryptionService, useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
    encryptionService = module.get(EncryptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'SecureP@ss123!',
      name: 'New User',
      gdprConsents: {
        termsOfService: true,
        privacyPolicy: true,
      },
    };

    it('should successfully register a new user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const createdUser = { ...mockUser, email: registerDto.email, name: registerDto.name };
      (prisma.user.create as jest.Mock).mockResolvedValue(createdUser);
      (prisma.workspace.create as jest.Mock).mockResolvedValue({ id: 'workspace-123' });

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(registerDto.email.toLowerCase());
    });

    it('should throw ConflictException if user already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if password is weak', async () => {
      const weakPasswordDto = {
        ...registerDto,
        password: '123',
      };

      await expect(service.register(weakPasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if GDPR consents are missing', async () => {
      const noConsentDto = {
        email: 'test@example.com',
        password: 'SecureP@ss123!',
        name: 'Test',
        gdprConsents: {
          termsOfService: false,
          privacyPolicy: true,
        },
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.register(noConsentDto)).rejects.toThrow(BadRequestException);
    });

    it('should normalize email to lowercase', async () => {
      const upperCaseEmailDto = {
        ...registerDto,
        email: 'TEST@EXAMPLE.COM',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const createdUser = { ...mockUser, email: 'test@example.com' };
      (prisma.user.create as jest.Mock).mockResolvedValue(createdUser);
      (prisma.workspace.create as jest.Mock).mockResolvedValue({ id: 'workspace-123' });

      await service.register(upperCaseEmailDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.validateUser('nonexistent@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is not active', async () => {
      const inactiveUser = { ...mockUser, status: 'SUSPENDED' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(inactiveUser);

      await expect(
        service.validateUser('test@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return auth response for valid credentials', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should require 2FA code when 2FA is enabled', async () => {
      const userWith2FA = {
        ...mockUser,
        twoFactorEnabled: true,
        twoFactorSecret: 'secret',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userWith2FA);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({ email: 'test@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should return new auth response for valid refresh token', async () => {
      jwtService.verify.mockReturnValue({ sub: mockUser.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is not active', async () => {
      const inactiveUser = { ...mockUser, status: 'SUSPENDED' };
      jwtService.verify.mockReturnValue({ sub: inactiveUser.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(inactiveUser);

      await expect(service.refreshToken('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateApiKey', () => {
    const mockApiKey = {
      id: 'apikey-123',
      keyHash: 'hashed-key',
      revokedAt: null,
      expiresAt: null,
      user: mockUser,
    };

    it('should return user for valid API key', async () => {
      (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue(mockApiKey);

      const result = await service.validateApiKey('valid-api-key');

      expect(result).toEqual(mockUser);
      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: mockApiKey.id },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException for invalid API key', async () => {
      (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.validateApiKey('invalid-key')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for revoked API key', async () => {
      const revokedKey = { ...mockApiKey, revokedAt: new Date() };
      (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue(revokedKey);

      await expect(service.validateApiKey('revoked-key')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired API key', async () => {
      const expiredKey = {
        ...mockApiKey,
        expiresAt: new Date(Date.now() - 1000),
      };
      (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue(expiredKey);

      await expect(service.validateApiKey('expired-key')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('enable2FA', () => {
    it('should generate 2FA secret and QR code', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.enable2FA(mockUser.id);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.enable2FA('nonexistent-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('disable2FA', () => {
    it('should disable 2FA for user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await service.disable2FA(mockUser.id);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
        },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.disable2FA('nonexistent-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
