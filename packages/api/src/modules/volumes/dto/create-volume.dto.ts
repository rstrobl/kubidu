import { IsString, IsNotEmpty, IsOptional, IsEnum, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VolumeSize {
  SMALL = '1Gi',
  MEDIUM = '5Gi',
  LARGE = '10Gi',
  XLARGE = '20Gi',
  XXLARGE = '50Gi',
}

export class CreateVolumeDto {
  @ApiProperty({ description: 'Volume name', example: 'my-data-volume' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(63)
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, {
    message: 'Name must be lowercase alphanumeric with hyphens, starting and ending with alphanumeric',
  })
  name: string;

  @ApiProperty({ 
    description: 'Volume size', 
    enum: VolumeSize,
    example: VolumeSize.MEDIUM,
  })
  @IsEnum(VolumeSize, { message: 'Size must be one of: 1Gi, 5Gi, 10Gi, 20Gi, 50Gi' })
  size: VolumeSize;

  @ApiPropertyOptional({ 
    description: 'Default mount path when attached to a service',
    example: '/data',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\/[a-zA-Z0-9_\-\/]*$/, {
    message: 'Mount path must be an absolute path starting with /',
  })
  mountPath?: string;
}
