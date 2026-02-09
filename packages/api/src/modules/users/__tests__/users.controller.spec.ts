import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    emailVerified: true,
    twoFactorEnabled: false,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockApiKey = {
    id: 'apikey-123',
    name: 'Test API Key',
    prefix: 'kb_',
    lastUsedAt: new Date(),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockUsersService = {
      findById: jest.fn(),
      updateProfile: jest.fn(),
      getApiKeys: jest.fn(),
      revokeApiKey: jest.fn(),
      deleteAccount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCurrentUser', () => {
    it('should return current user profile', async () => {
      usersService.findById.mockResolvedValue(mockUser as any);

      const result = await controller.getCurrentUser({ user: { id: 'user-123' } });

      expect(result).toEqual(mockUser);
      expect(usersService.findById).toHaveBeenCalledWith('user-123');
    });
  });

  describe('updateCurrentUser', () => {
    it('should update user profile', async () => {
      const updateDto = { name: 'Updated Name' };
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      usersService.updateProfile.mockResolvedValue(updatedUser as any);

      const result = await controller.updateCurrentUser(
        { user: { id: 'user-123' } },
        updateDto,
      );

      expect(result.name).toBe('Updated Name');
      expect(usersService.updateProfile).toHaveBeenCalledWith('user-123', updateDto);
    });
  });

  describe('getApiKeys', () => {
    it('should return all API keys', async () => {
      usersService.getApiKeys.mockResolvedValue([mockApiKey] as any);

      const result = await controller.getApiKeys({ user: { id: 'user-123' } });

      expect(result).toHaveLength(1);
      expect(usersService.getApiKeys).toHaveBeenCalledWith('user-123');
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke an API key', async () => {
      usersService.revokeApiKey.mockResolvedValue(undefined);

      await controller.revokeApiKey({ user: { id: 'user-123' } }, 'apikey-123');

      expect(usersService.revokeApiKey).toHaveBeenCalledWith('user-123', 'apikey-123');
    });
  });

  describe('deleteAccount', () => {
    it('should delete user account', async () => {
      usersService.deleteAccount.mockResolvedValue(undefined);

      await controller.deleteAccount({ user: { id: 'user-123' } });

      expect(usersService.deleteAccount).toHaveBeenCalledWith('user-123');
    });
  });
});
