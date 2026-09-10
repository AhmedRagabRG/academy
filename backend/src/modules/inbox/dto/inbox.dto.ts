import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const array = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : typeof value === 'string' && value.length
      ? value.split(',')
      : [];
const bool = ({ value }: { value: unknown }) =>
  value === true || value === 'true';

export const INBOX_STATUSES = [
  'open',
  'pending',
  'snoozed',
  'closed',
  'archived',
] as const;

export class InboxListDto {
  @IsOptional() @IsString() @MaxLength(120) search = '';
  @IsOptional()
  @IsIn(['all', 'assigned', 'team', 'unassigned', 'closed', 'archived'])
  view = 'all';
  @IsOptional()
  @Transform(array)
  @IsArray()
  @IsUUID('4', { each: true })
  platforms: string[] = [];
  @IsOptional()
  @Transform(array)
  @IsArray()
  @IsIn(INBOX_STATUSES, { each: true })
  statuses: string[] = [];
  @IsOptional()
  @Transform(array)
  @IsArray()
  @IsUUID('4', { each: true })
  employeeIds: string[] = [];
  @IsOptional()
  @Transform(array)
  @IsArray()
  @IsUUID('4', { each: true })
  teamIds: string[] = [];
  @IsOptional()
  @Transform(array)
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds: string[] = [];
  @IsOptional() @Transform(bool) @IsBoolean() unreadOnly = false;
  @IsOptional() @IsIn(['latest', 'oldest', 'unread']) sort = 'latest';
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

export class ReplyAttachmentDto {
  @IsUUID() id!: string;
  @IsIn(['image', 'pdf', 'document', 'voice', 'video']) kind!: string;
  @IsString() @MaxLength(255) fileName!: string;
  @IsInt() @Min(1) @Max(25_000_000) sizeBytes!: number;
  @IsOptional() @IsInt() @Min(1) @Max(86400) durationSeconds?: number;
}

export class ReplyDto {
  @IsString() @MaxLength(4000) body = '';
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => ReplyAttachmentDto)
  attachments: ReplyAttachmentDto[] = [];
  @IsString() @MaxLength(200) retryToken!: string;
}

export class AssignmentDto {
  @IsOptional() @IsUUID() employeeId: string | null = null;
  @IsOptional() @IsUUID() teamId: string | null = null;
}

export class AiControlDto {
  @IsIn(['pause', 'resume']) action!: 'pause' | 'resume';
  @IsInt() @Min(1) expectedVersion!: number;
}

export class StatusDto {
  @IsIn(INBOX_STATUSES) status!: string;
}

export class NoteDto {
  @IsString() @MaxLength(4000) content!: string;
}
