import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export const DOCUMENT_POLICY_MODULES = ['admissions', 'students'] as const;
export type DocumentPolicyModuleValue =
  (typeof DOCUMENT_POLICY_MODULES)[number];

export const REQUIRED_AT_STAGES = ['submission', 'approval'] as const;

/** 20 MB — comfortably above every published limit, below anything abusive. */
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export class DocumentRequirementQueryDto {
  @ApiProperty({ enum: DOCUMENT_POLICY_MODULES })
  @IsIn(DOCUMENT_POLICY_MODULES)
  module!: DocumentPolicyModuleValue;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Read the override for one offering. Omitted, the organization-wide default is returned.',
  })
  @IsOptional()
  @IsUUID()
  offeringId?: string;
}

export class DocumentRequirementInputDto {
  @ApiProperty({ example: 'national-id' })
  @IsString()
  @Matches(/^[a-z0-9-]{2,60}$/, { message: 'مفتاح المستند غير صالح' })
  stableKey!: string;

  @ApiProperty({ example: 'بطاقة الرقم القومي' })
  @IsString()
  @Length(2, 120)
  label!: string;

  @ApiProperty({ description: 'Whether the document is asked for at all.' })
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ description: 'Whether it must be present, not merely offered.' })
  @IsBoolean()
  required!: boolean;

  @ApiPropertyOptional({ enum: REQUIRED_AT_STAGES })
  @IsOptional()
  @IsIn(REQUIRED_AT_STAGES)
  requiredAt?: (typeof REQUIRED_AT_STAGES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  multiple?: boolean;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: 'يجب تحديد نوع ملف واحد على الأقل' })
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsString({ each: true })
  allowedMimeTypes!: string[];

  @ApiProperty({ minimum: 1, maximum: MAX_DOCUMENT_BYTES })
  @IsInt()
  @Min(1)
  @Max(MAX_DOCUMENT_BYTES)
  maximumBytes!: number;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  displayOrder!: number;
}

export class UpdateDocumentRequirementsDto {
  @ApiProperty({ enum: DOCUMENT_POLICY_MODULES })
  @IsIn(DOCUMENT_POLICY_MODULES)
  module!: DocumentPolicyModuleValue;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Write the override for one offering. Omitted, the organization-wide default is written.',
  })
  @IsOptional()
  @IsUUID()
  offeringId?: string;

  @ApiProperty({
    minimum: 1,
    description:
      'The version the editor read. A mismatch refuses rather than overwriting a concurrent edit.',
  })
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @ApiProperty({ type: [DocumentRequirementInputDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'يجب إبقاء مستند واحد على الأقل' })
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => DocumentRequirementInputDto)
  requirements!: DocumentRequirementInputDto[];
}
