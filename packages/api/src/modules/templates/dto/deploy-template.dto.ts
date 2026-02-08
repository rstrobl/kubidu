import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';

export class DeployTemplateDto {
  @IsUUID()
  templateId: string;

  @IsOptional()
  @IsObject()
  inputs?: Record<string, string>;
}
