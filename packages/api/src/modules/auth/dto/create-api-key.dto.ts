import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Production API Key', description: 'Name to identify this API key' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 90, required: false, description: 'Number of days until expiration' })
  @IsNumber()
  @Min(1)
  @Max(365)
  @IsOptional()
  expiresInDays?: number;
}
