import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApplicantInputDto } from './applicant-input.dto';
import { DuplicateResolutionDto } from './duplicate-resolution.dto';

export class AdmissionAssignmentInputDto {
  @IsUUID() registrationBranchId!: string;
  @IsUUID() studyBranchId!: string;
  @IsUUID() admissionsEmployeeId!: string;
  @IsUUID() customerServiceEmployeeId!: string;
  @IsUUID() customerServiceManagerId!: string;
  @IsUUID() departmentId!: string;
  @IsUUID() leadSourceId!: string;
  @IsOptional() @IsUUID() academicGradeId?: string;
}

export class AdmissionSelectionInputDto {
  @ApiProperty({
    enum: ['professional-program', 'professional-diploma', 'training-course'],
  })
  @IsIn(['professional-program', 'professional-diploma', 'training-course'])
  offeringKind!:
    'professional-program' | 'professional-diploma' | 'training-course';
  @IsUUID() offeringId!: string;
  @IsOptional() @IsUUID() batchId?: string;
}

export class AdmissionFinancialInputDto {
  @IsIn(['none', 'percentage', 'amount'])
  discountMode!: 'none' | 'percentage' | 'amount';
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' || typeof value === 'number'
      ? String(value).trim()
      : '',
  )
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  discountValue!: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class AdmissionInputDto {
  @ValidateNested()
  @Type(() => ApplicantInputDto)
  applicant!: ApplicantInputDto;
  @ValidateNested()
  @Type(() => AdmissionAssignmentInputDto)
  assignment!: AdmissionAssignmentInputDto;
  @ValidateNested()
  @Type(() => AdmissionSelectionInputDto)
  selection!: AdmissionSelectionInputDto;
  @ValidateNested()
  @Type(() => AdmissionFinancialInputDto)
  financial!: AdmissionFinancialInputDto;
  @IsOptional() @IsString() @MaxLength(4000) notes?: string;
}

export class CreateAdmissionDto {
  @ApiProperty({ type: AdmissionInputDto })
  @ValidateNested()
  @Type(() => AdmissionInputDto)
  input!: AdmissionInputDto;

  @ApiPropertyOptional({ type: DuplicateResolutionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DuplicateResolutionDto)
  duplicateResolution?: DuplicateResolutionDto;

  @ApiPropertyOptional({ description: 'Durable retry key' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  idempotencyKey?: string;
}

export class FindAdmissionDuplicatesDto extends ApplicantInputDto {}

export class ConsequenceConfirmationDto {
  @IsArray()
  @IsIn(['financial-recalculated', 'documents-repolicied'], { each: true })
  values!: ('financial-recalculated' | 'documents-repolicied')[];
}
