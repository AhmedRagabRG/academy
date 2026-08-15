import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * The wire spellings from the contract. They are TitleCase on the wire and
 * SCREAMING_SNAKE in the database, so the conversion lives in one place
 * instead of being re-derived by each caller.
 */
export const EXPENSE_STATUS_WIRE = [
  'Draft',
  'Submitted',
  'UnderReview',
  'Approved',
  'Rejected',
  'Returned',
  'Paid',
  'Archived',
] as const;

export type ExpenseStatusWire = (typeof EXPENSE_STATUS_WIRE)[number];

export const EXPENSE_SORT_FIELDS = [
  'createdAt',
  'expenseDate',
  'amount',
  'status',
] as const;

const WIRE_TO_STORED: Record<ExpenseStatusWire, string> = {
  Draft: 'DRAFT',
  Submitted: 'SUBMITTED',
  UnderReview: 'UNDER_REVIEW',
  Approved: 'APPROVED',
  Rejected: 'REJECTED',
  Returned: 'RETURNED',
  Paid: 'PAID',
  Archived: 'ARCHIVED',
};

export const toStoredStatus = (wire: ExpenseStatusWire): string =>
  WIRE_TO_STORED[wire];

export const toWireStatus = (stored: string): ExpenseStatusWire =>
  (Object.keys(WIRE_TO_STORED) as ExpenseStatusWire[]).find(
    (key) => WIRE_TO_STORED[key] === stored,
  ) ?? 'Draft';

const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === true || value === 'true' || value === '1';

export class ExpenseQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ enum: EXPENSE_STATUS_WIRE })
  @IsOptional()
  @IsIn(EXPENSE_STATUS_WIRE)
  status?: ExpenseStatusWire;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  subcategoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  requestedBy?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  approvedBy?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString({ strict: true })
  dateTo?: string;

  @ApiPropertyOptional({ enum: EXPENSE_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(EXPENSE_SORT_FIELDS)
  sortBy?: (typeof EXPENSE_SORT_FIELDS)[number];

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Matches expenseNumber and description' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeArchived?: boolean;
}

export class ExpenseActionDto {
  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

/**
 * A comment carries no `expectedVersion`: it is conversation rather than a
 * workflow step, so it neither moves the request nor may lose a race with one.
 */
export class CreateExpenseCommentDto {
  @ApiProperty({ minLength: 1, maxLength: 1000 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body!: string;
}
