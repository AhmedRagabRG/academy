import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BatchFinancialProfileDto } from './batch-financial.dto';

const optionalDate = ({ value }: { value: unknown }): unknown =>
  value === '' || value === null ? undefined : value;

export class BatchNameDto {
  @IsString() @MinLength(2) @MaxLength(200) ar!: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) en?: string;
}

export class BatchScheduleDto {
  @ApiPropertyOptional({ format: 'date' })
  @Transform(optionalDate)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  registrationStartDate?: string;
  @Transform(optionalDate)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  registrationEndDate?: string;
  @Transform(optionalDate)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  studyStartDate?: string;
  @Transform(optionalDate)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  studyEndDate?: string;
  @Transform(optionalDate)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  graduationDate?: string;
}

export class BatchBranchAssignmentDto {
  @IsUUID() branchId!: string;
  @IsIn(['registration', 'study']) role!: 'registration' | 'study';
}

export class ProgramIdDto {
  @IsUUID() programId!: string;
}

export class ProgramBatchIdDto extends ProgramIdDto {
  @IsUUID() batchId!: string;
}

export class BatchIdDto {
  @IsUUID() batchId!: string;
}

export class CreateProgramBatchDto {
  @ApiProperty({ type: BatchNameDto })
  @ValidateNested()
  @Type(() => BatchNameDto)
  name!: BatchNameDto;

  @IsString() @Matches(/^[A-Za-z0-9][A-Za-z0-9 _-]*$/) code!: string;
  @IsUUID() academicYearId!: string;
  @IsUUID() intakeId!: string;
  @IsString() @MaxLength(4000) description!: string;
  @IsInt() @Min(1) maximumStudents!: number;

  @ValidateNested()
  @Type(() => BatchScheduleDto)
  schedule!: BatchScheduleDto;

  @ValidateNested()
  @Type(() => BatchFinancialProfileDto)
  financialProfile!: BatchFinancialProfileDto;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BatchBranchAssignmentDto)
  branchAssignments!: BatchBranchAssignmentDto[];
}

export class UpdateProgramBatchDto extends CreateProgramBatchDto {
  @IsInt() @Min(1) expectedVersion!: number;
}
