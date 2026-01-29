import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ServiceStatus } from '@kubidu/shared';

export class UpdateServiceDto {
  @ApiProperty({ example: 'Frontend', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'myapp', required: false, description: 'User-friendly subdomain (lowercase, alphanumeric, hyphens only)' })
  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/, {
    message: 'Subdomain must be lowercase alphanumeric with hyphens, start and end with alphanumeric (max 63 chars)',
  })
  subdomain?: string;

  @ApiProperty({ example: 'main', required: false })
  @IsString()
  @IsOptional()
  repositoryBranch?: string;

  @ApiProperty({ example: 'latest', required: false })
  @IsString()
  @IsOptional()
  dockerTag?: string;

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

  @ApiProperty({ example: 'prefect server start', required: false, description: 'Custom start command to override container CMD/ENTRYPOINT' })
  @IsString()
  @IsOptional()
  defaultStartCommand?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  autoDeploy?: boolean;

  @ApiProperty({ enum: ServiceStatus, required: false })
  @IsEnum(ServiceStatus)
  @IsOptional()
  status?: ServiceStatus;
}
