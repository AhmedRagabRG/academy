import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { STUDENT_REASON_MAX_LENGTH } from '../student-lifecycle.policy';
import type { StudentStatus } from '../../types/students.types';

const STATUSES: readonly StudentStatus[] = [
  'active',
  'suspended',
  'graduated',
  'withdrawn',
  'archived',
];

export class ChangeStudentStatusDto {
  @ApiProperty({ enum: STATUSES })
  @IsIn(STATUSES)
  toStatus!: StudentStatus;

  @ApiPropertyOptional({ maxLength: STUDENT_REASON_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @Length(1, STUDENT_REASON_MAX_LENGTH)
  reason?: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class BulkStatusItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ enum: STATUSES })
  @IsIn(STATUSES)
  toStatus!: StudentStatus;

  @ApiPropertyOptional({ maxLength: STUDENT_REASON_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @Length(1, STUDENT_REASON_MAX_LENGTH)
  reason?: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class BulkStudentStatusDto {
  @ApiProperty({ type: [BulkStatusItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BulkStatusItemDto)
  items!: BulkStatusItemDto[];
}

export class StudentStatusRouteDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;
}
