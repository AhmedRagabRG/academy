import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PageQueryDto } from '../../../../shared/pagination/page-query.dto';
import type { StudentStatus } from '../../types/students.types';

export const STUDENT_SORT_FIELDS = [
  'fullName',
  'studentCode',
  'enrollmentDate',
  'updatedAt',
  'status',
] as const;

export const STUDENT_STATUSES: readonly StudentStatus[] = [
  'active',
  'suspended',
  'graduated',
  'withdrawn',
  'archived',
];

/** Accepts both `?ids=a&ids=b` and `?ids=a,b`. */
const toArray = ({ value }: { value: unknown }): unknown => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string')
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  return value;
};

export class ListStudentsDto extends PageQueryDto {
  @ApiPropertyOptional({ description: 'Arabic- and digit-folded free text' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsUUID('4', { each: true })
  branchIds?: string[];

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsUUID('4', { each: true })
  departmentIds?: string[];

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsUUID('4', { each: true })
  offeringIds?: string[];

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsUUID('4', { each: true })
  batchIds?: string[];

  @ApiPropertyOptional({ enum: STUDENT_STATUSES, isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsIn(STUDENT_STATUSES, { each: true })
  statuses?: StudentStatus[];

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsUUID('4', { each: true })
  customerServiceEmployeeIds?: string[];

  @ApiPropertyOptional({ enum: STUDENT_SORT_FIELDS, default: 'updatedAt' })
  @IsOptional()
  @IsIn(STUDENT_SORT_FIELDS)
  sortBy?: (typeof STUDENT_SORT_FIELDS)[number];

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
