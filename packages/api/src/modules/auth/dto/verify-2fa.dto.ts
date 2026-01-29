import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Verify2FADto {
  @ApiProperty({ example: '123456', description: '6-digit code from authenticator app' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  token: string;
}
