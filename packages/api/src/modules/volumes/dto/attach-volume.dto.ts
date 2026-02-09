import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AttachVolumeDto {
  @ApiProperty({ description: 'Service ID to attach volume to', example: 'service-uuid' })
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({ 
    description: 'Mount path in the container',
    example: '/data',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\/[a-zA-Z0-9_\-\/]*$/, {
    message: 'Mount path must be an absolute path starting with /',
  })
  mountPath: string;
}
