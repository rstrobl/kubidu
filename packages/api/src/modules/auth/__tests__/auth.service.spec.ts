import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../database/prisma.service';
import { EncryptionService } from '../../../services/encryption.service';
import { EmailService } from '../../email/email.service';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock global fetch for GitHub OAuth
const mockFetch = jest.fn();
global.fetch = mockFetch;

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
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      gdprConsent: {
        createMany: jest.fn(),
      },
      workspace: {
        create: jest.fn(),
        findUnique: jest.fn(),
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

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          'jwt.secret': 'test-secret',
          'jwt.expiresIn': '15m',
          'jwt.refreshExpiresIn': '7d',
        };
        return config[key];
      }),
    };

    const mockEmailService = {
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
      sendWelcomeEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
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

  describe('verify2FA', () => {
    it('should verify valid 2FA token and enable 2FA', async () => {
      const userWith2FASecret = {
        ...mockUser,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userWith2FASecret);

      // Mock speakeasy to return true
      const speakeasy = require('speakeasy');
      jest.spyOn(speakeasy.totp, 'verify').mockReturnValue(true);

      const result = await service.verify2FA(mockUser.id, '123456');

      expect(result).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { twoFactorEnabled: true },
      });
    });

    it('should return false for invalid 2FA token', async () => {
      const userWith2FASecret = {
        ...mockUser,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userWith2FASecret);

      const speakeasy = require('speakeasy');
      jest.spyOn(speakeasy.totp, 'verify').mockReturnValue(false);

      const result = await service.verify2FA(mockUser.id, '000000');

      expect(result).toBe(false);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when 2FA not initiated', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        twoFactorSecret: null,
      });

      await expect(service.verify2FA(mockUser.id, '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.verify2FA('nonexistent', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('generateApiKey', () => {
    it('should generate API key for user', async () => {
      const mockApiKey = {
        id: 'apikey-123',
        userId: mockUser.id,
        name: 'My API Key',
        keyHash: 'hashed-key',
        keyPrefix: 'kbdu_',
      };
      (prisma.apiKey.create as jest.Mock).mockResolvedValue(mockApiKey);

      const result = await service.generateApiKey(mockUser.id, 'My API Key');

      expect(result).toHaveProperty('apiKey');
      expect(result).toHaveProperty('key');
      expect(prisma.apiKey.create).toHaveBeenCalled();
    });

    it('should set expiration when expiresInDays is provided', async () => {
      const mockApiKey = {
        id: 'apikey-123',
        userId: mockUser.id,
        name: 'Expiring Key',
      };
      (prisma.apiKey.create as jest.Mock).mockResolvedValue(mockApiKey);

      await service.generateApiKey(mockUser.id, 'Expiring Key', 30);

      expect(prisma.apiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt: expect.any(Date),
        }),
      });
    });
  });

  describe('forgotPassword', () => {
    const mockEmailService = {
      sendPasswordResetEmail: jest.fn(),
    };

    it('should send password reset email for existing user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.forgotPassword('test@example.com');

      expect(result.message).toContain('If an account with that email exists');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          passwordResetToken: expect.any(String),
          passwordResetExpires: expect.any(Date),
        },
      });
    });

    it('should return success message for non-existent user (no email enumeration)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@example.com');

      expect(result.message).toContain('If an account with that email exists');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should return success message for inactive user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: 'SUSPENDED',
      });

      const result = await service.forgotPassword('test@example.com');

      expect(result.message).toContain('If an account with that email exists');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      const result = await service.resetPassword('valid-token', 'NewSecureP@ss123!');

      expect(result.message).toContain('Password has been reset successfully');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          passwordHash: 'new-hashed-password',
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });
    });

    it('should throw BadRequestException for invalid token', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', 'NewSecureP@ss123!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for weak password', async () => {
      await expect(
        service.resetPassword('valid-token', '123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login with 2FA', () => {
    it('should login successfully with valid 2FA code', async () => {
      const userWith2FA = {
        ...mockUser,
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userWith2FA);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const speakeasy = require('speakeasy');
      jest.spyOn(speakeasy.totp, 'verify').mockReturnValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password',
        twoFactorCode: '123456',
      });

      expect(result).toHaveProperty('accessToken');
    });

    it('should throw for invalid 2FA code', async () => {
      const userWith2FA = {
        ...mockUser,
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userWith2FA);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const speakeasy = require('speakeasy');
      jest.spyOn(speakeasy.totp, 'verify').mockReturnValue(false);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'password',
          twoFactorCode: '000000',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register edge cases', () => {
    it('should handle marketing consent', async () => {
      const registerDtoWithMarketing = {
        email: 'new@example.com',
        password: 'SecureP@ss123!',
        name: 'New User',
        gdprConsents: {
          termsOfService: true,
          privacyPolicy: true,
          marketing: true,
        },
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const createdUser = { ...mockUser, email: 'new@example.com' };
      (prisma.user.create as jest.Mock).mockResolvedValue(createdUser);
      (prisma.workspace.create as jest.Mock).mockResolvedValue({ id: 'workspace-123' });

      await service.register(registerDtoWithMarketing);

      expect(prisma.gdprConsent.createMany).toHaveBeenCalled();
    });

    it('should create workspace from user name', async () => {
      const registerDtoWithName = {
        email: 'johndoe@example.com',
        password: 'SecureP@ss123!',
        name: 'John Doe',
        gdprConsents: {
          termsOfService: true,
          privacyPolicy: true,
        },
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const createdUser = { ...mockUser, email: 'johndoe@example.com', name: 'John Doe' };
      (prisma.user.create as jest.Mock).mockResolvedValue(createdUser);
      (prisma.workspace.create as jest.Mock).mockResolvedValue({ id: 'workspace-123' });

      await service.register(registerDtoWithName);

      expect(prisma.workspace.create).toHaveBeenCalled();
    });
  });

  describe('loginWithGitHub', () => {
    beforeEach(() => {
      (mockFetch as jest.Mock).mockReset();
    });

    it('should login existing user via GitHub', async () => {
      // Mock GitHub OAuth token exchange
      (mockFetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ access_token: 'github-token' }),
        })
        // Mock GitHub user info
        .mockResolvedValueOnce({
          json: () => Promise.resolve({
            id: 12345,
            login: 'githubuser',
            name: 'GitHub User',
            email: 'test@example.com',
            avatar_url: 'https://github.com/avatar.jpg',
          }),
        })
        // Mock GitHub emails
        .mockResolvedValueOnce({
          json: () => Promise.resolve([
            { email: 'test@example.com', primary: true, verified: true },
          ]),
        });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.loginWithGitHub('valid-code');

      expect(result.isNewUser).toBe(false);
      expect(result.accessToken).toBeDefined();
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should register new user via GitHub', async () => {
      (mockFetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ access_token: 'github-token' }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({
            id: 12345,
            login: 'newuser',
            name: 'New GitHub User',
            avatar_url: 'https://github.com/avatar.jpg',
          }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve([
            { email: 'newuser@github.com', primary: true, verified: true },
          ]),
        });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('random-hash');

      const newUser = {
        id: 'new-user-id',
        email: 'newuser@github.com',
        name: 'New GitHub User',
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          user: {
            create: jest.fn().mockResolvedValue(newUser),
          },
          workspace: {
            create: jest.fn().mockResolvedValue({ id: 'workspace-123' }),
          },
        };
        return callback(tx);
      });

      const result = await service.loginWithGitHub('valid-code');

      expect(result.isNewUser).toBe(true);
      expect(result.accessToken).toBeDefined();
    });

    it('should throw UnauthorizedException for GitHub OAuth error', async () => {
      (mockFetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({
          error: 'bad_verification_code',
          error_description: 'The code passed is incorrect or expired.',
        }),
      });

      await expect(
        service.loginWithGitHub('invalid-code'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when no email from GitHub', async () => {
      (mockFetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ access_token: 'github-token' }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({
            id: 12345,
            login: 'noemailer',
            name: 'No Email User',
          }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve([]), // No emails
        });

      await expect(
        service.loginWithGitHub('valid-code'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
