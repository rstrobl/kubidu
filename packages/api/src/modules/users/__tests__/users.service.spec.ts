import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users.service';
import { PrismaService } from '../../../database/prisma.service';
import { UserStatus } from '@kubidu/shared';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashed-password',
    twoFactorSecret: 'secret',
    avatarUrl: null,
    status: 'ACTIVE',
    emailVerified: true,
    twoFactorEnabled: false,
    lastLoginAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockApiKey = {
    id: 'apikey-123',
    name: 'Test API Key',
    keyHash: 'hashed-key',
    userId: 'user-123',
    permissions: ['read'],
    revokedAt: null,
    expiresAt: null,
    lastUsedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      apiKey: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);
  });

  describe('findById', () => {
    it('should return user without sensitive data', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findById('user-123');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('twoFactorSecret');
      expect(result.email).toBe(mockUser.email);
    });

    it('should throw NotFoundException when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user name', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, name: 'New Name' });

      const result = await service.updateProfile('user-123', { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { name: 'New Name' },
      });
    });

    it('should update user avatar', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, avatarUrl: 'https://example.com/avatar.png' });

      const result = await service.updateProfile('user-123', { avatarUrl: 'https://example.com/avatar.png' });

      expect(result.avatarUrl).toBe('https://example.com/avatar.png');
    });

    it('should throw NotFoundException when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.updateProfile('nonexistent', { name: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('getApiKeys', () => {
    it('should return API keys without keyHash', async () => {
      (prisma.apiKey.findMany as jest.Mock).mockResolvedValue([mockApiKey]);

      const result = await service.getApiKeys('user-123');

      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('keyHash');
      expect(result[0].id).toBe(mockApiKey.id);
    });

    it('should return empty array when no API keys', async () => {
      (prisma.apiKey.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getApiKeys('user-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke API key', async () => {
      (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(mockApiKey);
      (prisma.apiKey.update as jest.Mock).mockResolvedValue({ ...mockApiKey, revokedAt: new Date() });

      await service.revokeApiKey('user-123', 'apikey-123');

      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'apikey-123' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when API key not found', async () => {
      (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.revokeApiKey('user-123', 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when API key belongs to another user', async () => {
      (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({ ...mockApiKey, userId: 'other-user' });

      await expect(service.revokeApiKey('user-123', 'apikey-123')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteAccount', () => {
    it('should soft delete user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, deletedAt: new Date(), status: UserStatus.DELETED });

      await service.deleteAccount('user-123');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          deletedAt: expect.any(Date),
          status: UserStatus.DELETED,
        },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteAccount('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
