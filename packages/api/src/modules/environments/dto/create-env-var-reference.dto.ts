import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEnvVarReferenceDto {
  @ApiProperty({ description: 'ID of the consuming service' })
  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({ description: 'ID of the source (provider) service' })
  @IsUUID()
  @IsNotEmpty()
  sourceServiceId: string;

  @ApiProperty({ description: 'Key of the source environment variable' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ description: 'Optional alias to inject the variable under a different key name', required: false })
  @IsString()
  @IsOptional()
  alias?: string;
}
