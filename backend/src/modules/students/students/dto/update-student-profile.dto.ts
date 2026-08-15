import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Note on the label fields below: the client's form schema marks them required,
 * so they are accepted here — but the service ignores every submitted value and
 * re-resolves labels from their identifiers (FR-016). Trusting them would let a
 * caller store a branch name that contradicts the branch id.
 */
export class StudentIdentityInputDto {
  @ApiProperty()
  @IsString()
  @Length(3, 120)
  fullName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  primaryPhone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 120)
  guardianName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 250)
  alternativeIdentityReason?: string;

  @ApiProperty()
  @IsString()
  @Length(3, 250)
  address!: string;

  @ApiProperty({ example: '1998-01-01' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  qualificationId!: string;

  @ApiPropertyOptional({ description: 'Ignored — resolved from the id.' })
  @IsOptional()
  @IsString()
  qualificationLabel?: string;

  @ApiProperty({ example: 2020 })
  @IsInt()
  @Min(1900)
  graduationYear!: number;

  @ApiPropertyOptional({
    description: 'Reference returned by POST /files/upload.',
  })
  @IsOptional()
  @IsString()
  profileImageUrl?: string;
}

export class StudentAssignmentInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  registrationBranchId!: string;

  @ApiPropertyOptional({ description: 'Ignored — resolved from the id.' })
  @IsOptional()
  @IsString()
  registrationBranchLabel?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studyBranchId!: string;

  @ApiPropertyOptional({ description: 'Ignored — resolved from the id.' })
  @IsOptional()
  @IsString()
  studyBranchLabel?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  departmentId!: string;

  @ApiPropertyOptional({ description: 'Ignored — resolved from the id.' })
  @IsOptional()
  @IsString()
  departmentLabel?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  academicGradeId?: string;

  @ApiPropertyOptional({ description: 'Ignored — resolved from the id.' })
  @IsOptional()
  @IsString()
  academicGradeLabel?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  customerServiceEmployeeId!: string;

  @ApiPropertyOptional({ description: 'Ignored — resolved from the id.' })
  @IsOptional()
  @IsString()
  customerServiceEmployeeName?: string;
}

export class StudentProfileInputDto {
  @ApiProperty({ type: StudentIdentityInputDto })
  @IsObject()
  @ValidateNested()
  @Type(() => StudentIdentityInputDto)
  identity!: StudentIdentityInputDto;

  @ApiProperty({ type: StudentAssignmentInputDto })
  @IsObject()
  @ValidateNested()
  @Type(() => StudentAssignmentInputDto)
  assignment!: StudentAssignmentInputDto;
}

export class UpdateStudentProfileDto {
  @ApiProperty({ type: StudentProfileInputDto })
  @IsObject()
  @ValidateNested()
  @Type(() => StudentProfileInputDto)
  input!: StudentProfileInputDto;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class StudentRouteDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;
}
