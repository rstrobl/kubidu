import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'My Awesome App' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'A cool application', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
