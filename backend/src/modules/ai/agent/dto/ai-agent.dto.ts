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
  ValidateBy,
  ValidateIf,
} from 'class-validator';
import type { ValidationArguments } from 'class-validator';
import {
  AGENT_TOOL_NAMES,
  WRITABLE_CONTACT_FIELDS,
} from '../../tools/tool.contract';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const DAY_CODES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const RANGE = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;

const isWorkingHours = (value: unknown): boolean => {
  if (value === null) return true;
  if (typeof value !== 'object' || Array.isArray(value)) return false;
  const days = value as Record<string, unknown>;
  return Object.entries(days).every(
    ([day, hours]) =>
      DAY_CODES.includes(day) &&
      typeof hours === 'string' &&
      RANGE.test(hours.trim()),
  );
};

const isCollectionFields = (value: unknown): boolean => {
  if (!Array.isArray(value)) return false;
  return value.every(
    (field) =>
      typeof field === 'object' &&
      field !== null &&
      typeof (field as Record<string, unknown>).key === 'string' &&
      String((field as Record<string, unknown>).key).length > 0 &&
      String((field as Record<string, unknown>).key).length <= 40 &&
      typeof (field as Record<string, unknown>).label === 'string' &&
      String((field as Record<string, unknown>).label).length <= 80,
  );
};

/**
 * Admin-facing settings only. Model, temperature, retrieval thresholds and
 * the service account are deliberately absent: they are engineering
 * configuration, and a retrieval threshold edited from a settings form is a
 * silent way to stop the agent answering. The global ValidationPipe runs
 * with forbidNonWhitelisted, so sending one of them is rejected outright.
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

  /** null means 24/7. Days absent from the object are closed days. */
  @IsOptional()
  @ValidateBy(
    {
      name: 'isWorkingHours',
      validator: (value: unknown) => isWorkingHours(value),
    },
    {
      message:
        'workingHours must map sun..sat to HH:MM-HH:MM ranges, or be null',
    },
  )
  workingHours?: Record<string, string> | null;

  @IsOptional()
  @IsIn(['silent', 'fallback_message'])
  outsideHoursBehaviour?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn([...AGENT_TOOL_NAMES], {
    each: true,
    message: (args: ValidationArguments) =>
      `unknown tool: ${String(args.value)}`,
  })
  allowedTools?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn([...WRITABLE_CONTACT_FIELDS], {
    each: true,
    message: 'unknown CRM field — phone is never writable',
  })
  allowedCrmFields?: string[];

  @IsOptional()
  @ValidateBy(
    {
      name: 'isCollectionFields',
      validator: (value: unknown) => isCollectionFields(value),
    },
    { message: 'dataCollectionFields must be [{key, label, ...}] entries' },
  )
  dataCollectionFields?: unknown;
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
  workingHours!: Record<string, string> | null;
  outsideHoursBehaviour!: string;
  allowedTools!: string[];
  allowedCrmFields!: string[];
  dataCollectionFields!: unknown;
  version!: number;
  updatedAt!: string;
}
