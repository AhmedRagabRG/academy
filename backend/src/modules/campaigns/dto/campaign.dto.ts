import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ContactDraftDto } from '../../contacts/dto/contact.dto';

export const CAMPAIGN_STATUSES = [
  'draft',
  'scheduled',
  'running',
  'paused',
  'completed',
  'cancelled',
] as const;
export type CampaignStatusCode = (typeof CAMPAIGN_STATUSES)[number];

export const RECIPIENT_STATUSES = [
  'pending',
  'sending',
  'sent',
  'delivered',
  'read',
  'failed',
  'skipped',
] as const;
export type RecipientStatusCode = (typeof RECIPIENT_STATUSES)[number];

export const TEMPLATE_STATUSES = [
  'approved',
  'pending',
  'rejected',
  'paused',
  'disabled',
] as const;

/** Where a template placeholder takes its per-recipient value from. */
export const VARIABLE_SOURCES = ['contact', 'field', 'literal'] as const;
export type VariableSourceCode = (typeof VARIABLE_SOURCES)[number];

/** Built-in contact columns a placeholder may be bound to. */
export const CONTACT_TOKENS = [
  'name',
  'phone',
  'email',
  'company',
  'role',
  'ownerName',
] as const;
export type ContactTokenCode = (typeof CONTACT_TOKENS)[number];

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const list = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : typeof value === 'string' && value.length
      ? value.split(',')
      : [];
const bool = ({ value }: { value: unknown }) =>
  value === true || value === 'true';

export class VariableBindingDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(30) position!: number;
  @IsIn(VARIABLE_SOURCES) source!: VariableSourceCode;
  /** A contact token, a custom field id, or the literal text itself. */
  @Transform(trim) @IsString() @MaxLength(400) value!: string;
  /** Used when the bound value is empty — WhatsApp rejects blank parameters. */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(400) fallback = '';
}

export class CampaignDraftDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) description = '';
  @IsUUID() templateId!: string;
  @IsOptional()
  @Transform(list)
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  groupIds: string[] = [];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => VariableBindingDto)
  variables: VariableBindingDto[] = [];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => VariableBindingDto)
  headerVariables: VariableBindingDto[] = [];
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(6)
  @Max(3000)
  throttlePerMinute = 120;
  @IsOptional() @IsISO8601() scheduledAt?: string;
}

export class UpdateCampaignDto extends CampaignDraftDto {
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
}

export class CampaignListDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) search = '';
  @IsOptional() @IsIn(CAMPAIGN_STATUSES) status?: CampaignStatusCode;
  @IsOptional() @IsUUID() templateId?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
}

export class RecipientListDto {
  @IsOptional() @IsIn(RECIPIENT_STATUSES) status?: RecipientStatusCode;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) search = '';
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit = 50;
}

export class LaunchCampaignDto {
  /** Absent launches now; a future instant schedules the campaign instead. */
  @IsOptional() @IsISO8601() scheduledAt?: string;
}

export class AudiencePreviewDto {
  @IsOptional()
  @Transform(list)
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  groupIds: string[] = [];
  @IsOptional()
  @Transform(list)
  @IsArray()
  @ArrayMaxSize(5000)
  @IsUUID('4', { each: true })
  contactIds: string[] = [];
}

export class TestSendDto {
  @Transform(trim) @IsString() @MinLength(6) @MaxLength(40) phone!: string;
}

export class ImportAudienceDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) groupName!: string;
  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => ContactDraftDto)
  rows: ContactDraftDto[] = [];
}

export class TemplateListDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) search = '';
  @IsOptional() @Transform(bool) @IsBoolean() approvedOnly = false;
}
