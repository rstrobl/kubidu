import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWorkspaceDto {
  @ApiProperty({
    description: 'The name of the workspace',
    example: 'Acme Corp Updated',
    minLength: 2,
    maxLength: 100,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'Avatar URL for the workspace',
    example: 'https://example.com/new-avatar.png',
    required: false,
  })
  @IsString()
  @IsOptional()
  avatarUrl?: string;
}
