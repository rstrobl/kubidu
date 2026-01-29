import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ServiceType, RepositoryProvider } from '@kubidu/shared';

export class CreateServiceDto {
  @ApiProperty({ example: 'Frontend' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ServiceType, example: ServiceType.GITHUB })
  @IsEnum(ServiceType)
  @IsNotEmpty()
  serviceType: ServiceType;

  // GitHub source fields
  @ApiProperty({
    example: 'https://github.com/username/repo',
    required: false,
  })
  @ValidateIf((o) => o.serviceType === ServiceType.GITHUB)
  @IsUrl()
  @IsNotEmpty()
  repositoryUrl?: string;

  @ApiProperty({
    enum: RepositoryProvider,
    example: RepositoryProvider.GITHUB,
    required: false,
  })
  @ValidateIf((o) => o.serviceType === ServiceType.GITHUB)
  @IsEnum(RepositoryProvider)
  @IsNotEmpty()
  repositoryProvider?: RepositoryProvider;

  @ApiProperty({ example: 'main', required: false })
  @IsString()
  @IsOptional()
  repositoryBranch?: string;

  @ApiProperty({ description: 'GitHub App installation DB ID', required: false })
  @IsString()
  @IsOptional()
  githubInstallationId?: string;

  @ApiProperty({ example: 'owner/repo', description: 'GitHub repo full name', required: false })
  @IsString()
  @IsOptional()
  githubRepoFullName?: string;

  // Docker image source fields
  @ApiProperty({ example: 'postgres:15', required: false })
  @ValidateIf((o) => o.serviceType === ServiceType.DOCKER_IMAGE)
  @IsString()
  @IsNotEmpty()
  dockerImage?: string;

  @ApiProperty({ example: 'latest', required: false })
  @IsString()
  @IsOptional()
  dockerTag?: string;

  // Default service configuration
  @ApiProperty({ example: 8080, required: false })
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  defaultPort?: number;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  defaultReplicas?: number;

  @ApiProperty({ example: '1000m', required: false })
  @IsString()
  @IsOptional()
  defaultCpuLimit?: string;

  @ApiProperty({ example: '512Mi', required: false })
  @IsString()
  @IsOptional()
  defaultMemoryLimit?: string;

  @ApiProperty({ example: '100m', required: false })
  @IsString()
  @IsOptional()
  defaultCpuRequest?: string;

  @ApiProperty({ example: '128Mi', required: false })
  @IsString()
  @IsOptional()
  defaultMemoryRequest?: string;

  @ApiProperty({ example: '/', required: false })
  @IsString()
  @IsOptional()
  defaultHealthCheckPath?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  autoDeploy?: boolean;
}
