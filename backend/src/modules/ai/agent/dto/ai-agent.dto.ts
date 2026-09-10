import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Admin-facing settings only. Model, temperature, retrieval thresholds, tool and
 * CRM allow-lists, and the service account are deliberately absent: they are
 * engineering configuration, and a retrieval threshold edited from a settings
 * form is a silent way to stop the agent answering. The global ValidationPipe
 * runs with forbidNonWhitelisted, so sending one of them is rejected outright.
 */
export class UpdateAiAgentDto {
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;

  @IsOptional() @IsBoolean() enabled?: boolean;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  systemInstructions?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) tone?: string;

  @IsOptional() @IsIn(['ar', 'en']) responseLanguage?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(120)
  maxResponseChars?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  enabledPlatformCodes?: string[];

  /** null means never auto-resume after a human takes over. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  resumeAfterMinutes?: number | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  fallbackMessage?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  handoffMessage?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  knowledgeBaseIds?: string[];
}

export class AiAgentResponseDto {
  id!: string;
  organizationId!: string;
  name!: string;
  enabled!: boolean;
  systemInstructions!: string;
  tone!: string;
  responseLanguage!: string;
  maxResponseChars!: number;
  enabledPlatformCodes!: string[];
  resumeAfterMinutes!: number | null;
  fallbackMessage!: string;
  handoffMessage!: string;
  knowledgeBaseIds!: string[];
  version!: number;
  updatedAt!: string;
}
