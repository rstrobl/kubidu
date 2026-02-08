import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetEnvironmentVariableDto {
  @ApiProperty({ description: 'Service ID (set at service level)', required: false })
  @IsUUID()
  @IsOptional()
  serviceId?: string;

  @ApiProperty({ description: 'Deployment ID (set at deployment level)', required: false })
  @IsUUID()
  @IsOptional()
  deploymentId?: string;

  @ApiProperty({ example: 'API_KEY' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: 'secret-value-123' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiProperty({ example: true, required: false, description: 'Mark as secret (hidden in UI)' })
  @IsBoolean()
  @IsOptional()
  isSecret?: boolean;

  @ApiProperty({ example: false, required: false, description: 'Share this variable with other services in the project' })
  @IsBoolean()
  @IsOptional()
  isShared?: boolean;
}
