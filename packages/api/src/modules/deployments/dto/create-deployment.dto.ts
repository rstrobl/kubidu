import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeploymentDto {
  @ApiProperty({ description: 'Service ID to deploy' })
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({ example: 1, required: false, description: 'Number of replicas' })
  @IsNumber()
  @Min(0)
  @Max(10)
  @IsOptional()
  replicas?: number;

  @ApiProperty({ example: '1000m', required: false, description: 'CPU limit' })
  @IsString()
  @IsOptional()
  cpuLimit?: string;

  @ApiProperty({ example: '512Mi', required: false, description: 'Memory limit' })
  @IsString()
  @IsOptional()
  memoryLimit?: string;

  @ApiProperty({ example: '100m', required: false, description: 'CPU request' })
  @IsString()
  @IsOptional()
  cpuRequest?: string;

  @ApiProperty({ example: '128Mi', required: false, description: 'Memory request' })
  @IsString()
  @IsOptional()
  memoryRequest?: string;

  @ApiProperty({ example: 8080, required: false, description: 'Container port' })
  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  port?: number;

  @ApiProperty({ example: '/health', required: false, description: 'Health check path' })
  @IsString()
  @IsOptional()
  healthCheckPath?: string;
}
