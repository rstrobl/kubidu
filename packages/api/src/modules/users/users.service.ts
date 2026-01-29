import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { User, ApiKey } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserStatus } from '@kubidu/shared';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findById(id: string): Promise<Omit<User, 'passwordHash' | 'twoFactorSecret'>> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, twoFactorSecret, ...userWithoutSensitiveData } = user;

    return userWithoutSensitiveData;
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto): Promise<Omit<User, 'passwordHash' | 'twoFactorSecret'>> {
    await this.findById(userId);

    const updates: any = {};

    if (updateUserDto.name !== undefined) {
      updates.name = updateUserDto.name;
    }

    if (updateUserDto.avatarUrl !== undefined) {
      updates.avatarUrl = updateUserDto.avatarUrl;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updates,
    });

    const { passwordHash, twoFactorSecret, ...userWithoutSensitiveData } = user;

    return userWithoutSensitiveData;
  }

  async getApiKeys(userId: string): Promise<Omit<ApiKey, 'keyHash'>[]> {
    const apiKeys = await this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys.map(({ keyHash, ...apiKey }) => apiKey);
  }

  async revokeApiKey(userId: string, apiKeyId: string): Promise<void> {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: apiKeyId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    if (apiKey.userId !== userId) {
      throw new ForbiddenException('You do not have permission to revoke this API key');
    }

    await this.prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { revokedAt: new Date() },
    });
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.findById(userId);

    // Soft delete
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        status: UserStatus.DELETED,
      },
    });
  }
}
