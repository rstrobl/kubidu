import { IsNumber, IsOptional, IsEnum, IsString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DeploymentStatus } from '@kubidu/shared';

export class UpdateDeploymentDto {
  @ApiProperty({ example: 3, required: false, description: 'Number of replicas (scale)' })
  @IsNumber()
  @Min(0)
  @Max(10)
  @IsOptional()
  replicas?: number;

  @ApiProperty({ enum: DeploymentStatus, required: false })
  @IsEnum(DeploymentStatus)
  @IsOptional()
  status?: DeploymentStatus;

  @ApiProperty({ example: 'v1.2.3', required: false, description: 'Docker image tag' })
  @IsString()
  @IsOptional()
  imageTag?: string;
}
