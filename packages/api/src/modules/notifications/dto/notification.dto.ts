import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { NotificationCategory } from '@prisma/client';

export class CreateNotificationDto {
  @IsUUID('4', { each: true })
  userIds: string[];

  @IsUUID()
  workspaceId: string;

  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}

export class NotificationResponseDto {
  id: string;
  userId: string;
  workspaceId: string;
  category: NotificationCategory;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailDeploySuccess?: boolean;

  @IsOptional()
  @IsBoolean()
  emailDeployFailed?: boolean;

  @IsOptional()
  @IsBoolean()
  emailBuildFailed?: boolean;

  @IsOptional()
  @IsBoolean()
  emailDomainVerified?: boolean;

  @IsOptional()
  @IsBoolean()
  emailInvitations?: boolean;

  @IsOptional()
  @IsBoolean()
  emailRoleChanges?: boolean;
}

export class PreferencesResponseDto {
  emailDeploySuccess: boolean;
  emailDeployFailed: boolean;
  emailBuildFailed: boolean;
  emailDomainVerified: boolean;
  emailInvitations: boolean;
  emailRoleChanges: boolean;
}
