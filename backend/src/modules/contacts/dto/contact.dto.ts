import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const CONTACT_SOURCES = [
  'whatsapp',
  'instagram',
  'facebook',
  'website',
  'phone',
  'manual',
  'import',
] as const;
export type ContactSourceCode = (typeof CONTACT_SOURCES)[number];

export const CONTACT_FIELD_KINDS = ['text', 'number', 'date'] as const;

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

export class ContactListDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) search = '';
  @IsOptional() @IsIn(CONTACT_SOURCES) source?: ContactSourceCode;
  @IsOptional()
  @Transform(list)
  @IsArray()
  @IsUUID('4', { each: true })
  groupIds: string[] = [];
  @IsOptional() @IsUUID() ownerId?: string;
  @IsOptional() @Transform(bool) @IsBoolean() withoutOwner = false;
  @IsOptional() @IsIn(['recent', 'name', 'created']) sort = 'recent';
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit = 25;
}

export class ContactDraftDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @Transform(trim) @IsString() @MinLength(4) @MaxLength(40) phone!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) secondaryPhone = '';
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) email = '';
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) company = '';
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) role = '';
  @IsOptional() @IsUUID() ownerAccountId?: string;
  @IsOptional() @IsIn(CONTACT_SOURCES) source?: ContactSourceCode;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) channelHandle = '';
}

export class UpdateContactDto extends ContactDraftDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) expectedVersion?: number;
}

export class ImportContactsDto {
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => ContactDraftDto)
  rows: ContactDraftDto[] = [];
  /**
   * Adds every imported row to this group — including rows that already exist,
   * which are reported as `linked` rather than skipped. A campaign audience
   * built from a file needs the whole file in the group, not just its new
   * numbers.
   */
  @IsOptional() @IsUUID() groupId?: string;
}

export class ContactNoteDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(4000) content!: string;
}

export class ContactFieldValueDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) value = '';
}

export class ContactGroupDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(400) description = '';
}

export class ContactCustomFieldDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) label!: string;
  @IsIn(CONTACT_FIELD_KINDS) type!: (typeof CONTACT_FIELD_KINDS)[number];
}

export class ContactExportDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) search = '';
  @IsOptional() @IsIn(CONTACT_SOURCES) source?: ContactSourceCode;
  @IsOptional()
  @Transform(list)
  @IsArray()
  @IsUUID('4', { each: true })
  groupIds: string[] = [];
}
