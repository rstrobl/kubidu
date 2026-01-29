import { IsEmail, IsString, MinLength, IsNotEmpty, IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class GdprConsentsDto {
  @ApiProperty({ description: 'Accept terms of service' })
  @IsBoolean()
  @IsNotEmpty()
  termsOfService: boolean;

  @ApiProperty({ description: 'Accept privacy policy' })
  @IsBoolean()
  @IsNotEmpty()
  privacyPolicy: boolean;

  @ApiProperty({ description: 'Accept marketing communications', required: false })
  @IsBoolean()
  @IsOptional()
  marketing?: boolean;
}

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'StrongPassword123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: GdprConsentsDto })
  @ValidateNested()
  @Type(() => GdprConsentsDto)
  @IsNotEmpty()
  gdprConsents: GdprConsentsDto;
}
