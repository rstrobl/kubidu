import { IsString, IsOptional, IsEnum, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VolumeSize } from './create-volume.dto';

export class UpdateVolumeDto {
  @ApiPropertyOptional({ description: 'Volume name', example: 'my-data-volume' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(63)
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, {
    message: 'Name must be lowercase alphanumeric with hyphens, starting and ending with alphanumeric',
  })
  name?: string;

  @ApiPropertyOptional({ 
    description: 'Volume size (can only increase)', 
    enum: VolumeSize,
    example: VolumeSize.LARGE,
  })
  @IsOptional()
  @IsEnum(VolumeSize, { message: 'Size must be one of: 1Gi, 5Gi, 10Gi, 20Gi, 50Gi' })
  size?: VolumeSize;
}
