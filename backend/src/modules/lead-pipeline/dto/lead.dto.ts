import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const LEAD_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type LeadPriorityCode = (typeof LEAD_PRIORITIES)[number];
export const LEAD_OUTCOMES = ['open', 'won', 'lost'] as const;
export type LeadOutcomeCode = (typeof LEAD_OUTCOMES)[number];

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const list = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : typeof value === 'string' && value.length
      ? value.split(',')
      : [];

export class LeadListDto {
  @IsOptional() @IsUUID() pipelineId?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) search = '';
  @IsOptional() @IsUUID() agentId?: string;
  @IsOptional() @IsIn(LEAD_PRIORITIES) priority?: LeadPriorityCode;
  @IsOptional() @IsIn(LEAD_OUTCOMES) outcome?: LeadOutcomeCode;
  @IsOptional()
  @Transform(list)
  @IsArray()
  @IsString({ each: true })
  sources: string[] = [];
  @IsOptional()
  @Transform(list)
  @IsArray()
  @IsUUID('4', { each: true })
  stageIds: string[] = [];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit = 200;
}

export class LeadDraftDto {
  @IsUUID() contactId!: string;
  @IsOptional() @IsUUID() pipelineId?: string;
  @IsOptional() @IsUUID() stageId?: string;
  @IsOptional() @IsUUID() assignedAgentId?: string;
  @IsOptional() @IsIn(LEAD_PRIORITIES) priority: LeadPriorityCode = 'medium';
  @IsOptional() @Transform(trim) @IsString() @MaxLength(20) value = '0';
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200) program = '';
  @IsOptional() @IsISO8601() nextActionAt?: string;
}

export class UpdateLeadDto {
  @IsOptional() @IsUUID() assignedAgentId?: string | null;
  @IsOptional() @IsIn(LEAD_PRIORITIES) priority?: LeadPriorityCode;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(20) value?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200) program?: string;
  @IsOptional() @IsISO8601() nextActionAt?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) expectedVersion?: number;
}

export class MoveLeadDto {
  @IsUUID() stageId!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(400) reason = '';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) expectedVersion?: number;
}

export class AssignLeadDto {
  @IsOptional() @IsUUID() assignedAgentId: string | null = null;
}

export class LeadNoteDto {
  @Transform(trim) @IsString() @MaxLength(4000) content!: string;
}
