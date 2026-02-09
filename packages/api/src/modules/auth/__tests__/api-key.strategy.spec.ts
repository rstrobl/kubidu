import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ApiKeyStrategy } from '../strategies/api-key.strategy';
import { AuthService } from '../auth.service';
import { Request } from 'express';

describe('ApiKeyStrategy', () => {
  let strategy: ApiKeyStrategy;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(async () => {
    const mockAuthService = {
      validateApiKey: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyStrategy,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    strategy = module.get<ApiKeyStrategy>(ApiKeyStrategy);
    authService = module.get(AuthService);
  });

  describe('validate', () => {
    it('should return user when API key is valid', async () => {
      (authService.validateApiKey as jest.Mock).mockResolvedValue(mockUser);

      const mockRequest = {
        headers: {
          'x-api-key': 'valid-api-key-123',
        },
      } as unknown as Request;

      const result = await strategy.validate(mockRequest);

      expect(result).toEqual(mockUser);
      expect(authService.validateApiKey).toHaveBeenCalledWith('valid-api-key-123');
    });

    it('should throw UnauthorizedException when API key is missing', async () => {
      const mockRequest = {
        headers: {},
      } as unknown as Request;

      await expect(
        strategy.validate(mockRequest),
      ).rejects.toThrow(new UnauthorizedException('API key missing'));
    });

    it('should throw UnauthorizedException when API key is invalid', async () => {
      (authService.validateApiKey as jest.Mock).mockResolvedValue(null);

      const mockRequest = {
        headers: {
          'x-api-key': 'invalid-api-key',
        },
      } as unknown as Request;

      await expect(
        strategy.validate(mockRequest),
      ).rejects.toThrow(new UnauthorizedException('Invalid API key'));
    });

    it('should throw UnauthorizedException when API key is undefined', async () => {
      const mockRequest = {
        headers: {
          'x-api-key': undefined,
        },
      } as unknown as Request;

      await expect(
        strategy.validate(mockRequest),
      ).rejects.toThrow(new UnauthorizedException('API key missing'));
    });
  });
});
